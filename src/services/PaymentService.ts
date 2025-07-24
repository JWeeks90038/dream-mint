import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { environment } from '../config/environment';
import { SOLANA_PRICING, solanaConfig } from '../config/solana';

export interface PaymentMethod {
  id: string;
  type: 'crypto' | 'stripe';
  cryptoAddress?: string; // Solana wallet address
  stripePaymentMethodId?: string;
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

export interface PricingConfig {
  imageGeneration: {
    usd: number;  // $0.99
    sol: number;  // SOL equivalent
  };
  nftMinting: {
    usd: number;  // $2.99
    sol: number;  // SOL equivalent
  };
}

export const PRICING: PricingConfig = {
  imageGeneration: {
    usd: 0.99,
    sol: SOLANA_PRICING.AI_IMAGE_GENERATION_SOL
  },
  nftMinting: {
    usd: 2.99,
    sol: SOLANA_PRICING.NFT_MINTING_SOL
  }
};

export class PaymentService {
  private static instance: PaymentService;
  
  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  async getDefaultPaymentMethod(account: string): Promise<PaymentMethod | null> {
    try {
      const savedMethods = localStorage.getItem(`payment_methods_${account}`);
      if (savedMethods) {
        const methods: PaymentMethod[] = JSON.parse(savedMethods);
        return methods.find(m => m.isDefault) || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting default payment method:', error);
      return null;
    }
  }

  async processImageGenerationPayment(
    account: string, 
    paymentMethod: PaymentMethod,
    dreamPrompt: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      if (paymentMethod.type === 'crypto') {
        return await this.processSolanaPayment(
          account, 
          PRICING.imageGeneration.sol,
          'image_generation',
          { dreamPrompt }
        );
      } else {
        return await this.processStripePayment(
          paymentMethod.stripePaymentMethodId!,
          PRICING.imageGeneration.usd,
          'image_generation',
          { account, dreamPrompt }
        );
      }
    } catch (error) {
      console.error('Error processing image generation payment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Payment failed' };
    }
  }

  async processNFTMintingPayment(
    account: string,
    paymentMethod: PaymentMethod,
    dreamText: string,
    imageUrl: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      if (paymentMethod.type === 'crypto') {
        return await this.processSolanaPayment(
          account,
          PRICING.nftMinting.sol,
          'nft_minting',
          { dreamText, imageUrl }
        );
      } else {
        return await this.processStripePayment(
          paymentMethod.stripePaymentMethodId!,
          PRICING.nftMinting.usd,
          'nft_minting',
          { account, dreamText, imageUrl }
        );
      }
    } catch (error) {
      console.error('Error processing NFT minting payment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Payment failed' };
    }
  }

