// Environment configuration for DreamMint DApp

export interface EnvironmentConfig {
  apiUrl: string;
  isProduction: boolean;
  stripe: {
    publishableKey: string;
    isLiveMode: boolean;
  };
  network: {
    chainId: string;
    name: string;
    rpcUrl?: string;
    blockExplorer: string;
    contractAddress: string;
  };
}

// Development/Test configuration
const developmentConfig: EnvironmentConfig = {
  apiUrl: 'http://localhost:5001',
  isProduction: false,
  stripe: {
    publishableKey: '', // Will be fetched from backend
    isLiveMode: false
  },
  network: {
    chainId: '0xaa36a7', // Sepolia testnet
    name: 'Sepolia Testnet',
    blockExplorer: 'https://sepolia.etherscan.io',
    contractAddress: '0x1b0b5e6c2787C11747dC0e90BD76028674b7209B' // Your testnet contract
  }
};

// Production configuration
const productionConfig: EnvironmentConfig = {
  apiUrl: 'https://api.yourdomain.com', // Your production API URL
  isProduction: true,
  stripe: {
    publishableKey: '', // Will be fetched from backend
    isLiveMode: true
  },
  network: {
    chainId: '0x1', // Ethereum mainnet
    name: 'Ethereum Mainnet',
    blockExplorer: 'https://etherscan.io',
    contractAddress: '0xYourProductionContractAddress' // Your mainnet contract
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
  } catch (error) {
    console.error('Failed to fetch backend config:', error);
  }
}
