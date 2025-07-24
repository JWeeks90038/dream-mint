import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { solanaDreamMint, formatPublicKey } from "../blockchain/solana";
import { environment } from "../config/environment";

interface NFT {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  description?: string;
  attributes?: any[];
}

export async function fetchUserDreamNFTs(publicKey: PublicKey): Promise<NFT[]> {
  try {
    console.log("🌊 Loading Solana NFTs for:", formatPublicKey(publicKey));
    console.log("🔗 Network:", environment.solana.network);
    console.log("📍 NFTs viewable on Magic Eden and Solana explorers");
    
    const nfts = await solanaDreamMint.fetchUserNFTs(publicKey);
    console.log(`Found ${nfts.length} DreamMint NFTs`);
    
    return nfts;
  } catch (error) {
    console.error("Error fetching user NFTs:", error);
    return [];
  }
}

async function loadNFTMetadata(uri: string): Promise<{ image?: string; description?: string; attributes?: any[] }> {
  try {
    // Handle IPFS URIs
    let metadataUrl = uri;
    if (uri.startsWith('ipfs://')) {
      metadataUrl = `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
    }

    const response = await fetch(metadataUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const metadata = await response.json();
    return {
      image: metadata.image,
      description: metadata.description,
      attributes: metadata.attributes || []
    };
  } catch (error) {
    console.error("Error loading NFT metadata:", error);
    return {
      image: undefined,
      description: "Failed to load metadata",
      attributes: []
    };
  }
}

interface DreamGalleryProps {
  nfts: NFT[];
}

export function DreamGallery({ nfts }: DreamGalleryProps) {
  const [enrichedNFTs, setEnrichedNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function enrichNFTs() {
      setLoading(true);
      
      const enriched = await Promise.all(
        nfts.map(async (nft) => {
          try {
            const metadata = await loadNFTMetadata(nft.uri);
            return {
              ...nft,
              ...metadata
            };
          } catch (error) {
            console.error(`Error enriching NFT ${nft.mint}:`, error);
            return nft;
          }
        })
      );
      
      setEnrichedNFTs(enriched);
      setLoading(false);
    }

    if (nfts.length > 0) {
      enrichNFTs();
    } else {
      setLoading(false);
    }
  }, [nfts]);

  const openModal = (nft: NFT) => {
    setSelectedNFT(nft);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedNFT(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        margin: '1rem 0'
      }}>
        <div style={{ color: 'white', fontSize: '1.2rem' }}>
          🔄 Loading your DreamMint NFTs...
        </div>
      </div>
    );
  }

  if (enrichedNFTs.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        margin: '1rem 0'
      }}>
        <div style={{ color: 'white', fontSize: '1.2rem', marginBottom: '1rem' }}>
          🎭 No DreamMint NFTs Found
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1rem' }}>
          Once you mint your first dream, it will appear here!
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '2rem 0' }}>
      <h2 style={{
        color: 'white',
        fontSize: '2rem',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        🎭 Your Dream Collection ({enrichedNFTs.length})
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {enrichedNFTs.map((nft) => (
          <div
            key={nft.mint}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onClick={() => openModal(nft)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* NFT Image */}
            <div style={{
              width: '100%',
              height: '200px',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '1rem',
              background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)'
            }}>
              {nft.image ? (
                <img
                  src={nft.image.startsWith('ipfs://') 
                    ? `https://gateway.pinata.cloud/ipfs/${nft.image.replace('ipfs://', '')}` 
                    : nft.image}
                  alt={nft.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 3rem;">🎨</div>';
                    }
                  }}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'white',
                  fontSize: '3rem'
                }}>
                  🎨
                </div>
              )}
            </div>

            {/* NFT Info */}
            <div style={{ color: 'white' }}>
              <h3 style={{
                margin: '0 0 0.5rem 0',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}>
                {nft.name}
              </h3>
              
              <p style={{
                margin: '0 0 0.5rem 0',
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.8)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                Mint: {formatPublicKey(nft.mint, 6)}
              </p>

              {nft.description && (
                <p style={{
                  margin: '0 0 1rem 0',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.4',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {nft.description}
                </p>
              )}

              {/* Attributes */}
              {nft.attributes && nft.attributes.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.25rem'
                  }}>
                    {nft.attributes.slice(0, 3).map((attr, index) => (
                      <span
                        key={index}
                        style={{
                          background: 'rgba(147, 51, 234, 0.7)',
                          color: 'white',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '500'
                        }}
                      >
                        {attr.trait_type}: {attr.value}
                      </span>
                    ))}
                    {nft.attributes.length > 3 && (
                      <span style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.7rem'
                      }}>
                        +{nft.attributes.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && selectedNFT && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '1.2rem',
                zIndex: 1001
              }}
            >
              ×
            </button>

            {/* NFT Image */}
            <div style={{
              width: '100%',
              height: '300px',
              background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedNFT.image ? (
                <img
                  src={selectedNFT.image.startsWith('ipfs://') 
                    ? `https://gateway.pinata.cloud/ipfs/${selectedNFT.image.replace('ipfs://', '')}` 
                    : selectedNFT.image}
                  alt={selectedNFT.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <div style={{ color: 'white', fontSize: '4rem' }}>🎨</div>
              )}
            </div>

            {/* NFT Details */}
            <div style={{ padding: '1.5rem' }}>
              <h2 style={{ margin: '0 0 1rem 0', color: '#333' }}>
                {selectedNFT.name}
              </h2>

              <div style={{ marginBottom: '1rem' }}>
                <strong>Mint Address:</strong>
                <br />
                <code style={{
                  background: '#f5f5f5',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  display: 'inline-block',
                  fontSize: '0.9rem',
                  wordBreak: 'break-all'
                }}>
                  {selectedNFT.mint}
                </code>
              </div>

              {selectedNFT.description && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Description:</strong>
                  <p style={{ 
                    margin: '0.5rem 0 0 0', 
                    lineHeight: '1.6',
                    color: '#666'
                  }}>
                    {selectedNFT.description}
                  </p>
                </div>
              )}

              {/* All Attributes */}
              {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Attributes:</strong>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '0.5rem',
                    marginTop: '0.5rem'
                  }}>
                    {selectedNFT.attributes.map((attr, index) => (
                      <div
                        key={index}
                        style={{
                          background: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#666',
                          marginBottom: '0.25rem'
                        }}>
                          {attr.trait_type}
                        </div>
                        <div style={{
                          fontWeight: 'bold',
                          color: '#333'
                        }}>
                          {attr.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginTop: '1.5rem'
              }}>
                <a
                  href={`${environment.solana.explorer}/address/${selectedNFT.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#6366f1',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                  }}
                >
                  View on Solana Explorer
                </a>
                
                {environment.solana.network === 'mainnet-beta' && (
                  <a
                    href={`https://magiceden.io/item-details/${selectedNFT.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#e11d48',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '0.9rem'
                    }}
                  >
                    View on Magic Eden
                  </a>
                )}

                {selectedNFT.uri && (
                  <a
                    href={selectedNFT.uri.startsWith('ipfs://') 
                      ? `https://gateway.pinata.cloud/ipfs/${selectedNFT.uri.replace('ipfs://', '')}` 
                      : selectedNFT.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#059669',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '0.9rem'
                    }}
                  >
                    View Metadata
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
