// Utility to check if Solana Snap is installed (checks for @solflare-wallet/solana-snap)
const SOLFLARE_SOLANA_SNAP_ID = 'npm:@solflare-wallet/solana-snap';
async function isSolanaSnapInstalled(): Promise<boolean> {
  if (!(window as any).ethereum) return false;
  try {
    const snaps = await (window as any).ethereum.request({ method: 'wallet_getSnaps' });
    return Object.keys(snaps).includes(SOLFLARE_SOLANA_SNAP_ID);
  } catch (e) {
    return false;
  }
}
import { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { 
  ConnectionProvider, 
  WalletProvider, 
  useWallet 
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter
} from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
  WalletMultiButton,
  WalletDisconnectButton
} from '@solana/wallet-adapter-react-ui';

import { solanaDreamMint, formatPublicKey } from './blockchain/solana';
import { uploadDreamToIPFS } from './blockchain/ipfs-pinata';
import { PaymentManager } from './components/PaymentManager';
// Placeholder for MetaMask Snap connect
import { paymentService, type PaymentMethod } from './services/PaymentService';
import { environment, fetchBackendConfig } from './config/environment';
import { solanaConfig } from './config/solana';
import { DreamGallery } from './components/SolanaDreamGallery';

import './App.css';
import './dream-surreal.css';

// Solana wallet configuration
const network = environment.solana.network as WalletAdapterNetwork;
const endpoint = environment.solana.rpcUrl;

// Add Backpack, Torus, and a placeholder for MetaMask Snap
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network }),
  new TorusWalletAdapter(),
  // MetaMask Snap support would go here (see below)
];

