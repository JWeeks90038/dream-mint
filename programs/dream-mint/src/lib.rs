use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("DreamMintMainnetProgramIdHere"); // Replace with actual program ID

#[program]
pub mod dream_mint {
    use super::*;

    /// Initialize the DreamMint program - optimized version
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.mint_authority.authority = ctx.accounts.authority.key();
        ctx.accounts.mint_authority.mint_fee_lamports = 5_000_000; // 0.005 SOL mint fee
        Ok(())
    }

    /// Mint a dream NFT - optimized for minimal instructions
    pub fn mint_dream_nft(
        ctx: Context<MintDreamNFT>,
        metadata_uri: String,
        name: String,
        symbol: String,
    ) -> Result<()> {
        // Validate inputs to prevent excessive metadata costs
        require!(name.len() <= 32, ErrorCode::NameTooLong);
        require!(symbol.len() <= 10, ErrorCode::SymbolTooLong);
        require!(metadata_uri.len() <= 200, ErrorCode::UriTooLong);

        // Transfer mint fee to authority before minting
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.mint_authority.key(),
            ctx.accounts.mint_authority.mint_fee_lamports,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.mint_authority.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Create mint account
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        mint_to(cpi_ctx, 1)?;

        // Create metadata account with minimal data
        let data_v2 = DataV2 {
            name,
            symbol,
            uri: metadata_uri,
            seller_fee_basis_points: 500, // 5% royalty
            creators: Some(vec![mpl_token_metadata::types::Creator {
                address: ctx.accounts.mint_authority.key(),
                verified: false,
                share: 100,
            }]),
            collection: None,
            uses: None,
        };

        let metadata_ctx = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                payer: ctx.accounts.user.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
                mint_authority: ctx.accounts.mint_authority.to_account_info(),
                update_authority: ctx.accounts.mint_authority.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        create_metadata_accounts_v3(metadata_ctx, data_v2, false, true, None)?;

        Ok(())
    }

    /// Update mint fee (admin only)
    pub fn update_mint_fee(ctx: Context<UpdateMintFee>, new_fee: u64) -> Result<()> {
        ctx.accounts.mint_authority.mint_fee_lamports = new_fee;
        Ok(())
    }

    /// Withdraw collected fees (admin only)
    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        let from_account = &mut ctx.accounts.mint_authority_account;
        let to_account = &mut ctx.accounts.authority_account;

        **from_account.try_borrow_mut_lamports()? -= amount;
        **to_account.try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8, // discriminator + authority + fee
        seeds = [b"mint_authority"],
        bump
    )]
    pub mint_authority: Account<'info, MintAuthority>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintDreamNFT<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = mint_authority,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"mint_authority"],
        bump,
        constraint = user.lamports() >= mint_authority.mint_fee_lamports @ ErrorCode::InsufficientFunds
    )]
    pub mint_authority: Account<'info, MintAuthority>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateMintFee<'info> {
    #[account(
        mut,
        seeds = [b"mint_authority"],
        bump,
        constraint = authority.key() == mint_authority.authority @ ErrorCode::Unauthorized
    )]
    pub mint_authority: Account<'info, MintAuthority>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(
        mut,
        seeds = [b"mint_authority"],
        bump,
        constraint = authority.key() == mint_authority.authority @ ErrorCode::Unauthorized
    )]
    pub mint_authority: Account<'info, MintAuthority>,
    
    /// CHECK: This is the mint authority PDA account
    #[account(mut)]
    pub mint_authority_account: UncheckedAccount<'info>,
    
    /// CHECK: This is the authority's account to receive funds
    #[account(mut)]
    pub authority_account: UncheckedAccount<'info>,
    
    pub authority: Signer<'info>,
}

#[account]
pub struct MintAuthority {
    pub authority: Pubkey,
    pub mint_fee_lamports: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds to mint NFT")]
    InsufficientFunds,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("NFT name too long (max 32 chars)")]
    NameTooLong,
    #[msg("NFT symbol too long (max 10 chars)")]
    SymbolTooLong,
    #[msg("Metadata URI too long (max 200 chars)")]
    UriTooLong,
}
