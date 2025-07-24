import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { DreamGallery as SolanaDreamGallery, fetchUserDreamNFTs } from "./SolanaDreamGallery";

interface NFT {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  description?: string;
  attributes?: any[];
}

export function DreamGallery() {
  const { publicKey, connected } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNFTs() {
      if (!connected || !publicKey) {
        setNfts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("🎭 Loading DreamMint NFTs for wallet:", publicKey.toString());
        const userNFTs = await fetchUserDreamNFTs(publicKey);
        setNfts(userNFTs);
        console.log(`✅ Loaded ${userNFTs.length} DreamMint NFTs`);
      } catch (err) {
        console.error("Error loading NFTs:", err);
        setError("Failed to load your dream collection. Please try again.");
        setNfts([]);
      } finally {
        setLoading(false);
      }
    }

    loadNFTs();
  }, [publicKey, connected]);

  // Wallet not connected state
  if (!connected) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem 1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        margin: '2rem 0',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ 
          color: 'white', 
          fontSize: '1.5rem',
          marginBottom: '1rem'
        }}>
          🔌 Connect Your Solana Wallet
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          fontSize: '1rem',
          lineHeight: '1.6'
        }}>
          Connect your Phantom, Solflare, or other Solana wallet<br />
          to view your DreamMint NFT collection
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        background: 'rgba(239, 68, 68, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        margin: '2rem 0',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        <div style={{ 
          color: '#ef4444', 
          fontSize: '1.2rem',
          marginBottom: '1rem'
        }}>
          ⚠️ Error Loading Dreams
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          fontSize: '1rem'
        }}>
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem 1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        margin: '2rem 0'
      }}>
        <div style={{ 
          color: 'white', 
          fontSize: '1.2rem',
          marginBottom: '1rem'
        }}>
          🔄 Loading Your Dream Collection...
        </div>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          fontSize: '0.9rem'
        }}>
          Scanning the Solana blockchain for your DreamMint NFTs
        </div>
      </div>
    );
  }

  // Render the Solana NFT Gallery
  return <SolanaDreamGallery nfts={nfts} />;
}

export default DreamGallery;
