import { ethers, parseEther } from 'ethers';
import { environment } from '../config/environment';

export interface PaymentMethod {
  id: string;
  type: 'crypto' | 'stripe';
  cryptoAddress?: string;
  stripePaymentMethodId?: string;
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

export interface PricingConfig {
  imageGeneration: {
    usd: number;  // $0.69
    eth: string;  // ETH equivalent
  };
  nftMinting: {
    usd: number;  // $1.99
    eth: string;  // ETH equivalent
  };
}

export const PRICING: PricingConfig = {
  imageGeneration: {
    usd: 0.69,
    eth: "0.0003" // Approximate ETH equivalent, should be dynamic based on current rates
  },
  nftMinting: {
    usd: 1.99,
    eth: "0.0008" // Approximate ETH equivalent, should be dynamic based on current rates
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
        return await this.processCryptoPayment(
          account, 
          PRICING.imageGeneration.eth,
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
        return await this.processCryptoPayment(
          account,
          PRICING.nftMinting.eth,
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

  private async processCryptoPayment(
    account: string,
    ethAmount: string,
    serviceType: string,
    metadata: any
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Get the payment receiver address (could be your business wallet)
      const PAYMENT_RECEIVER = "0x742d35Cc6634C0532925a3b8D4ff2A4C7EC4fF1f"; // Replace with your actual payment address
      
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      // Create payment transaction
      const tx = await signer.sendTransaction({
        to: PAYMENT_RECEIVER,
        value: parseEther(ethAmount)
      });
      
      console.log(`Crypto payment sent: ${tx.hash}`);
      
      // Wait for confirmation
      await tx.wait();
      
      // Log payment for business records
      await this.logPayment({
        account,
        paymentMethod: 'crypto',
        amount: ethAmount,
        currency: 'ETH',
        serviceType,
        transactionId: tx.hash,
        metadata
      });
      
      return { success: true, transactionId: tx.hash };
    } catch (error) {
      console.error('Crypto payment failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Crypto payment failed' };
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
      await fetch('http://localhost:5001/api/log-payment', {
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

  async updateEthPricing(): Promise<void> {
    try {
      // Fetch current ETH/USD rate and update pricing
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      const ethPrice = data.ethereum.usd;
      
      // Update ETH equivalent prices
      PRICING.imageGeneration.eth = (PRICING.imageGeneration.usd / ethPrice).toFixed(6);
      PRICING.nftMinting.eth = (PRICING.nftMinting.usd / ethPrice).toFixed(6);
      
      console.log('Updated ETH pricing:', PRICING);
    } catch (error) {
      console.error('Error updating ETH pricing:', error);
      // Keep default values if API fails
    }
  }
}

export const paymentService = PaymentService.getInstance();
