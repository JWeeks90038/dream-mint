import { useState, useEffect } from 'react';
import { ethers, parseEther } from 'ethers';
import { getDreamMintContract } from './blockchain/dreammint';
import { uploadDreamToIPFS } from './blockchain/ipfs-pinata';
import { DreamGallery, fetchUserDreamNFTs } from './components/DreamGallery';
import { PaymentManager } from './components/PaymentManager';
import { paymentService, type PaymentMethod, PRICING } from './services/PaymentService';
import DreamJournal from './components/DreamJournal';
import DreamVisualizer from './components/DreamVisualizer';
import DreamRemixer from './components/DreamRemixer';
import DreamGamification from './components/DreamGamification';
import './App.css';
import './dream-surreal.css';
import dreamMoon from './assets/dream-moon.png';

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [dream, setDream] = useState('');
  const [mood, setMood] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [minting, setMinting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Remixing state
  const [remixing, setRemixing] = useState(false);
  const [userNFTs, setUserNFTs] = useState<any[]>([]);
  // OpenSea modal state
  const [openSeaModalOpen, setOpenSeaModalOpen] = useState(false);
  const [lastMintedTokenId, setLastMintedTokenId] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<string>('unknown');
  // Payment states
  const [showPaymentManager, setShowPaymentManager] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentAction, setPaymentAction] = useState<'image' | 'mint' | null>(null);
  // FAQ modal state
  const [showFAQ, setShowFAQ] = useState(false);

  useEffect(() => {
    async function loadNFTs() {
      if (account) {
        setUserNFTs(await fetchUserDreamNFTs(account));
        // Load default payment method
        const defaultMethod = await paymentService.getDefaultPaymentMethod(account);
        setDefaultPaymentMethod(defaultMethod);
        // Update ETH pricing
        await paymentService.updateEthPricing();
      }
    }
    loadNFTs();
  }, [account, txHash]);

  async function connectWallet() {
    if (!(window as any).ethereum) {
      setError('MetaMask is required.');
      return;
    }
    try {
      const [selected] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(selected);
      setError(null);
      
      // Check if we're on the correct network and update current network state
      await checkNetwork();
    } catch (err) {
      setError('Wallet connection failed.');
    }
  }

  async function checkNetwork() {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId === 137n) {
        // Polygon Mainnet - Production network
        setCurrentNetwork('polygon');
        setError(null);
        console.log('Connected to Polygon Mainnet - Ready for minting!');
      } else {
        // Any other network (including Hardhat local)
        setCurrentNetwork('other');
        setError(`❌ Unsupported network: ${network.name} (Chain ID: ${network.chainId}). DreamMint requires Polygon network for minting. Please switch networks.`);
        
        // Automatically offer to switch to Polygon Mainnet
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }], // 137 in hex (Polygon Mainnet)
          });
          // Re-check after switching
          setTimeout(checkNetwork, 1000);
        } catch (switchError: any) {
          console.log('Failed to auto-switch to Polygon Mainnet:', switchError);
          setError(`❌ Please manually switch to the Polygon network in MetaMask. Current network: ${network.name}`);
        }
      }
    } catch (err) {
      console.error('Network check failed:', err);
      setCurrentNetwork('unknown');
      setError('❌ Failed to detect network. Please ensure MetaMask is connected and switch to the Polygon network.');
    }
  }

  async function generateAIImage() {
    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }

    // Check if user has a default payment method
    if (!defaultPaymentMethod) {
      setPaymentAction('image');
      setShowPaymentManager(true);
      return;
    }

    setGenerating(true);
    setError(null);
    setAiImageUrl(null);
    
    try {
      // Process payment first
      console.log('Processing payment for image generation...');
      const paymentResult = await paymentService.processImageGenerationPayment(
        account,
        defaultPaymentMethod,
        dream
      );

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      console.log('Payment successful, generating image...');
      
      const res = await fetch('http://localhost:5001/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: dream })
      });
      if (!res.ok) throw new Error('Image generation failed');
      const data = await res.json();
      
      // Convert to proxy URL to avoid CORS issues when displaying/fetching
      let displayUrl = data.imageUrl;
      if (data.imageUrl && (
          data.imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net') || 
          data.imageUrl.includes('dall-e') || 
          (data.imageUrl.startsWith('https://') && !data.imageUrl.includes('localhost'))
        )) {
        displayUrl = `http://localhost:5001/api/proxy-image?url=${encodeURIComponent(data.imageUrl)}`;
      }
      
      // Store the original URL globally for IPFS metadata
      (globalThis as any).lastGeneratedImageUrl = displayUrl;
      
      setAiImageUrl(displayUrl);
    } catch (err: any) {
      setError(err.message || 'Image generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function mintDream() {
    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!aiImageUrl) {
      setError('Please generate an image first.');
      return;
    }

    // Check if user has a default payment method
    if (!defaultPaymentMethod) {
      setPaymentAction('mint');
      setShowPaymentManager(true);
      return;
    }

    setMinting(true);
    setError(null);
    setTxHash(null);
    
    try {
      console.log("Starting mint process...");
      
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      console.log("🌐 Current network:", network.name, "Chain ID:", network.chainId);
      
      // ONLY allow Polygon Mainnet for minting
      if (network.chainId !== 137n) {
        throw new Error(`❌ DreamMint requires Polygon Mainnet. Please switch to Polygon Mainnet (Chain ID: 137). Current network: ${network.name} (${network.chainId})`);
      }
      
      console.log("✅ Minting on Polygon Mainnet - Ready for OpenSea!");
      
      // Process payment first
      console.log('Processing payment for NFT minting...');
      const paymentResult = await paymentService.processNFTMintingPayment(
        account,
        defaultPaymentMethod,
        dream,
        aiImageUrl
      );

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      console.log('Payment successful, proceeding with minting...');
      
      const signer = await provider.getSigner();
      console.log("Signer created successfully");
      
      const contract = await getDreamMintContract(signer);
      console.log("Contract object:", contract);
      console.log("Contract address:", contract.target);
      
      if (!contract.target) {
        throw new Error("Contract address is null or undefined");
      }
      
      console.log("Contract created, processing image...");
      
      // Fetch the image as a Blob and upload to IPFS
      let imageFile: File | undefined = undefined;
      if (aiImageUrl) {
        try {
          // The aiImageUrl is already processed to use proxy if needed
          const imgRes = await fetch(aiImageUrl);
          if (!imgRes.ok) {
            throw new Error(`Failed to fetch image: ${imgRes.status}`);
          }
          const blob = await imgRes.blob();
          imageFile = new File([blob], 'dream.png', { type: blob.type || 'image/png' });
          console.log("Image file created:", imageFile.size, "bytes");
        } catch (imageError) {
          console.error('Error fetching image:', imageError);
          setError('Failed to fetch image for minting. Please try generating the image again.');
          return;
        }
      }
      
      console.log("Uploading to IPFS...");
      console.log('Attempting Web3.Storage upload with fallback...');
      const ipfsUri = await uploadDreamToIPFS({ dreamText: dream, imageFile, mood, category, keywords });
      
      console.log("IPFS URI:", ipfsUri);
      
      console.log("Calling contract mintDream...");
      const mintFeeEth = "0.001"; // Fixed mint fee for blockchain
      console.log("Mint fee:", mintFeeEth, "ETH");
      console.log("Parameters:", { to: account, tokenURI: ipfsUri, value: parseEther(mintFeeEth) });
      
      try {
        console.log("⏳ Sending transaction...");
        const tx = await contract.mintDream(account, ipfsUri, { value: parseEther(mintFeeEth) });
        console.log("✅ Transaction sent:", tx.hash);
        
        console.log("⏳ Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed:", receipt);
        
        setTxHash(receipt.hash);
        // After successful minting, show OpenSea link modal
        const tokenId = receipt.logs?.[0]?.topics?.[3]; // Updated for newer ethers
        setLastMintedTokenId(tokenId);
        setOpenSeaModalOpen(true);
        
        console.log("🎉 NFT successfully minted! Token ID:", tokenId);
      } catch (txError: any) {
        console.error("❌ Transaction failed:", txError);
        throw new Error(`Minting failed: ${txError?.message || txError}`);
      }
    } catch (err: any) {
      console.error("Minting error:", err);
      setError(`Minting failed: ${err.message || err.toString()}`);
    } finally {
      setMinting(false);
    }
  }

  async function handleRemix(parent1: number, parent2: number, newDream: string) {
    setRemixing(true);
    setError(null);
    try {
      // Generate AI image for remixed dream
      const res = await fetch('http://localhost:5001/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: newDream })
      });
      if (!res.ok) throw new Error('Image generation failed');
      const data = await res.json();
      let imageFile;
      if (data.imageUrl) {
        try {
          // Use our backend proxy to avoid CORS issues
          let fetchUrl = data.imageUrl;
          if (data.imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net') || 
              data.imageUrl.includes('dall-e') || 
              (data.imageUrl.startsWith('https://') && !data.imageUrl.includes('localhost'))) {
            fetchUrl = `http://localhost:5001/api/proxy-image?url=${encodeURIComponent(data.imageUrl)}`;
          }
          
          const imgRes = await fetch(fetchUrl);
          if (!imgRes.ok) {
            throw new Error(`Failed to fetch image: ${imgRes.status}`);
          }
          const blob = await imgRes.blob();
          imageFile = new File([blob], 'remix.png', { type: blob.type || 'image/png' });
        } catch (imageError) {
          console.error('Error fetching remix image:', imageError);
          throw new Error('Failed to fetch image for remix. Please try again.');
        }
      }
      const ipfsUri = await uploadDreamToIPFS({ dreamText: newDream, imageFile });
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = await getDreamMintContract(signer);
      const tx = await contract.remixDreams(account, parent1, parent2, ipfsUri);
      await tx.wait();
      setTxHash(tx.hash);
    } catch (err: any) {
      setError(err.message || 'Remix failed.');
    } finally {
      setRemixing(false);
    }
  }

  async function handlePaymentMethodSelected(method: PaymentMethod) {
    setDefaultPaymentMethod(method);
    setShowPaymentManager(false);
    
    // Execute the pending action
    if (paymentAction === 'image') {
      await generateAIImage();
    } else if (paymentAction === 'mint') {
      await mintDream();
    }
    setPaymentAction(null);
  }

