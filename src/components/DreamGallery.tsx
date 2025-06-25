import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getDreamMintContract } from "../blockchain/dreammint";

interface NFT {
  tokenId: number;
  tokenURI: string;
  image?: string;
  description?: string;
  isLegacy?: boolean;
}

export async function fetchUserDreamNFTs(account: string): Promise<NFT[]> {
  try {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    
    // Check network
    const network = await provider.getNetwork();
    console.log("Connected to network:", network.name, "Chain ID:", network.chainId);
    
    // ONLY support Sepolia testnet
    if (network.chainId !== 11155111n) {
      console.warn("❌ DreamMint Gallery only supports Sepolia testnet. Please switch to Sepolia to view your NFTs.");
      return [];
    }
    
    console.log("🌊 DreamMint Sepolia Testnet - Loading your NFTs...");
    console.log("🔗 Your NFTs can be viewed on OpenSea!");
    console.log("📍 Real IPFS images and metadata are supported");
    
    const contract = await getDreamMintContract(provider);
    console.log("Contract address:", contract.target);
    
    // Test if contract exists by checking if there's code at the address
    const code = await provider.getCode(contract.target as string);
    if (code === "0x") {
      console.error("No contract found at address:", contract.target);
      return [];
    }
    
    // Get the next token ID (total number of tokens minted)
    let nextTokenId: number;
    try {
      const result = await contract.nextTokenId();
      nextTokenId = Number(result);
      console.log("Next token ID:", nextTokenId);
    } catch (error) {
      console.error("Error getting nextTokenId:", error);
      // If contract is not deployed or there's an error, return empty array
      return [];
    }
    
    // If no tokens have been minted yet, return empty array
    if (nextTokenId === 0) {
      return [];
    }
    
    const owned: NFT[] = [];
    
    // Filter out the first 4 NFTs (token IDs 0-3) that were created before IPFS integration
    const LEGACY_NFT_COUNT = 4;
    const startTokenId = LEGACY_NFT_COUNT; // Start from token ID 4
    
    console.log(`🔍 Scanning tokens ${startTokenId} to ${nextTokenId - 1} (excluding first ${LEGACY_NFT_COUNT} legacy NFTs)`);
    
    // Check each token to see if the user owns it (skip first 4 legacy NFTs)
    for (let tokenId = startTokenId; tokenId < nextTokenId; tokenId++) {
      try {
        const owner = await contract.ownerOf(tokenId);
        if (owner.toLowerCase() === account.toLowerCase()) {
          const tokenURI = await contract.tokenURI(tokenId);
          let image, description;
          let isLegacy = false;
          
          if (tokenURI.startsWith('ipfs://')) {
            try {
              const ipfsHash = tokenURI.replace('ipfs://', '');
              
              // First, try to get from localStorage/sessionStorage (fallback metadata)
              const localMetadataKey = `ipfs_metadata_${ipfsHash}`;
              const localMetadata = localStorage.getItem(localMetadataKey) || sessionStorage.getItem(localMetadataKey);
              
              // Also check new in-memory fallback (Map-based)
              let mapMemoryMetadata = null;
              if (typeof window !== 'undefined' && (window as any).dreamMintMemory) {
                const memoryStore = (window as any).dreamMintMemory;
                if (memoryStore instanceof Map) {
                  mapMemoryMetadata = memoryStore.get(localMetadataKey);
                }
              }
              
              // Also check old in-memory fallback (object-based)
              let objMemoryMetadata = null;
              if (typeof window !== 'undefined' && (window as any).dreamMintFallbackData) {
                objMemoryMetadata = (window as any).dreamMintFallbackData[localMetadataKey];
              }
              
              // Combine all memory sources
              const inMemoryMetadata = mapMemoryMetadata || objMemoryMetadata;
              
              // Also try to find by token ID
              const tokenMetadataKey = `dream_nft_${tokenId}`;
              const tokenMetadata = localStorage.getItem(tokenMetadataKey) || sessionStorage.getItem(tokenMetadataKey);
              
              if (localMetadata || inMemoryMetadata) {
                const source = localMetadata ? 'localStorage/sessionStorage' : 'in-memory fallback';
                console.log(`Using ${source} metadata for token ${tokenId} (hash: ${ipfsHash})`);
                const meta = localMetadata ? JSON.parse(localMetadata) : inMemoryMetadata;
                // Handle different types of image URLs from local storage
                if (meta.image) {
                  if (meta.image.startsWith('ipfs://')) {
                    // This is another IPFS hash, try to resolve it
                    const imageHash = meta.image.replace('ipfs://', '');
                    // First check if we have the image data locally
                    const localImageKey = `ipfs_image_${imageHash}`;
                    const localImageData = localStorage.getItem(localImageKey) || sessionStorage.getItem(localImageKey);
                    if (localImageData) {
                      image = localImageData; // This should be a data URL or blob URL
                    } else {
                      // Try our proxy for IPFS image
                      image = `http://localhost:5001/api/proxy-image?url=https://ipfs.io/ipfs/${imageHash}`;
                    }
                  } else if (meta.image.includes('oaidalleapiprodscus.blob.core.windows.net') || 
                            meta.image.includes('dall-e') || 
                            (meta.image.startsWith('https://') && !meta.image.includes('ipfs.io'))) {
                    // Use our proxy for external URLs that might have CORS issues
                    image = `http://localhost:5001/api/proxy-image?url=${encodeURIComponent(meta.image)}`;
                  } else {
                    image = meta.image;
                  }
                }
                description = meta.description;
              } else if (tokenMetadata) {
                console.log(`Using token-specific metadata for token ${tokenId}`);
                const meta = JSON.parse(tokenMetadata);
                // Handle different types of image URLs from token-specific storage
                if (meta.image) {
                  if (meta.image.startsWith('ipfs://')) {
                    // This is another IPFS hash, try to resolve it
                    const imageHash = meta.image.replace('ipfs://', '');
                    // First check if we have the image data locally
                    const localImageKey = `ipfs_image_${imageHash}`;
                    const localImageData = localStorage.getItem(localImageKey) || sessionStorage.getItem(localImageKey);
                    if (localImageData) {
                      image = localImageData; // This should be a data URL or blob URL
                    } else {
                      // Try our proxy for IPFS image
                      image = `http://localhost:5001/api/proxy-image?url=https://ipfs.io/ipfs/${imageHash}`;
                    }
                  } else if (meta.image.includes('oaidalleapiprodscus.blob.core.windows.net') || 
                            meta.image.includes('dall-e') || 
                            (meta.image.startsWith('https://') && !meta.image.includes('ipfs.io'))) {
                    // Use our proxy for external URLs that might have CORS issues
                    image = `http://localhost:5001/api/proxy-image?url=${encodeURIComponent(meta.image)}`;
                  } else {
                    image = meta.image;
                  }
                }
                description = meta.description;
              } else {
                // For real IPFS URIs (successful Pinata uploads), try to fetch from IPFS
                console.log(`Token ${tokenId}: Attempting to fetch real IPFS metadata for hash: ${ipfsHash}`);
                try {
                  // Use our backend IPFS proxy to avoid CORS issues
                  const proxyUrl = `http://localhost:5001/api/proxy-ipfs/${ipfsHash}`;
                  console.log(`Fetching metadata via IPFS proxy: ${proxyUrl}`);
                  
                  const response = await fetch(proxyUrl);
                  const responseData = await response.json();
                  
                  if (response.ok) {
                    // Successfully fetched real IPFS metadata
                    console.log(`✅ Successfully fetched metadata via IPFS proxy for token ${tokenId}`);
                    description = responseData.description;
                    
                    if (responseData.image) {
                      if (responseData.image.startsWith('ipfs://')) {
                        // Convert IPFS image URL to image proxy URL to avoid CORS
                        const imageHash = responseData.image.replace('ipfs://', '');
                        image = `http://localhost:5001/api/proxy-image?url=https://ipfs.io/ipfs/${imageHash}`;
                        console.log(`✅ Real IPFS image via proxy: ${image}`);
                      } else {
                        image = responseData.image;
                      }
                    }
                  } else if (response.status === 404 && responseData.isLegacy) {
                    // This is a legacy NFT with fallback metadata from the backend
                    console.log(`Token ${tokenId}: Using legacy NFT fallback from backend`);
                    description = responseData.fallback?.description || `Legacy Dream NFT #${tokenId}`;
                    image = responseData.fallback?.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMjEyMTIxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iOTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzg4ODg4OCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TGVnYWN5IERyZWFtPC90ZXh0Pgo8dGV4dCB4PSIxMDAiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ORlQ8L3RleHQ+Cjwvc3ZnPgo=';
                    isLegacy = true;
                  } else {
                    // Other error from the backend
                    throw new Error(`IPFS proxy request failed: ${response.status} ${response.statusText}`);
                  }
                } catch (ipfsError) {
                  console.warn(`Failed to fetch IPFS metadata for ${ipfsHash}:`, ipfsError);
                  // Fall back to placeholder for real IPFS hashes that can't be fetched
                  console.log(`Token ${tokenId}: Using placeholder for inaccessible IPFS content`);
                  throw new Error('IPFS fetch failed - using placeholder');
                }
              }
            } catch (metaError) {
              const errorMessage = metaError instanceof Error ? metaError.message : String(metaError);
              // Only log as error if it's not expected local development behavior
              if (!errorMessage.includes('Local development mode')) {
                console.error(`Error fetching metadata for token ${tokenId}:`, metaError);
              }
              
              // Provide different messages based on the error type
              let description = `Dream NFT #${tokenId} - Successfully minted on local network!`;
              if (errorMessage.includes('Local development mode')) {
                description += ` (Local development mode - using placeholder image)`;
              } else {
                description += ` (Metadata loading failed, but your NFT exists on the blockchain)`;
              }
              
              // Still show the NFT even if metadata fails
              image = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2MzY2ZjE7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOWMzNGYzO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2dyYWQpIiByeD0iMTAiLz48dGV4dCB4PSIxMDAiIHk9IjkwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+8J+MmTwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjEyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RHJlYW1NaW50IE5GVDwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuOCkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkxvY2FsIERldmVsb3BtZW50PC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iMTU1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC43KSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UGxhY2Vob2xkZXIgSW1hZ2U8L3RleHQ+PC9zdmc+';
            }
          } else {
            // Handle non-IPFS URIs or failed IPFS fetches
            image = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2MzY2ZjE7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOWMzNGYzO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2dyYWQpIiByeD0iMTAiLz48dGV4dCB4PSIxMDAiIHk9IjkwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+8J+MmTwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjEyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RHJlYW1NaW50IE5GVDwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuOCkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkxvY2FsIE5ldHdvcms8L3RleHQ+PC9zdmc+';
            description = `Dream NFT #${tokenId} - Successfully minted on local network! The metadata couldn't be loaded, but your NFT exists on the blockchain.`;
          }
          
          owned.push({ tokenId, tokenURI, image, description, isLegacy });
        }
      } catch (tokenError) {
        console.error(`Error checking token ${tokenId}:`, tokenError);
        // Continue to next token if this one fails
      }
    }
    
    return owned;
  } catch (error) {
    console.error("Error fetching user dream NFTs:", error);
    return [];
  }
}

