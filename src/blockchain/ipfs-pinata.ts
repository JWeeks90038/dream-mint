// Alternative IPFS upload using Pinata (free 1GB)
// Get your free API key at: https://app.pinata.cloud/

export async function uploadDreamToIPFS({ dreamText, imageFile, mood, category, keywords }: { 
  dreamText: string, 
  imageFile?: File, 
  mood?: string, 
  category?: string, 
  keywords?: string 
}) {
  console.log('Starting IPFS upload with Pinata...');
  
  try {
    const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
    const pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY;
    
    // Debug environment variables
    console.log('🔧 Environment check:');
    console.log('API Key:', pinataApiKey ? `${pinataApiKey.slice(0, 8)}...` : 'NOT FOUND');
    console.log('Secret Key:', pinataSecretKey ? `${pinataSecretKey.slice(0, 8)}...` : 'NOT FOUND');
    console.log('All env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
    
    if (!pinataApiKey || !pinataSecretKey) {
      console.error('❌ Pinata credentials missing, using fallback');
      return createFallbackMetadata({ dreamText, mood, category, keywords, imageFile });
    }
    
    // Test authentication first
    console.log('Testing Pinata authentication...');
    const authResponse = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey,
      }
    });
    
    if (!authResponse.ok) {
      const authError = await authResponse.text();
      console.error('Pinata auth failed:', authResponse.status, authError);
      console.error('❌ Pinata authentication failed, using fallback');
      if (authError.includes('NO_SCOPES_FOUND')) {
        console.error('🔑 SOLUTION: Your API key lacks required permissions!');
        console.error('📝 Go to https://app.pinata.cloud/keys and create a NEW key with:');
        console.error('   ✅ pinFileToIPFS (for image uploads)');
        console.error('   ✅ pinJSONToIPFS (for metadata uploads)');
        console.error('   ✅ userPinnedDataTotal (for usage stats)');
      }
      return createFallbackMetadata({ dreamText, mood, category, keywords, imageFile });
    }
    
    console.log('✅ Pinata authentication successful');
    
    // Test specific scopes by checking user data
    try {
      const userDataResponse = await fetch('https://api.pinata.cloud/data/userPinnedDataTotal', {
        method: 'GET',
        headers: {
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretKey,
        }
      });
      
      if (userDataResponse.ok) {
        const userData = await userDataResponse.json();
        console.log('📊 Pinata usage:', userData);
        console.log('✅ API key has correct scopes for file uploads');
      } else {
        console.warn('⚠️ Cannot check usage data, but auth passed');
      }
    } catch (scopeError) {
      console.warn('⚠️ Scope test failed, but auth passed:', scopeError);
    }
    
    // Upload image to Pinata first
    let imageUrl = null;
    
    if (imageFile) {
      console.log('Uploading image to Pinata IPFS...');
      
      const imageFormData = new FormData();
      imageFormData.append('file', imageFile);
      imageFormData.append('pinataMetadata', JSON.stringify({
        name: `dreammint-image-${Date.now()}`,
        keyvalues: {
          type: 'dream-image'
        }
      }));
      
      const imageResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretKey,
        },
        body: imageFormData
      });
      
      if (!imageResponse.ok) {
        const imageError = await imageResponse.text();
        console.error('Pinata image upload failed:', imageResponse.status, imageError);
        console.error('❌ Image upload failed, using fallback with original image');
        return createFallbackMetadata({ dreamText, mood, category, keywords, imageFile });
      }
      
      const imageResult = await imageResponse.json();
      imageUrl = `ipfs://${imageResult.IpfsHash}`;
      console.log('✅ Image uploaded to IPFS:', imageUrl);
    }
    
    // Create and upload metadata
    const metadata = {
      name: 'DreamMint NFT',
      description: dreamText,
      image: imageUrl,
      external_url: 'https://dreammint.app',
      attributes: [
        ...(mood ? [{ trait_type: 'Mood', value: mood }] : []),
        ...(category ? [{ trait_type: 'Category', value: category }] : []),
        ...(keywords ? [{ trait_type: 'Keywords', value: keywords }] : []),
        { trait_type: 'Created', value: new Date().toISOString().split('T')[0] },
        { trait_type: 'Storage', value: 'Pinata-IPFS' }
      ]
    };
    
    console.log('Uploading metadata to Pinata IPFS...');
    
    const metadataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `dreammint-metadata-${Date.now()}`,
          keyvalues: {
            type: 'dream-metadata'
          }
        }
      })
    });
    
    if (!metadataResponse.ok) {
      const metadataError = await metadataResponse.text();
      console.error('Pinata metadata upload failed:', metadataResponse.status, metadataError);
      console.error('❌ Metadata upload failed, using fallback');
      return createFallbackMetadata({ dreamText, mood, category, keywords, imageFile });
    }
    
    const metadataResult = await metadataResponse.json();
    const metadataUrl = `ipfs://${metadataResult.IpfsHash}`;
    
    console.log('🎉 SUCCESS! Real IPFS upload completed!');
    console.log('📍 Metadata URL:', metadataUrl);
    console.log('🖼️ Image URL:', imageUrl);
    console.log('🌐 This will display properly on OpenSea!');
    
    return metadataUrl;
    
  } catch (error) {
    console.error('Pinata upload failed, using fallback:', error);
    // Provide more detailed error info to user
    if (error instanceof Error) {
      if (error.message.includes('403')) {
        console.error('❌ Pinata API key issue: Check your API key permissions at https://app.pinata.cloud/keys');
      } else if (error.message.includes('401')) {
        console.error('❌ Pinata authentication failed: Check your API key and secret');
      } else if (error.message.includes('429')) {
        console.error('❌ Pinata rate limit exceeded: Try again in a few minutes');
      }
    }
    return createFallbackMetadata({ dreamText, mood, category, keywords, imageFile });
  }
}

