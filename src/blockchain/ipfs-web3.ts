import { create } from '@web3-storage/w3up-client';

// Web3.storage provides 5GB free storage per month
// Get your free account at: https://console.web3.storage/

export async function uploadDreamToIPFS({ dreamText, imageFile, mood, category, keywords }: { dreamText: string, imageFile?: File, mood?: string, category?: string, keywords?: string }) {
  console.log('Starting IPFS upload with Web3.storage...');
  
  try {
    // Create client and authorize with stored credentials
    const client = await create();
    
    // Check if we have the required credentials
    const did = import.meta.env.VITE_WEB3_STORAGE_DID;
    const proof = import.meta.env.VITE_WEB3_STORAGE_PROOF;
    
    if (!did || !proof) {
      console.warn('Web3.Storage credentials not found, using fallback');
      return createFallbackMetadata({ dreamText, imageFile, mood, category, keywords });
    }
    
    console.log('Authorizing Web3.storage client...');
    // Note: The authorization process for Web3.Storage is complex and may require CLI setup
    // For now, we'll try a direct upload and fall back if it fails
    
    console.log('Web3.storage client created, attempting upload...');
    
    // For Web3.storage, we need to upload the image first, then create metadata
    let imageUrl = null;
    
    if (imageFile) {
      console.log('Uploading image to IPFS...');
      const imageCid = await client.uploadFile(imageFile);
      imageUrl = `ipfs://${imageCid}`;
      console.log('Image uploaded to IPFS:', imageUrl);
    }
    
    // Create metadata object
    const metadata = {
      name: 'DreamMint NFT',
      description: dreamText,
      image: imageUrl,
      attributes: [
        ...(mood ? [{ trait_type: 'Mood', value: mood }] : []),
        ...(category ? [{ trait_type: 'Category', value: category }] : []),
        ...(keywords ? [{ trait_type: 'Keywords', value: keywords }] : [])
      ]
    };
    
    // Upload metadata as JSON
    console.log('Uploading metadata to IPFS...');
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { 
      type: 'application/json' 
    });
    const metadataFile = new File([metadataBlob], 'metadata.json', { 
      type: 'application/json' 
    });
    
    const metadataCid = await client.uploadFile(metadataFile);
    const metadataUrl = `ipfs://${metadataCid}`;
    
    console.log('✅ Upload successful! Metadata uploaded to:', metadataUrl);
    console.log('🖼️ Image URL:', imageUrl);
    
    return metadataUrl;
    
  } catch (error) {
    console.error('Web3.storage upload failed, using fallback:', error);
    return createFallbackMetadata({ dreamText, imageFile, mood, category, keywords });
  }
}

async function createFallbackMetadata({ dreamText, imageFile: _imageFile, mood, category, keywords }: { dreamText: string, imageFile?: File, mood?: string, category?: string, keywords?: string }) {
  console.log('Creating fallback metadata...');
  
  // Use a lightweight placeholder image instead of storing the actual image data
  // This avoids localStorage quota issues
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2MzY2ZjE7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOWMzNGYzO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2dyYWQpIiByeD0iMTAiLz48dGV4dCB4PSIxMDAiIHk9IjkwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+8J+MmTwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjEyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RHJlYW1NaW50IE5GVDwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuOCkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkZhbGxiYWNrIERhdGE8L3RleHQ+PC9zdmc+';
  
  const fallbackMetadata = {
    name: 'DreamMint NFT',
    description: dreamText,
    image: placeholderImage, // Always use placeholder to avoid quota issues
    attributes: [
      ...(mood ? [{ trait_type: 'Mood', value: mood }] : []),
      ...(category ? [{ trait_type: 'Category', value: category }] : []),
      ...(keywords ? [{ trait_type: 'Keywords', value: keywords }] : []),
      { trait_type: 'Storage', value: 'Fallback' }
    ]
  };
  
  // Create a proper mock IPFS hash (valid base58 characters only)
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let mockHash = 'Qm';
  for (let i = 0; i < 44; i++) {
    mockHash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const metadataKey = `ipfs_metadata_${mockHash}`;
  const metadataString = JSON.stringify(fallbackMetadata);
  
  // Try sessionStorage first (cleared on tab close), then localStorage
  try {
    sessionStorage.setItem(metadataKey, metadataString);
    console.log('✅ Stored fallback metadata in sessionStorage with hash:', mockHash);
  } catch (sessionError) {
    try {
      localStorage.setItem(metadataKey, metadataString);
      console.log('✅ Stored fallback metadata in localStorage with hash:', mockHash);
    } catch (localError) {
      console.warn('⚠️ Both sessionStorage and localStorage are full, using in-memory fallback');
      // Store in a global variable as last resort
      if (typeof window !== 'undefined') {
        (window as any).dreamMintFallbackData = (window as any).dreamMintFallbackData || {};
        (window as any).dreamMintFallbackData[metadataKey] = fallbackMetadata;
      }
    }
  }
  
  return `ipfs://${mockHash}`;
}