export function DreamGallery({ account, currentNetwork }: { account: string, currentNetwork?: string }) {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNFTs = async () => {
    console.log("DreamGallery: Fetching NFTs for account:", account);
    setLoading(true);
    try {
      const userNFTs = await fetchUserDreamNFTs(account);
      console.log("DreamGallery: Found NFTs:", userNFTs);
      setNfts(userNFTs);
    } catch (err) {
      console.error("DreamGallery: Error fetching NFTs:", err);
      setNfts([]);
    } finally {
      setLoading(false);
    }
  };

  const clearCacheAndRefresh = () => {
    // Clear all IPFS-related cache data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('ipfs_') || key.startsWith('dream_nft_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Also clear sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('ipfs_') || key.startsWith('dream_nft_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    console.log(`Cleared ${keysToRemove.length} cache entries`);
    
    // Refresh the NFTs
    fetchNFTs();
  };

  useEffect(() => {
    if (account) fetchNFTs();
  }, [account]);

  console.log("DreamGallery: Rendering with", nfts.length, "NFTs");

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Your DreamMints</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={fetchNFTs}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
          <button 
            onClick={clearCacheAndRefresh}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            🗑️ Clear Cache
          </button>
        </div>
      </div>
      <p style={{ fontSize: '14px', color: '#666' }}>
        Connected account: {account}
      </p>
      <div style={{
        backgroundColor: '#e8f5e8',
        border: '1px solid #4CAF50',
        borderRadius: '8px',
        padding: '12px',
        margin: '12px 0',
        fontSize: '14px',
        color: '#2E7D32'
      }}>
        <strong>✨ Gallery Filter Active:</strong> Showing only NFTs with proper IPFS integration. 
        The first 4 legacy NFTs (created before IPFS) are hidden to improve gallery quality.
      </div>
      {loading && <p>Loading your NFTs...</p>}
      {!loading && nfts.length === 0 && (
        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <p>No DreamMints found for this wallet.</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Make sure you're connected to the correct account and network.
          </p>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {nfts.map(nft => (
          <div key={nft.tokenId} style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8, minWidth: 200, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ margin: 0 }}><b>Token #{nft.tokenId}</b></p>
              {nft.isLegacy && (
                <span style={{
                  backgroundColor: '#FF7043',
                  color: '#fff',
                  padding: '3px 10px',
                  borderRadius: '16px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  boxShadow: '0 2px 4px rgba(255, 112, 67, 0.3)'
                }}>
                  📜 Legacy
                </span>
              )}
            </div>
            {nft.image && <img src={nft.image} alt="dream" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
            <p>{nft.description}</p>
            {nft.isLegacy && (
              <div style={{
                backgroundColor: '#FFF8E1',
                border: '1px solid #FFCC02',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '12px',
                color: '#E65100',
                marginBottom: '8px',
                lineHeight: '1.4'
              }}>
                <strong>📜 Legacy NFT:</strong> This dream was minted before IPFS integration. While the NFT exists on the blockchain, the image and metadata use fallback content and may not appear on external platforms like OpenSea.
              </div>
            )}
            <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>
              URI: <a 
                href={nft.tokenURI.startsWith('ipfs://') 
                  ? `https://gateway.pinata.cloud/ipfs/${nft.tokenURI.replace('ipfs://', '')}` 
                  : nft.tokenURI
                } 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {nft.tokenURI}
              </a>
            </p>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {currentNetwork === 'sepolia' ? (
                <>
                  <a 
                    href={`https://testnets.opensea.io/assets/sepolia/0x1b0b5e6c2787C11747dC0e90BD76028674b7209B/${nft.tokenId}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      padding: '6px 12px', 
                      backgroundColor: '#2081E2', 
                      color: 'white', 
                      textDecoration: 'none', 
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    🌊 OpenSea
                  </a>
                  <a 
                    href={`https://sepolia.etherscan.io/token/0x1b0b5e6c2787C11747dC0e90BD76028674b7209B?a=${nft.tokenId}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      padding: '6px 12px', 
                      backgroundColor: '#627EEA', 
                      color: 'white', 
                      textDecoration: 'none', 
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    🔍 Etherscan
                  </a>
                </>
              ) : (
                <span style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#f0f0f0', 
                  color: '#666', 
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  📍 Local Development - Switch to Sepolia for OpenSea
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