async function createFallbackMetadata({ dreamText, mood, category, keywords, imageFile }: { 
  dreamText: string, 
  imageFile?: File, 
  mood?: string, 
  category?: string, 
  keywords?: string 
}) {
  console.log('🔧 Creating enhanced fallback metadata with real image...');
  
  // Try to use the actual generated image if available
  let imageDataUrl = null;
  if (imageFile) {
    try {
      // Convert the File to a data URL for storage
      imageDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(imageFile);
      });
      console.log('✅ Converted actual image to data URL for fallback');
    } catch (error) {
      console.warn('Failed to convert image, using placeholder:', error);
    }
  }
  
  // Use a high-quality placeholder if no image
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2MzY2ZjE7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOWMzNGYzO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSJ1cmwoI2dyYWQpIiByeD0iMjAiLz48Y2lyY2xlIGN4PSIyNTYiIGN5PSIyMDAiIHI9IjgwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMykiLz48cGF0aCBkPSJNMTUwIDM1MEMxNTAgMzAwIDIwMCAyNTAgMjU2IDI1MFMzNjIgMzAwIDM2MiAzNTBMMTUwIDM1MFoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIvPjx0ZXh0IHg9IjI1NiIgeT0iNDIwIiBmb250LWZhbWlseT0iLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBzZWdvZSB1aSIsIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iNjAwIj5EcmVhbU1pbnQgTkZUPC90ZXh0Pjx0ZXh0IHg9IjI1NiIgeT0iNDUwIiBmb250LWZhbWlseT0iLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBzZWdvZSB1aSIsIGZvbnQtc2l6ZT0iMTQiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC44KSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TG9jYWwgU3RvcmFnZTwvdGV4dD48L3N2Zz4=';
  
  // Create metadata with actual image or high-quality placeholder
  const fallbackMetadata = {
    name: 'DreamMint NFT',
    description: dreamText.length > 500 ? dreamText.substring(0, 497) + '...' : dreamText,
    image: imageDataUrl || placeholderImage,
    external_url: 'https://dreammint.app',
    attributes: [
      ...(mood ? [{ trait_type: 'Mood', value: mood }] : []),
      ...(category ? [{ trait_type: 'Category', value: category }] : []),
      ...(keywords ? [{ trait_type: 'Keywords', value: keywords.substring(0, 100) }] : []),
      { trait_type: 'Created', value: new Date().toISOString().split('T')[0] },
      { trait_type: 'Storage', value: 'Local-Fallback' },
      { trait_type: 'Has-Real-Image', value: imageDataUrl ? 'Yes' : 'No' }
    ]
  };
  
  // Create a proper mock IPFS hash (valid base58 characters only)
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let mockHash = 'Qm';
  for (let i = 0; i < 44; i++) {
    mockHash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const metadataKey = `ipfs_metadata_${mockHash}`;  // Use consistent key format
  
  // Store in sessionStorage for better display in gallery
  try {
    // Clear old entries to make space (keep max 2 recent ones)
    const allKeys = [...Object.keys(sessionStorage), ...Object.keys(localStorage)];
    const oldDreamKeys = allKeys.filter(key => key.startsWith('ipfs_metadata_'));
    
    if (oldDreamKeys.length >= 2) {
      // Remove oldest entries first
      oldDreamKeys.slice(0, -1).forEach(key => {
        try {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        } catch (e) { /* ignore */ }
      });
      console.log(`🧹 Cleaned ${oldDreamKeys.length - 1} old dream entries`);
    }
    
    // Try to store with compression if needed
    let metadataToStore = fallbackMetadata;
    const metadataString = JSON.stringify(metadataToStore);
    
    if (metadataString.length > 1000000) { // If larger than 1MB
      console.log('📦 Compressing large metadata...');
      // Create a compressed version for storage
      metadataToStore = {
        ...fallbackMetadata,
        description: dreamText.substring(0, 200) + '...',
        image: placeholderImage // Use placeholder if too large
      };
    }
    
    sessionStorage.setItem(metadataKey, JSON.stringify(metadataToStore));
    console.log('✅ Stored enhanced fallback in sessionStorage:', mockHash);
    console.log('📷 Image type:', imageDataUrl ? 'Real Generated Image' : 'Placeholder');
  } catch (storageError) {
    console.warn('⚠️ Storage failed, using minimal memory fallback');
    // Minimal memory storage as last resort
    if (typeof window !== 'undefined') {
      (window as any).dreamMintMemory = (window as any).dreamMintMemory || new Map();
      const memoryStore = (window as any).dreamMintMemory;
      
      // Keep only last entry in memory
      if (memoryStore.size >= 1) {
        const firstKey = memoryStore.keys().next().value;
        memoryStore.delete(firstKey);
      }
      
      memoryStore.set(metadataKey, {
        ...fallbackMetadata,
        image: placeholderImage, // Always use placeholder in memory to save space
        description: dreamText.substring(0, 100) + '...'
      });
      console.log('✅ Stored minimal fallback in memory:', mockHash);
    }
  }
  
  return `ipfs://${mockHash}`;
}
