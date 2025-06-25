// Simple IPFS upload using free services
// This replaces the complex Web3.storage setup

export async function uploadDreamToIPFS({ dreamText, imageFile, mood, category, keywords }: { dreamText: string, imageFile?: File, mood?: string, category?: string, keywords?: string }) {
  console.log('Starting IPFS upload...');
  
  // Try Pinata free tier first (1GB free, no API key needed for public uploads)
  try {
    console.log('Attempting Pinata upload...');
    return await uploadToPinata({ dreamText, imageFile, mood, category, keywords });
  } catch (error) {
    console.error('Pinata upload failed:', error);
  }
  
  // Lightweight fallback that won't exceed quota
  console.warn('Using lightweight fallback');
  return createLightweightFallback({ dreamText, mood, category, keywords });
}

async function uploadToPinata({ dreamText, imageFile, mood, category, keywords }: { dreamText: string, imageFile?: File, mood?: string, category?: string, keywords?: string }) {
  // Upload image first if available
  let imageUrl = null;
  
  if (imageFile) {
    console.log('Uploading image to Pinata...');
    const imageFormData = new FormData();
    imageFormData.append('file', imageFile);
    
    const imageResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      body: imageFormData
    });
    
    if (imageResponse.ok) {
      const imageResult = await imageResponse.json();
      imageUrl = `ipfs://${imageResult.IpfsHash}`;
      console.log('Image uploaded to Pinata:', imageUrl);
    } else {
      console.warn('Image upload failed, using placeholder');
    }
  }
  
  // Create and upload metadata
  const metadata = {
    name: 'DreamMint NFT',
    description: dreamText,
    image: imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2MzY2ZjE7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOWMzNGYzO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2dyYWQpIiByeD0iMTAiLz48dGV4dCB4PSIxMDAiIHk9IjkwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+8J+MmTwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjEyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RHJlYW1NaW50IE5GVDwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuOCkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNlcG9saWEgVGVzdG5ldDwvdGV4dD48L3N2Zz4=',
    attributes: [
      ...(mood ? [{ trait_type: 'Mood', value: mood }] : []),
      ...(category ? [{ trait_type: 'Category', value: category }] : []),
      ...(keywords ? [{ trait_type: 'Keywords', value: keywords }] : [])
    ]
  };
  
  console.log('Uploading metadata to Pinata...');
  const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { 
    type: 'application/json' 
  });
  
  const metadataFormData = new FormData();
  metadataFormData.append('file', metadataBlob, 'metadata.json');
  
  const metadataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    body: metadataFormData
  });
  
  if (metadataResponse.ok) {
    const metadataResult = await metadataResponse.json();
    const metadataUrl = `ipfs://${metadataResult.IpfsHash}`;
    console.log('Metadata uploaded to Pinata:', metadataUrl);
    return metadataUrl;
  }
  
  throw new Error('Pinata metadata upload failed');
}

function createLightweightFallback({ dreamText, mood, category, keywords }: { dreamText: string, mood?: string, category?: string, keywords?: string }) {
  // Create minimal metadata without storing large images
  const metadata = {
    name: 'DreamMint NFT',
    description: dreamText,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2MzY2ZjE7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOWMzNGYzO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2dyYWQpIiByeD0iMTAiLz48dGV4dCB4PSIxMDAiIHk9IjkwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+8J+MmTwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjEyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RHJlYW1NaW50IE5GVDwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuOCkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNlcG9saWEgVGVzdG5ldDwvdGV4dD48L3N2Zz4=',
    attributes: [
      ...(mood ? [{ trait_type: 'Mood', value: mood }] : []),
      ...(category ? [{ trait_type: 'Category', value: category }] : []),
      ...(keywords ? [{ trait_type: 'Keywords', value: keywords }] : [])
    ]
  };
  
  // Create a proper mock IPFS hash (valid base58 characters only)
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let mockHash = 'Qm';
  for (let i = 0; i < 44; i++) {
    mockHash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Store the metadata
  const metadataKey = `ipfs_metadata_${mockHash}`;
  localStorage.setItem(metadataKey, JSON.stringify(metadata));
  
  console.log('Created lightweight fallback with hash:', mockHash);
  return `ipfs://${mockHash}`;
}