  private async processSolanaPayment(
    account: string,
    solAmount: number,
    serviceType: string,
    metadata: any
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Get the payment receiver address (your business Solana wallet)
      const PAYMENT_RECEIVER = new PublicKey(
        import.meta.env.VITE_PAYMENT_RECEIVER_PUBKEY ||
        "DreamMintBusinessWalletAddressHere" // Replace with your actual Solana wallet
      );
      
      // Check if Phantom wallet is available
      if (!(window as any).solana || !(window as any).solana.isPhantom) {
        throw new Error('Phantom wallet not found! Please install Phantom wallet.');
      }

      const wallet = (window as any).solana;
      const userPublicKey = new PublicKey(wallet.publicKey.toString());
      
      // Create payment transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: PAYMENT_RECEIVER,
          lamports: solAmount * LAMPORTS_PER_SOL,
        })
      );

      // Get recent blockhash
      const { blockhash } = await solanaConfig.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;

      // Sign and send transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await solanaConfig.connection.sendRawTransaction(signedTransaction.serialize());
      
      console.log(`Solana payment sent: ${signature}`);
      
      // Poll for confirmation (up to 60s)
      const start = Date.now();
      let confirmed = false;
      let lastStatus = null;
      while (Date.now() - start < 60000) {
        const status = await solanaConfig.connection.getSignatureStatus(signature);
        lastStatus = status;
        if (status && status.value && (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized')) {
          confirmed = true;
          break;
        }
        await new Promise(res => setTimeout(res, 2000)); // poll every 2s
      }
      if (!confirmed) {
        if (lastStatus && lastStatus.value && lastStatus.value.err === null) {
          console.warn('Transaction confirmed after timeout:', signature);
        } else {
          throw new Error('Transaction was not confirmed in 60 seconds. It may have succeeded. Please check the transaction in Solana Explorer and retry image generation if needed.');
        }
      }
      
      // Log payment for business records
      await this.logPayment({
        account,
        paymentMethod: 'crypto',
        amount: solAmount.toString(),
        currency: 'SOL',
        serviceType,
        transactionId: signature,
        metadata
      });
      
      return { success: true, transactionId: signature };
    } catch (error) {
      console.error('Solana payment failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Solana payment failed' };
    }
  }

  private async processStripePayment(
    paymentMethodId: string,
    usdAmount: number,
    serviceType: string,
    metadata: any
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log(`💳 Processing ${environment.stripe.isLiveMode ? 'LIVE' : 'TEST'} Stripe payment:`, { 
        amount: usdAmount, 
        serviceType, 
        paymentMethodId 
      });

      const response = await fetch(`${environment.apiUrl}/api/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId,
          amount: Math.round(usdAmount * 100), // Convert to cents
          currency: 'usd',
          serviceType,
          metadata
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      // Log payment for business records
      await this.logPayment({
        account: metadata.account,
        paymentMethod: 'stripe',
        amount: usdAmount.toString(),
        currency: 'USD',
        serviceType,
        transactionId: result.paymentIntentId,
        metadata
      });

      return { success: true, transactionId: result.paymentIntentId };
    } catch (error) {
      console.error('Stripe payment failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Stripe payment failed' };
    }
  }

  private async logPayment(paymentData: any): Promise<void> {
    try {
      // Log to backend for business records
      await fetch(`${environment.apiUrl}/api/log-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentData,
          timestamp: new Date().toISOString()
        })
      });

      // Also store locally for user reference
      const paymentHistory = JSON.parse(localStorage.getItem(`payment_history_${paymentData.account}`) || '[]');
      paymentHistory.push({
        ...paymentData,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 50 payments locally
      if (paymentHistory.length > 50) {
        paymentHistory.splice(0, paymentHistory.length - 50);
      }
      
      localStorage.setItem(`payment_history_${paymentData.account}`, JSON.stringify(paymentHistory));
    } catch (error) {
      console.error('Error logging payment:', error);
      // Don't throw error as payment was successful
    }
  }

  async getPaymentHistory(account: string): Promise<any[]> {
    try {
      const history = localStorage.getItem(`payment_history_${account}`);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }

  async updateSolPricing(): Promise<void> {
    try {
      // Fetch current SOL/USD rate and update pricing
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      const solPrice = data.solana.usd;
      
      // Update SOL equivalent prices based on current rate
      PRICING.imageGeneration.sol = parseFloat((PRICING.imageGeneration.usd / solPrice).toFixed(6));
      PRICING.nftMinting.sol = parseFloat((PRICING.nftMinting.usd / solPrice).toFixed(6));
      
      console.log('Updated SOL pricing:', PRICING);
      console.log(`Current SOL price: $${solPrice}`);
    } catch (error) {
      console.error('Error updating SOL pricing:', error);
      // Keep default values if API fails
    }
  }

  // Utility functions for SOL amounts
  formatSOL(lamports: number): string {
    return (lamports / LAMPORTS_PER_SOL).toFixed(4);
  }

  formatSOLAmount(sol: number): string {
    return sol.toFixed(4);
  }

  // Check if user has sufficient SOL balance
  async checkSufficientBalance(userPublicKey: PublicKey, requiredSOL: number): Promise<{ sufficient: boolean; balance: number; required: number }> {
    try {
      const balance = await solanaConfig.connection.getBalance(userPublicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      const requiredWithBuffer = requiredSOL + 0.001; // Add small buffer for transaction fees
      
      return {
        sufficient: balanceSOL >= requiredWithBuffer,
        balance: balanceSOL,
        required: requiredWithBuffer
      };
    } catch (error) {
      console.error('Error checking balance:', error);
      return { sufficient: false, balance: 0, required: requiredSOL };
    }
  }
}

export const paymentService = PaymentService.getInstance();
