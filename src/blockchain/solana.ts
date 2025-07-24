// Solana wallet integration for DreamMint
import { 
  Connection, 
  PublicKey, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { solanaConfig, SOLANA_PRICING } from '../config/solana';

export interface SolanaWallet {
  publicKey: PublicKey | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export interface DreamMintResult {
  signature: string;
  mintAddress: string;
  tokenAccount: string;
  metadataUri: string;
}

export interface SolanaWalletContextType {
  wallet: SolanaWallet | null;
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  balance: number;
  network: string;
}

class SolanaDreamMint {
  private connection: Connection;
  constructor() {
    this.connection = solanaConfig.connection;
  }

  /**
   * Connect to a Solana wallet (Phantom, Solflare, etc.)
   */
  async connectWallet(): Promise<SolanaWallet | null> {
    try {
      // Check if Phantom wallet is available
      if (!(window as any).solana || !(window as any).solana.isPhantom) {
        throw new Error('Phantom wallet not found! Please install Phantom wallet.');
      }

      const wallet = (window as any).solana;
      await wallet.connect();
      
      return {
        publicKey: new PublicKey(wallet.publicKey.toString()),
        connected: wallet.isConnected,
        connect: wallet.connect.bind(wallet),
        disconnect: wallet.disconnect.bind(wallet),
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  /**
   * Get SOL balance for a wallet
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Check if wallet has sufficient SOL for minting
   */
  async checkBalance(publicKey: PublicKey): Promise<{ sufficient: boolean; balance: number; required: number }> {
    const balance = await this.getBalance(publicKey);
    const required = SOLANA_PRICING.TOTAL_SOL + SOLANA_PRICING.MINT_TRANSACTION_RENT;
    
    return {
      sufficient: balance >= required,
      balance,
      required
    };
  }

  /**
   * Mint a dream NFT on Solana
   */
  async mintDreamNFT({
    wallet,
    metadataUri,
    name = 'DreamMint NFT',
    symbol = 'DREAM'
  }: {
    wallet: SolanaWallet;
    metadataUri: string;
    name?: string;
    symbol?: string;
  }): Promise<DreamMintResult> {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Check balance first
      const balanceCheck = await this.checkBalance(wallet.publicKey);
      if (!balanceCheck.sufficient) {
        throw new Error(`Insufficient SOL balance. Required: ${balanceCheck.required} SOL, Available: ${balanceCheck.balance} SOL`);
      }

      // Initialize Metaplex
      const metaplex = Metaplex.make(this.connection)
        .use(walletAdapterIdentity(wallet));

      // Create NFT using Metaplex (simpler than raw Anchor calls)
      const { nft } = await metaplex.nfts().create({
        uri: metadataUri,
        name: name,
        symbol: symbol,
        sellerFeeBasisPoints: 500, // 5% royalty
        creators: [
          {
            address: wallet.publicKey,
            share: 100,
          },
        ],
      });

      console.log('🎉 Dream NFT minted successfully!');
      console.log('📄 Mint Address:', nft.address.toString());
      console.log('🔗 Metadata URI:', metadataUri);

      return {
        signature: nft.address.toString(), // Using mint address as signature for now
        mintAddress: nft.address.toString(),
        tokenAccount: nft.address.toString(), // Simplified for now
        metadataUri: metadataUri
      };

    } catch (error) {
      console.error('Minting failed:', error);
      throw new Error(`Failed to mint NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch user's dream NFTs
   */
  async fetchUserNFTs(publicKey: PublicKey): Promise<any[]> {
    try {
      const metaplex = Metaplex.make(this.connection);
      
      // Get all NFTs owned by the user
      const nfts = await metaplex.nfts().findAllByOwner({
        owner: publicKey,
      });

      // Filter for DreamMint NFTs (you might want to add a collection identifier)
      const dreamNFTs = nfts.filter(nft => 
        nft.symbol === 'DREAM' || nft.name.includes('DreamMint')
      );

      // Fetch metadata for each NFT
      const nftsWithMetadata = await Promise.all(
        dreamNFTs.map(async (nft) => {
          try {
            return {
              mint: nft.address.toString(),
              name: nft.name,
              symbol: nft.symbol || 'DREAM',
              uri: nft.uri,
              image: null, // Will be fetched separately if needed
              description: null,
              attributes: [],
            };
          } catch (error) {
            console.warn('Failed to load NFT metadata:', error);
            return null;
          }
        })
      );

      return nftsWithMetadata.filter(nft => nft !== null);
    } catch (error) {
      console.error('Failed to fetch user NFTs:', error);
      return [];
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<'confirmed' | 'pending' | 'failed'> {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      
      if (status?.value?.confirmationStatus === 'confirmed' || 
          status?.value?.confirmationStatus === 'finalized') {
        return 'confirmed';
      }
      
      if (status?.value?.err) {
        return 'failed';
      }
      
      return 'pending';
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return 'failed';
    }
  }

  /**
   * Request SOL airdrop (devnet only)
   */
  async requestAirdrop(publicKey: PublicKey, amount: number = 1): Promise<string> {
    if (solanaConfig.network === 'mainnet-beta') {
      throw new Error('Airdrop not available on mainnet');
    }

    try {
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );
      
      await this.connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error('Airdrop failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const solanaDreamMint = new SolanaDreamMint();

// Helper functions
export const formatSOL = (lamports: number): string => {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
};

export const formatPublicKey = (publicKey: PublicKey | string, length: number = 8): string => {
  const key = publicKey.toString();
  return `${key.slice(0, length)}...${key.slice(-length)}`;
};

// Wallet connection utilities
export const isPhantomInstalled = (): boolean => {
  return !!(window as any).solana && !!(window as any).solana.isPhantom;
};

export const isSolflareInstalled = (): boolean => {
  return !!(window as any).solflare && !!(window as any).solflare.isSolflare;
};

export const getRecommendedWallet = (): string => {
  if (isPhantomInstalled()) return 'Phantom';
  if (isSolflareInstalled()) return 'Solflare';
  return 'None';
};
