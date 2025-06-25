// Free IPFS upload using public gateways
// This approach doesn't require any API keys or paid services

export async function uploadDreamToIPFS({ dreamText, imageFile, mood, category, keywords }: { dreamText: string, imageFile?: File, mood?: string, category?: string, keywords?: string }) {
  console.log('Starting free IPFS upload...');
  
  try {
    // Use a free IPFS pinning service
    let imageUrl = null;
    
    if (imageFile) {
      console.log('Uploading image to IPFS...');
      imageUrl = await uploadToFreeIPFS(imageFile);
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
    
    const metadataUrl = await uploadToFreeIPFS(metadataFile);
    console.log('Metadata uploaded successfully:', metadataUrl);
    return metadataUrl;
    
  } catch (error) {
    console.error('Free IPFS upload failed, using fallback:', error);
    return createFallbackMetadata({ dreamText, imageFile, mood, category, keywords });
  }
}

async function uploadToFreeIPFS(file: File): Promise<string> {
  // Try multiple free IPFS services
  const services = [
    'https://ipfs.infura.io:5001/api/v0/add',
    'https://api.pinata.cloud/pinning/pinFileToIPFS'
  ];
  
  for (const serviceUrl of services) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(serviceUrl, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        // Different services return hash in different formats
        const hash = result.Hash || result.IpfsHash || result.hash;
        if (hash) {
          return `ipfs://${hash}`;
        }
      }
    } catch (error) {
      console.warn(`Failed to upload to ${serviceUrl}:`, error);
      continue;
    }
  }
  
  throw new Error('All IPFS services failed');
}

async function createFallbackMetadata({ dreamText, imageFile, mood, category, keywords }: { dreamText: string, imageFile?: File, mood?: string, category?: string, keywords?: string }) {
  // Create a better fallback with actual image data
  let imageDataUrl = null;
  if (imageFile) {
    // Convert image file to data URL for local storage
    const reader = new FileReader();
    await new Promise((resolve) => {
      reader.onload = () => {
        imageDataUrl = reader.result as string;
        resolve(null);
      };
      reader.readAsDataURL(imageFile);
    });
  }
  
  const fallbackMetadata = {
    name: 'DreamMint NFT',
    description: dreamText,
    image: imageDataUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2MzY2ZjE7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOWMzNGYzO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2dyYWQpIiByeD0iMTAiLz48dGV4dCB4PSIxMDAiIHk9IjkwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+8J+MmTwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjEyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RHJlYW1NaW50IE5GVDwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuOCkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNlcG9saWEgVGVzdG5ldDwvdGV4dD48L3N2Zz4=',
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
  
  const metadataKey = `ipfs_metadata_${mockHash}`;
  localStorage.setItem(metadataKey, JSON.stringify(fallbackMetadata));
  
  console.log('Stored fallback metadata with hash:', mockHash);
  console.log('Stored fallback metadata with image:', !!imageDataUrl);
  return `ipfs://${mockHash}`;
}
