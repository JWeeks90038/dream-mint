import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './polyfills' // Import polyfills first
import './index.css'
import App from './SolanaApp'

// Import required CSS for Solana wallet adapter
import '@solana/wallet-adapter-react-ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
