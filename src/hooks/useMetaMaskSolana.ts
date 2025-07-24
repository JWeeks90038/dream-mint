// src/hooks/useMetaMaskSolana.ts
import { useEffect, useState, useCallback } from 'react';
import { PublicKey, Connection, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { MetaMaskSDK } from '@metamask/sdk';

interface MetaMaskSolanaState {
  isInstalled: boolean;
  isConnected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  address: string | null;
  balance: number | null;
  network: 'mainnet-beta' | 'devnet' | null;
}

interface MetaMaskSolanaActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (network: 'mainnet-beta' | 'devnet') => Promise<void>;
  sendTransaction: (transaction: Transaction) => Promise<string>;
  getBalance: () => Promise<number>;
  requestAirdrop?: () => Promise<void>; // For devnet only
}

export const useMetaMaskSolana = (): MetaMaskSolanaState & MetaMaskSolanaActions => {
  const [state, setState] = useState<MetaMaskSolanaState>({
    isInstalled: false,
    isConnected: false,
    connecting: false,
    publicKey: null,
    address: null,
    balance: null,
    network: null,
  });

  const [sdk] = useState(() => new MetaMaskSDK({
    dappMetadata: {
      name: "DreamMint - Dream to NFT DApp",
      url: window.location.origin,
      iconUrl: `${window.location.origin}/dream-moon.png`,
    },
    preferDesktop: true,
  }));

  // Use SDK for future MetaMask Solana integration
  console.log('MetaMask SDK initialized:', sdk ? 'Ready' : 'Not available');

  const connection = new Connection(
    state.network === 'devnet' 
      ? 'https://api.devnet.solana.com'
      : import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  );

  // Check MetaMask installation and Solana support
  useEffect(() => {
    const checkMetaMask = async () => {
      try {
        // Check if MetaMask is available
        if (typeof window !== 'undefined' && window.ethereum) {
          setState(prev => ({ ...prev, isInstalled: true }));
          
          // Check if already connected to Solana
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          if (accounts && accounts.length > 0) {
            // Try to detect if we're on Solana network
            await detectSolanaNetwork();
          }
        }
      } catch (error) {
        console.error('Error checking MetaMask:', error);
      }
    };

    checkMetaMask();
  }, []);

  const detectSolanaNetwork = async (): Promise<void> => {
    try {
      // For MetaMask with Solana, we need to check the network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      // MetaMask Solana integration might use custom chain IDs
      // This is a placeholder - actual implementation depends on MetaMask's Solana support
      if (chainId === '0x65') { // Example Solana mainnet chain ID
        setState(prev => ({ 
          ...prev, 
          network: 'mainnet-beta',
          isConnected: true 
        }));
      } else if (chainId === '0x66') { // Example Solana devnet chain ID
        setState(prev => ({ 
          ...prev, 
          network: 'devnet',
          isConnected: true 
        }));
      }
    } catch (error) {
      console.error('Error detecting Solana network:', error);
    }
  };

  const connect = useCallback(async (): Promise<void> => {
    if (!state.isInstalled) {
      // Redirect to MetaMask installation
      window.open('https://metamask.io/download/', '_blank');
      throw new Error('Please install MetaMask to continue');
    }

    setState(prev => ({ ...prev, connecting: true }));

    try {
      // Connect to MetaMask
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // For now, we'll use a workaround since MetaMask's Solana integration
      // is still developing. We'll create a mapping or use MetaMask's account
      const ethAddress = accounts[0];
      
      // Convert or map ETH address to Solana format
      // This is a placeholder - in reality, you'd need MetaMask's Solana integration
      const solanaAddress = await convertEthToSolanaAddress(ethAddress);
      
      if (solanaAddress) {
        const publicKey = new PublicKey(solanaAddress);
        const balance = await getBalance();
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          connecting: false,
          publicKey,
          address: solanaAddress,
          balance,
          network: 'mainnet-beta', // Default to mainnet
        }));
      }

    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
      setState(prev => ({ ...prev, connecting: false }));
      throw error;
    }
  }, [state.isInstalled]);

  const disconnect = useCallback(async (): Promise<void> => {
    setState({
      isInstalled: state.isInstalled,
      isConnected: false,
      connecting: false,
      publicKey: null,
      address: null,
      balance: null,
      network: null,
    });
  }, [state.isInstalled]);

  const switchNetwork = useCallback(async (network: 'mainnet-beta' | 'devnet'): Promise<void> => {
    try {
      // Switch MetaMask to Solana network
      const chainId = network === 'mainnet-beta' ? '0x65' : '0x66'; // Placeholder chain IDs
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });

      setState(prev => ({ ...prev, network }));
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }, []);

  const sendTransaction = useCallback(async (transaction: Transaction): Promise<string> => {
    if (!state.isConnected || !state.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // For MetaMask Solana integration, this would be handled differently
      // This is a placeholder implementation
      const signature = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: state.address,
          // Convert Solana transaction to MetaMask format
          data: transaction.serialize().toString('hex'),
        }],
      });

      return signature;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }, [state.isConnected, state.publicKey, state.address]);

  const getBalance = useCallback(async (): Promise<number> => {
    if (!state.publicKey) return 0;

    try {
      const lamports = await connection.getBalance(state.publicKey);
      const solBalance = lamports / LAMPORTS_PER_SOL;
      
      setState(prev => ({ ...prev, balance: solBalance }));
      return solBalance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }, [state.publicKey, connection]);

  const requestAirdrop = useCallback(async (): Promise<void> => {
    if (state.network !== 'devnet' || !state.publicKey) {
      throw new Error('Airdrop only available on devnet');
    }

    try {
      const signature = await connection.requestAirdrop(
        state.publicKey,
        LAMPORTS_PER_SOL // 1 SOL
      );
      
      await connection.confirmTransaction(signature);
      await getBalance(); // Refresh balance
    } catch (error) {
      console.error('Failed to request airdrop:', error);
      throw error;
    }
  }, [state.network, state.publicKey, connection, getBalance]);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    sendTransaction,
    getBalance,
    ...(state.network === 'devnet' && { requestAirdrop }),
  };
};

// Helper function to convert ETH address to Solana address
// This is a placeholder - actual implementation depends on MetaMask's Solana integration
const convertEthToSolanaAddress = async (ethAddress: string): Promise<string | null> => {
  try {
    // This is where MetaMask's Solana integration would provide the mapping
    // For now, we'll use a placeholder or derive from the ETH address
    
    // Option 1: Use deterministic derivation
    // Option 2: Ask user to import/create Solana wallet in MetaMask
    // Option 3: Use MetaMask's Solana account directly
    
    // Placeholder implementation - replace with actual MetaMask Solana integration
    console.log('Converting ETH address to Solana:', ethAddress);
    
    // Return a placeholder Solana address
    // In reality, this would come from MetaMask's Solana integration
    return null; // Will be replaced by actual MetaMask Solana address
  } catch (error) {
    console.error('Error converting address:', error);
    return null;
  }
};

// Extend window object for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
