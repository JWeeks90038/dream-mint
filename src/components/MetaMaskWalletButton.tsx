// src/components/MetaMaskWalletButton.tsx
import { useState, useEffect } from 'react';
import { useMetaMaskSolana } from '../hooks/useMetaMaskSolana';

interface MetaMaskWalletButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export function MetaMaskWalletButton({ onConnect, onDisconnect }: MetaMaskWalletButtonProps) {
  const {
    isInstalled,
    isConnected,
    connecting,
    address,
    balance,
    network,
    connect,
    disconnect,
    switchNetwork,
    requestAirdrop
  } = useMetaMaskSolana();

  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (isConnected && address && onConnect) {
      onConnect(address);
    } else if (!isConnected && onDisconnect) {
      onDisconnect();
    }
  }, [isConnected, address, onConnect, onDisconnect]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect MetaMask. Please ensure you have MetaMask installed and try again.');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setShowDropdown(false);
  };

  const handleSwitchNetwork = async (targetNetwork: 'mainnet-beta' | 'devnet') => {
    try {
      await switchNetwork(targetNetwork);
    } catch (error) {
      console.error('Network switch failed:', error);
      alert('Failed to switch network. Please try manually switching in MetaMask.');
    }
  };

  const handleAirdrop = async () => {
    if (network !== 'devnet') return;
    
    try {
      await requestAirdrop?.();
      alert('Airdrop successful! 1 SOL added to your devnet wallet.');
    } catch (error) {
      console.error('Airdrop failed:', error);
      alert('Airdrop failed. Please try again later.');
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: number | null) => {
    return bal !== null ? `${bal.toFixed(4)} SOL` : 'Loading...';
  };

  if (!isInstalled) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}>
        <div style={{ color: 'white', fontSize: '1rem' }}>
          🦊 MetaMask Required
        </div>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#FF6B35',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Install MetaMask
        </a>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        style={{
          background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
          color: 'white',
          border: 'none',
          padding: '1rem 2rem',
          borderRadius: '12px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: connecting ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: connecting ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
        onMouseEnter={(e) => !connecting && (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={(e) => !connecting && (e.currentTarget.style.transform = 'translateY(0)')}
      >
        <span>🦊</span>
        {connecting ? 'Connecting...' : 'Connect MetaMask'}
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
        }}
      >
        <span>🦊</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div>{address ? formatAddress(address) : 'Connected'}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
            {formatBalance(balance)}
          </div>
        </div>
        <span style={{ fontSize: '0.7rem' }}>▼</span>
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          marginTop: '0.5rem',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '1rem',
          minWidth: '250px',
          zIndex: 1000,
          color: 'white',
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem' }}>
              Wallet Address
            </div>
            <div style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
              {address}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem' }}>
              Balance
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
              {formatBalance(balance)}
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem' }}>
              Network
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleSwitchNetwork('mainnet-beta')}
                style={{
                  background: network === 'mainnet-beta' ? '#10B981' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Mainnet
              </button>
              <button
                onClick={() => handleSwitchNetwork('devnet')}
                style={{
                  background: network === 'devnet' ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Devnet
              </button>
            </div>
          </div>

          {network === 'devnet' && (
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={handleAirdrop}
                style={{
                  background: '#8B5CF6',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                🪂 Request Devnet Airdrop
              </button>
            </div>
          )}

          <button
            onClick={handleDisconnect}
            style={{
              background: '#EF4444',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