// Main DreamMint Application Component
function DreamMintApp() {
  // Handler to reset the vision/image state
  function handleResetVision() {
    setAiImageUrl(null);
    setDream('');
    setError(null);
  }
  const { connection } = useConnection();
  // ...existing code...

  // ...existing code...
  const { connected, publicKey, wallet } = useWallet();
  
  // State management
  const [dream, setDream] = useState('');
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [userNFTs, setUserNFTs] = useState<any[]>([]);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showPaymentManager, setShowPaymentManager] = useState(false);
  const [paymentAction, setPaymentAction] = useState<'mint' | null>(null);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  // Load backend configuration on mount
  useEffect(() => {
    fetchBackendConfig();
  }, []);

  // Load wallet balance when connected
  useEffect(() => {
    if (connected && publicKey) {
      loadWalletBalance();
      loadUserNFTs();
    }
  }, [connected, publicKey]);

  async function loadWalletBalance() {
    if (!publicKey) return;
    try {
      // Use the wallet adapter's connection for accurate network
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / 1e9);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  }

  async function loadUserNFTs() {
    if (!publicKey) return;
    try {
      // Load user's NFTs from Solana
      console.log('Loading NFTs for:', publicKey.toString());
      // Implementation would go here
      setUserNFTs([]);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
    }
  }

  // Separate function to generate image only
  async function generateImage() {
    if (!dream.trim()) {
      setError('Please enter your dream description first.');
      return;
    }

    if (!connected || !publicKey) {
      setError('Please connect your Solana wallet first.');
      return;
    }

    // Check if user has a default payment method
    if (!defaultPaymentMethod) {
      setPaymentAction('mint');
      setShowPaymentManager(true);
      return;
    }

    setProcessing(true);
    setError(null);
    
    try {
      console.log("🎨 Generating AI image...");

      // Step 1: Process payment for image generation
      const imagePaymentResult = await paymentService.processImageGenerationPayment(
        publicKey.toString(),
        defaultPaymentMethod,
        dream
      );

      if (!imagePaymentResult.success) {
        throw new Error(imagePaymentResult.error || 'Payment for image generation failed');
      }

      // Step 2: Generate AI Image
      const response = await fetch(`${environment.apiUrl}/api/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: dream }),
      });

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.statusText}`);
      }

      const imageData = await response.json();
      if (!imageData.imageUrl) {
        throw new Error('No image URL received from generation service');
      }

      setAiImageUrl(imageData.imageUrl);
      console.log("✅ AI image generated successfully");

      // Reload balance
      await loadWalletBalance();

    } catch (error) {
      console.error('❌ Image generation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setProcessing(false);
    }
  }

  // Function to mint NFT (requires existing generated image)
  async function mintDream() {
    if (!dream.trim()) {
      setError('Please enter your dream description first.');
      return;
    }

    if (!connected || !publicKey) {
      setError('Please connect your Solana wallet first.');
      return;
    }

    if (!aiImageUrl) {
      setError('Please generate an image first before minting.');
      return;
    }

    // Check if user has a default payment method
    if (!defaultPaymentMethod) {
      setPaymentAction('mint');
      setShowPaymentManager(true);
      return;
    }

    setProcessing(true);
    setError(null);
    
    try {
      console.log("🚀 Starting NFT minting process...");

      // Step 1: Process NFT minting payment
      console.log("💳 Processing NFT minting payment...");
      
      const paymentResult = await paymentService.processNFTMintingPayment(
        publicKey.toString(),
        defaultPaymentMethod,
        dream,
        aiImageUrl
      );

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      console.log("✅ Payment processed successfully");

      // Step 2: Upload metadata to IPFS
      console.log("📁 Uploading metadata to IPFS...");
      
      const metadataUri = await uploadDreamToIPFS({
        dreamText: dream,
        imageFile: undefined,
        mood: undefined,
        category: undefined,
        keywords: undefined
      });

      console.log("✅ Metadata uploaded to IPFS:", metadataUri);

      // Step 3: Mint NFT on Solana
      console.log("⚡ Minting NFT on Solana...");
      
      const mintResult = await solanaDreamMint.mintDreamNFT({
        wallet: {
          publicKey,
          connected,
          connect: wallet!.adapter.connect.bind(wallet!.adapter),
          disconnect: wallet!.adapter.disconnect.bind(wallet!.adapter)
        },
        metadataUri,
        name: `Dream: ${dream.substring(0, 30)}...`,
        symbol: 'DREAM'
      });

      console.log("🎉 Dream NFT minted successfully!");
      console.log("🔗 Transaction:", mintResult.signature);
      console.log("🎯 Mint Address:", mintResult.mintAddress);

      // Success notification
      setError(null);
      alert(`🎉 Dream NFT minted successfully! 

Mint Address: ${mintResult.mintAddress}
Transaction: ${mintResult.signature}

Your NFT will appear in your wallet and can be viewed on Solana explorers.`);

      // Reset form
      setDream('');
      setAiImageUrl(null);
      
      // Reload user NFTs and balance
      await loadUserNFTs();
      await loadWalletBalance();

    } catch (error) {
      console.error('❌ NFT minting failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to mint NFT');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">
      {/* Header with How It Works button top right */}
      <header className="bg-white/[0.02] backdrop-blur-xl border-b border-white/10">
  <div className="max-w-7xl mx-auto px-6 py-8">
    <div className="text-center">
      <div className="inline-flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/20">
          <span className="text-3xl">🌙</span>
        </div>
        <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
          DreamMint
        </h1>
      </div>
      {/* How It Works button centered below the title */}
      <button
        className="dreammint-btn px-5 py-2 text-base font-semibold shadow-lg mb-6"
        onClick={() => setShowHowItWorksModal(true)}
        type="button"
        style={{zIndex: 60}}
      >
        How It Works
      </button>
      <p className="text-xl md:text-2xl text-slate-300 font-light max-w-2xl mx-auto leading-relaxed">
        Transform your dreams into unique NFTs with AI-powered visualization
      </p>
    </div>
  </div>
</header>

      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* --- WALLET & STATUS --- */}
          <div className="lg:col-span-1 space-y-6">
            {/* Wallet Connection */}
            <div className="dreammint-section">
              <div className="dreammint-section-header">👛 Connect Wallet</div>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="wallet-disconnect-parent">
                    <WalletMultiButton className="dreammint-btn" />
                    {connected && (
                      <WalletDisconnectButton className="wallet-disconnect-link mt-2 text-indigo-400 hover:underline bg-transparent border-none shadow-none p-0 h-auto min-h-0 min-w-0 text-base font-medium cursor-pointer" style={{background: 'none', boxShadow: 'none'}}>
                        Disconnect
                      </WalletDisconnectButton>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Phantom • Solflare • Backpack • Torus
                  </p>
                </div>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-slate-950 px-3 text-slate-400">or</span>
                  </div>
                </div>
                <div className="text-center">
                  {/* MetaMask Snap Button/Instructions */}
                  <button
                    className="dreammint-btn"
                    style={{ marginBottom: 8 }}
                    onClick={async () => {
                      if (!(window as any).ethereum) {
                        alert('MetaMask is not installed.');
                        return;
                      }
                      try {
                        // Request the Solflare Solana Snap using wallet_requestSnaps
                        await (window as any).ethereum.request({
                          method: 'wallet_requestSnaps',
                          params: {
                            [SOLFLARE_SOLANA_SNAP_ID]: {},
                          },
                        });
                        alert('Solana Snap (Solflare) enabled!');
                      } catch (err) {
                        alert('Failed to enable Solana Snap: ' + (err && (err as any).message ? (err as any).message : err));
                      }
                    }}
                  >
                    Connect MetaMask (Solana Snap)
                  </button>
                  <p className="text-xs text-amber-300 mt-1">
                    <a href="https://snaps.metamask.io/snap/npm/solflare-wallet/solana-snap/" target="_blank" rel="noopener noreferrer">
                      Install Solflare Solana Snap
                    </a> if you want to use MetaMask for Solana.
                  </p>
                </div>
              </div>
            </div>
            {/* Wallet Status */}
            {connected && publicKey && (
              <div className="dreammint-section">
                <div className="dreammint-section-header">✅ Connected</div>
                <div className="space-y-4">
                  <div className="dreammint-card">
                    <p className="text-slate-400 text-sm mb-1">Balance</p>
                    <p className="text-white font-bold text-lg">{balance.toFixed(4)} SOL</p>
                  </div>
                  <div className="dreammint-card">
                    <p className="text-slate-400 text-sm mb-1">Network</p>
                    <p className="text-white font-semibold capitalize">{solanaConfig.network}</p>
                  </div>
                  <div className="dreammint-card">
                    <p className="text-slate-400 text-sm mb-1">Address</p>
                    <p className="text-white font-mono text-xs">{formatPublicKey(publicKey)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- DREAM CREATION & GALLERY --- */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dream Input */}
            <div className="dreammint-section">
              <div className="dreammint-section-header">✨ Create Your Dream NFT</div>
              <div className="dreammint-section-sub">Transform your visions into digital art</div>
              <div>
                <label className="block text-white font-semibold text-lg mb-3">
  Describe Your Dream
</label>
<div className="relative">
  <textarea
     value={dream}
  onChange={(e) => setDream(e.target.value)}
  placeholder="I dreamed of floating through a cosmic garden where flowers sang melodies and their petals were made of starlight, while celestial beings danced among the aurora-lit clouds..."
  className="dreammint-textarea w-full min-h-[220px] max-h-[440px] p-7 text-lg"
  disabled={processing}
  maxLength={500}
  />
  <div className="absolute bottom-3 right-4 bg-white/80 rounded-lg px-3 py-1 shadow text-xs font-medium">
    <span className={dream.length > 400 ? "text-red-600" : "text-slate-600"}>
      {dream.length}/500
    </span>
  </div>
</div>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button
                  onClick={generateImage}
                  disabled={processing || !dream.trim() || !connected || !!aiImageUrl}
                  className="dreammint-btn flex-1"
                >
                  {processing && !aiImageUrl ? "Generating..." : "🎨 Generate Vision"}
                </button>
                <button
                  onClick={mintDream}
                  disabled={processing || !dream.trim() || !connected || !aiImageUrl}
                  className="dreammint-btn flex-1"
                >
                  {processing && aiImageUrl ? "Minting..." : "🌙 Mint NFT ✨"}
                </button>
                {aiImageUrl && (
                  <button
                    onClick={handleResetVision}
                    disabled={processing}
                    className="dreammint-btn flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    🔄 Reset
                  </button>
                )}
              </div>
              {/* Status Messages */}
              {!connected && (
                <div className="dreammint-card text-center mt-4">
                  <p className="text-amber-200 font-medium">🔐 Connect your wallet to start creating</p>
                </div>
              )}
              {aiImageUrl && (
                <div className="dreammint-card text-center mt-4">
                  <p className="text-emerald-200 font-medium">✅ Vision ready! Now mint it as an NFT</p>
                </div>
              )}
            </div>
            {/* Image Preview */}
            {aiImageUrl && (
              <div className="dreammint-section">
                <div className="dreammint-section-header">🎨 Your Dream Visualization</div>
                <div className="flex justify-center">
                  <img 
                    src={aiImageUrl} 
                    alt="Dream visualization" 
                    className="w-full max-w-lg rounded-xl shadow-2xl border border-white/10 transition-transform duration-300"
                  />
                </div>
              </div>
            )}
            {/* Collection Preview */}
            <div className="dreammint-section">
              <div className="dreammint-section-header">🌟 Your Collection</div>
              <div>
                {userNFTs.length > 0 ? (
                  <DreamGallery nfts={userNFTs} />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl text-slate-400">🌙</span>
                    </div>
                    <h4 className="text-white font-bold text-lg mb-2">No Dreams Yet</h4>
                    <p className="text-slate-400">Create your first dream NFT to start your collection</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

{/* --- How It Works Modal --- */}
{showHowItWorksModal && (
  <div className="modal" aria-modal="true" role="dialog" tabIndex={-1}>
    <div className="modal-content">
      <button
        style={{ position: 'absolute', top: 18, right: 22, fontSize: 28, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}
        onClick={() => setShowHowItWorksModal(false)}
        aria-label="Close"
        tabIndex={0}
      >
        &times;
      </button>
      <h2>How DreamMint Works</h2>
      <ol>
        <li>
          <strong>Describe Your Dream:</strong> Enter a detailed description of your dream in the text box. The more vivid and creative, the better the AI can visualize it!
        </li>
        <li>
          <strong>AI Generates Visualization:</strong> Our AI transforms your dream description into a unique piece of digital art, previewed instantly for you.
        </li>
        <li>
          <strong>Mint as NFT on Solana:</strong> Once you love your dream’s visualization, mint it as an NFT on the Solana blockchain. It’s now a permanent, ownable digital collectible!
        </li>
        <li>
          <strong>View & Share:</strong> Your minted dream NFT appears in your collection. You can view, share, or trade it—your dream, your way.
        </li>
      </ol>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)', color: '#fff', padding: '10px 28px', borderRadius: 16, fontWeight: 600, fontSize: 18, boxShadow: '0 2px 12px 0 rgba(139, 92, 246, 0.10)' }}>
          Dream. Visualize. Own.
        </span>
      </div>
    </div>
  </div>
)}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <div className="bg-red-500/10 backdrop-blur-xl rounded-xl border border-red-400/30 shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div className="flex-1">
                <p className="text-red-200 text-sm font-medium">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl max-w-md w-full">
            <PaymentManager
              onPaymentMethodSelected={(method) => {
                setDefaultPaymentMethod(method);
                setShowPaymentManager(false);
                if (paymentAction === 'mint') {
                  mintDream();
                }
              }}
              onClose={() => setShowPaymentManager(false)}
              account={publicKey?.toString() || ''}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Main App component wrapped with Solana providers
export default function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <DreamMintApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
