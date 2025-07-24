// Environment configuration for DreamMint DApp - Solana Edition

export interface EnvironmentConfig {
  apiUrl: string;
  isProduction: boolean;
  stripe: {
    publishableKey: string;
    isLiveMode: boolean;
  };
  solana: {
    network: 'mainnet-beta' | 'devnet' | 'testnet';
    rpcUrl: string;
    programId: string;
    explorer: string;
  };
}

// Development/Test configuration (Devnet)
const developmentConfig: EnvironmentConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  isProduction: false,
  stripe: {
    publishableKey: '', // Will be fetched from backend
    isLiveMode: false
  },
  solana: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    programId: 'DreamMintDevnetProgramIdHere', // Replace with devnet program ID
    explorer: 'https://explorer.solana.com?cluster=devnet'
  }
};

// Production configuration (Mainnet)
const productionConfig: EnvironmentConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://api.yourdomain.com', // Your production API URL
  isProduction: true,
  stripe: {
    publishableKey: '', // Will be fetched from backend
    isLiveMode: true
  },
  solana: {
    network: 'mainnet-beta',
    rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    programId: process.env.VITE_SOLANA_PROGRAM_ID || 'DreamMintMainnetProgramIdHere', // Replace with mainnet program ID
    explorer: 'https://explorer.solana.com'
  }
};

// Auto-detect environment
const isProduction = process.env.NODE_ENV === 'production' || 
                    window.location.hostname !== 'localhost';

export const environment: EnvironmentConfig = isProduction 
  ? productionConfig 
  : developmentConfig;

// Function to fetch and update config from backend
export async function fetchBackendConfig(): Promise<void> {
  try {
    const response = await fetch(`${environment.apiUrl}/api/config`);
    const config = await response.json();
    
    // Update Stripe configuration from backend
    environment.stripe.publishableKey = config.stripe.publishableKey;
    environment.stripe.isLiveMode = config.stripe.isLiveMode;
    
    console.log(`🔧 Environment: ${config.environment}`);
    console.log(`💳 Stripe mode: ${config.stripe.isLiveMode ? 'LIVE' : 'TEST'}`);
    console.log(`🔗 Solana network: ${environment.solana.network}`);
  } catch (error) {
    console.error('Failed to fetch backend config:', error);
  }
}
