// Solana configuration for DreamMint DApp

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

export interface SolanaConfig {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl: string;
  programId: string;
  metaplexProgramId: string;
  connection: Connection;
}

// Program IDs
const DREAM_MINT_PROGRAM_ID = process.env.VITE_SOLANA_PROGRAM_ID || 'DreamMintMainnetProgramIdHere'; // Replace with actual deployed program ID

// Network configurations
const networkConfigs = {
  'mainnet-beta': {
    network: 'mainnet-beta' as const,
    rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'),
    programId: DREAM_MINT_PROGRAM_ID,
    metaplexProgramId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', // Metaplex Token Metadata Program
  },
  devnet: {
    network: 'devnet' as const,
    rpcUrl: import.meta.env.VITE_SOLANA_DEVNET_RPC_URL || clusterApiUrl('devnet'),
    programId: 'DreamMintDevnetProgramIdHere', // Replace with devnet program ID
    metaplexProgramId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  },
  testnet: {
    network: 'testnet' as const,
    rpcUrl: import.meta.env.VITE_SOLANA_TESTNET_RPC_URL || clusterApiUrl('testnet'),
    programId: 'DreamMintTestnetProgramIdHere', // Replace with testnet program ID
    metaplexProgramId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  },
};

// Auto-detect environment
const getSolanaNetwork = (): 'mainnet-beta' | 'devnet' | 'testnet' => {
  const isProduction = process.env.NODE_ENV === 'production' || 
                      window.location.hostname !== 'localhost';
  
  if (isProduction) {
    return 'mainnet-beta';
  }
  
  // Use devnet for development
  return 'devnet';
};

// Current configuration
const currentNetwork = getSolanaNetwork();
const baseConfig = networkConfigs[currentNetwork];

export const solanaConfig: SolanaConfig = {
  ...baseConfig,
  connection: new Connection(baseConfig.rpcUrl, 'confirmed'),
};

// Helper functions
export const getProgramId = () => new PublicKey(solanaConfig.programId);
export const getMetaplexProgramId = () => new PublicKey(solanaConfig.metaplexProgramId);

// Pricing in SOL (optimized for profitability)
export const SOLANA_PRICING = {
  AI_IMAGE_GENERATION_SOL: 0.0065, // ~$0.99 when SOL = $152
  NFT_MINTING_SOL: 0.0197, // ~$2.99 when SOL = $152
  TOTAL_SOL: 0.0262, // ~$3.98 total
  
  // Gas/rent costs (extremely low on Solana)
  MINT_TRANSACTION_RENT: 0.001, // ~$0.15 for account creation + transaction
};

// Explorer URLs
export const getExplorerUrl = (signature: string, network: string = currentNetwork): string => {
  const baseUrl = network === 'mainnet-beta' 
    ? 'https://explorer.solana.com' 
    : `https://explorer.solana.com?cluster=${network}`;
  return `${baseUrl}/tx/${signature}`;
};

export const getAccountExplorerUrl = (address: string, network: string = currentNetwork): string => {
  const baseUrl = network === 'mainnet-beta' 
    ? 'https://explorer.solana.com' 
    : `https://explorer.solana.com?cluster=${network}`;
  return `${baseUrl}/address/${address}`;
};

console.log(`🔗 Solana Network: ${currentNetwork}`);
console.log(`📡 RPC URL: ${solanaConfig.rpcUrl}`);
console.log(`🎯 Program ID: ${solanaConfig.programId}`);