return (
  <div className="dream-app-bg dream-surreal-bg">
    {/* Surreal Dream Moon Atmosphere */}
    <div className="dream-moon-container">
      <img src={dreamMoon} alt="Dream Moon" className="dream-moon-img" />
      <div className="dream-moon-glow"></div>
    </div>
    <div className="dream-card dream-glass">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="dream-title dream-surreal-title">🌙 DreamMint DApp</h1>
        <button
          onClick={() => setShowFAQ(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            border: '1px solid rgba(52, 152, 219, 0.4)',
            borderRadius: '20px',
            color: '#3498db',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
          }}
        >
          ❓ How it Works
        </button>
      </div>



      {/* Dream Input Section */}
      <div style={{ marginTop: '16px' }}>
        <button className="dream-wallet-btn" onClick={connectWallet} disabled={!!account}>
          {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
        </button>
        {error && (
          <div
            style={{
              color: '#ff6b6b',
              background: 'rgba(255, 107, 107, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              margin: '16px 0',
              border: '1px solid rgba(255, 107, 107, 0.3)',
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Payment Method Info */}
      <div
        style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          margin: '16px 0',
          fontSize: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div>
            <strong>💳 Payment Method:</strong>{' '}
            {defaultPaymentMethod ? (
              defaultPaymentMethod.type === 'crypto' ? (
                '🔗 Ethereum Wallet'
              ) : (
                `💳 •••• ${defaultPaymentMethod.last4}`
              )
            ) : (
              'None selected'
            )}
          </div>
          <button
            onClick={() => {
              if (!account) {
                setError('Please connect your wallet first to manage payment methods.');
                return;
              }
              setShowPaymentManager(true);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            💳 Payment Settings
          </button>
        </div>
        {defaultPaymentMethod ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#2E7D32',
            }}
          >
            <span>✅ Default Payment:</span>
            {defaultPaymentMethod.type === 'crypto' ? (
              <span>
                🔗 Ethereum Wallet (
                {defaultPaymentMethod.cryptoAddress?.slice(0, 6)}...
                {defaultPaymentMethod.cryptoAddress?.slice(-4)})
              </span>
            ) : (
              <span>
                💳 {defaultPaymentMethod.brand?.toUpperCase()} •••• {defaultPaymentMethod.last4}
              </span>
            )}
          </div>
        ) : (
          <div style={{ color: '#FF5722' }}>
            ⚠️ No payment method selected. Click "Payment Settings" to add one.
          </div>
        )}
      </div>

      {/* Dream Journal Section */}
      <DreamJournal
        dreamText={dream}
        setDreamText={setDream}
        mood={mood}
        setMood={setMood}
        category={category}
        setCategory={setCategory}
        keywords={keywords}
        setKeywords={setKeywords}
      />

      {/* Action Buttons */}
      <button
        className="dream-action-btn"
        onClick={generateAIImage}
        disabled={!dream || generating}
        style={{ marginTop: 16 }}
      >
        {generating ? 'Generating Image...' : `🎨 Generate Dream Image ($${PRICING.imageGeneration.usd})`}
      </button>

      <button
        className="dream-action-btn"
        onClick={mintDream}
        disabled={!dream || minting || !aiImageUrl}
        style={{ marginTop: 16 }}
      >
        {minting ? 'Minting NFT...' : `🌙 Mint Dream as NFT ($${PRICING.nftMinting.usd})`}
      </button>

      <DreamVisualizer imageUrl={aiImageUrl} loading={generating} error={error} />

      {txHash && (
        <p style={{ marginTop: 12 }}>
          Dream minted! Tx:{' '}
          <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            {txHash}
          </a>
        </p>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>

    <div className="dream-card">
      <DreamRemixer nfts={userNFTs} onRemix={handleRemix} remixing={remixing} />
    </div>

    <DreamGamification nfts={userNFTs} />

    <div className="dream-gallery-section">
      {account && <DreamGallery account={account} currentNetwork={currentNetwork} key={txHash || 'default'} />}
    </div>

    {/* Success Modal */}
    {openSeaModalOpen && lastMintedTokenId && (
      <div className="modal">
        <div className="modal-content">
          <h2>🎉 Mint Successful!</h2>
          <p>Your dream NFT has been minted on Polygon and is OpenSea-ready!</p>
          <div style={{ margin: '16px 0', padding: '12px', backgroundColor: '#e6f3ff', borderRadius: '8px' }}>
            <p><strong>Token ID:</strong> {parseInt(lastMintedTokenId, 16)}</p>
            <p><strong>Network:</strong> Polygon</p>
            <p><strong>Contract:</strong> 0x1b0b5e6c2787C11747dC0e90BD76028674b7209B</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '16px 0' }}>
            <a 
              href={`https://opensea.io/assets/matic/${process.env.VITE_CONTRACT_ADDRESS || '0xYourContractAddress'}/${parseInt(lastMintedTokenId, 16)}`}
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#2081E2', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >
              🌊 View on OpenSea
            </a>
            <a 
              href={`https://polygonscan.com/token/${process.env.VITE_CONTRACT_ADDRESS || '0xYourContractAddress'}?a=${parseInt(lastMintedTokenId, 16)}`}
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#627EEA', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >
              🔍 View on Etherscan
            </a>
          </div>
          <p style={{ fontSize: '14px', color: '#666' }}>
            🎯 Your NFT is now live on OpenSea! You can view, share, and list it for sale.
            The image and metadata use IPFS storage with fallback.
          </p>
          <button 
            onClick={() => setOpenSeaModalOpen(false)}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              marginTop: '12px'
            }}
          >
            ✅ Awesome!
          </button>
        </div>
      </div>
    )}

    {/* FAQ Modal */}
    {showFAQ && (
      <div className="modal">
        <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>❓ How DreamMint Works</h2>
            <button 
              onClick={() => setShowFAQ(false)}
              style={{ 
                background: 'none', 
                border: 'none', 
                fontSize: '24px', 
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ textAlign: 'left', lineHeight: '1.6' }}>
            
            <h3 style={{ color: '#4CAF50', marginTop: '20px' }}>🔗 Getting Started</h3>
            <p><strong>1. Connect MetaMask:</strong> Required for all users to receive NFTs. Your wallet address is where your NFT will be delivered.</p>
            <p><strong>2. Connect to Polygon:</strong> DreamMint works on Polygon network for fast, low-cost NFT minting.</p>
            <p><strong>3. Choose Payment Method:</strong> Select how you want to pay for services in "Payment Settings".</p>

            <h3 style={{ color: '#2196F3', marginTop: '20px' }}>💳 Payment Options</h3>
            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', margin: '10px 0' }}>
              <p><strong>🔗 Ethereum Wallet (Crypto):</strong></p>
              <ul>
                <li>Pay service fees ($0.69 image, $1.99 minting) in ETH from your wallet</li>
                <li>Plus blockchain gas fees (≈0.001 ETH) for minting</li>
                <li>All payments from your MetaMask wallet</li>
              </ul>
              
              <p style={{ marginTop: '15px' }}><strong>💳 Credit/Debit Card (Stripe):</strong></p>
              <ul>
                <li>Pay service fees ($0.69 image, $1.99 minting) with your card</li>
                <li>Still need ETH in wallet for gas fees (≈0.001 ETH)</li>
                <li>Cards processed securely through Stripe</li>
              </ul>
            </div>

            <h3 style={{ color: '#FF9800', marginTop: '20px' }}>⛽ Understanding Gas Fees</h3>
            <p><strong>Gas fees</strong> are required by the Ethereum network for ALL blockchain transactions. They go to network validators, not to DreamMint.</p>
            <ul>
              <li><strong>What:</strong> Small ETH payment (≈0.001 ETH = ~$3) to miners</li>
              <li><strong>Why:</strong> Secures your NFT on the blockchain permanently</li>
              <li><strong>When:</strong> Only when minting NFTs (not for image generation)</li>
              <li><strong>Payment:</strong> Always paid in ETH from your wallet</li>
            </ul>

            <h3 style={{ color: '#9C27B0', marginTop: '20px' }}>🎨 The Process</h3>
            <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
              <p><strong>Step 1 - Generate Image ($0.69):</strong></p>
              <ul>
                <li>Write your dream in the journal</li>
                <li>AI creates unique artwork from your dream</li>
                <li>Pay via your chosen payment method</li>
                <li>No gas fees required</li>
              </ul>
              
              <p style={{ marginTop: '15px' }}><strong>Step 2 - Mint NFT ($1.99 + gas):</strong></p>
              <ul>
                <li>Uploads image & metadata to IPFS (permanent storage)</li>
                <li>Creates NFT on Polygon blockchain</li>
                <li>Pay service fee via chosen method + gas fee in MATIC</li>
                <li>NFT appears in your wallet & on OpenSea</li>
              </ul>
            </div>

            <h3 style={{ color: '#8B5CF6', marginTop: '20px' }}>💜 Why Polygon?</h3>
            <ul>
              <li><strong>Lightning Fast:</strong> 2-second transaction confirmations</li>
              <li><strong>Ultra Low Fees:</strong> ~99% cheaper than Ethereum (~$0.01 vs $10+)</li>
              <li><strong>Eco-Friendly:</strong> Carbon neutral blockchain</li>
              <li><strong>OpenSea Compatible:</strong> Full marketplace support</li>
              <li><strong>Ethereum Security:</strong> Secured by Ethereum mainnet</li>
            </ul>

            <h3 style={{ color: '#2ECC71', marginTop: '20px' }}>🔒 Security & Privacy</h3>
            <ul>
              <li><strong>Your Data:</strong> Only dream text and wallet address stored</li>
              <li><strong>NFT Ownership:</strong> You own your NFTs permanently</li>
              <li><strong>Secure Payments:</strong> Industry-standard encryption and security</li>
              <li><strong>Decentralized Storage:</strong> Images stored on IPFS, not our servers</li>
            </ul>

            <div style={{ 
              background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(33, 150, 243, 0.1))', 
              padding: '15px', 
              borderRadius: '8px', 
              marginTop: '20px',
              textAlign: 'center'
            }}>
              <p><strong>🎯 Result:</strong> Your dream becomes a unique, tradeable NFT on OpenSea!</p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Payment Manager Modal */}
    {showPaymentManager && (
      <div>
        {account ? (
          <PaymentManager
            account={account}
            onPaymentMethodSelected={handlePaymentMethodSelected}
            onClose={() => {
              setShowPaymentManager(false);
              setPaymentAction(null);
            }}
          />
        ) : (
          <div className="modal">
            <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
              <h2>💳 Payment Settings</h2>
              <p>Please connect your wallet first to manage payment methods.</p>
              <button
                onClick={() => setShowPaymentManager(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginTop: '16px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);
}

export default App;
