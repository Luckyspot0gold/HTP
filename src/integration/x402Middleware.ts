/**
 * HTP x402 Integration Layer
 * HTTP 402 Payment Required for verified market truth
 * 
 * Users pay small amounts (0.001 USDC) to access cryptographically
 * verified, multi-sensory market data.
 */

import { NextFunction, Request, Response } from 'express';
import { ethers } from 'ethers';

interface X402Config {
  amount: string;           // Amount in USDC (e.g., "0.001")
  chain: 'avalanche' | 'base' | 'ethereum';
  recipient: string;        // Your wallet address
  description: string;
}

interface PaymentVerification {
  valid: boolean;
  txHash?: string;
  payer?: string;
  amount?: string;
}

export class X402Middleware {
  private config: X402Config;
  private payments: Map<string, PaymentVerification>; // Cache valid payments

  constructor(config: X402Config) {
    this.config = config;
    this.payments = new Map();
  }

  /**
   * Express middleware - requires x402 payment for access
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const asset = req.params.asset;
      const paymentHeader = req.headers['x-payment-proof'];
      
      // Check if valid payment exists
      const cacheKey = `${paymentHeader}:${asset}`;
      const cached = this.payments.get(cacheKey);
      
      if (cached?.valid) {
        // Payment verified, attach to request
        (req as any).payment = cached;
        return next();
      }

      // No valid payment - return 402 Payment Required
      if (!paymentHeader) {
        return res.status(402).json({
          error: 'Payment Required',
          message: `Access to verified ${asset.toUpperCase()} market truth requires payment`,
          payment: {
            amount: this.config.amount,
            currency: 'USDC',
            chain: this.config.chain,
            recipient: this.config.recipient,
            description: this.config.description,
            // x402 compatible headers
            'x-payment-url': `https://x402.org/pay?amount=${this.config.amount}&chain=${this.config.chain}`,
            'x-payment-amount': this.config.amount,
            'x-payment-currency': 'USDC',
            'x-payment-recipient': this.config.recipient
          },
          alternatives: {
            free: `Use /api/delayed/${asset} for unverified, 15-min delayed data`,
            docs: 'https://htp.io/docs/monetization'
          }
        });
      }

      // Verify the payment
      try {
        const verification = await this.verifyPayment(paymentHeader as string);
        
        if (verification.valid) {
          this.payments.set(cacheKey, verification);
          (req as any).payment = verification;
          next();
        } else {
          res.status(402).json({ error: 'Invalid payment proof' });
        }
      } catch (err) {
        res.status(500).json({ error: 'Payment verification failed' });
      }
    };
  }

  /**
   * Verify x402 payment on-chain
   */
  private async verifyPayment(paymentProof: string): Promise<PaymentVerification> {
    // In production: verify against Avalanche C-Chain
    // For demo: simulate verification
    
    // Parse payment proof (would be signed transaction or receipt)
    // Verify on-chain that payment was made to recipient for correct amount
    
    // Example integration with Avalanche:
    /*
    const provider = new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
    const receipt = await provider.getTransactionReceipt(paymentProof);
    
    if (!receipt) return { valid: false };
    if (receipt.to !== this.config.recipient) return { valid: false };
    if (receipt.status !== 1) return { valid: false };
    */
    
    // Simulated for now
    return {
      valid: true,
      txHash: paymentProof,
      payer: '0x...',
      amount: this.config.amount
    };
  }

  /**
   * Get payment stats for dashboard
   */
  getStats() {
    const payments = Array.from(this.payments.values());
    return {
      totalPayments: payments.length,
      totalRevenue: payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0),
      uniquePayers: new Set(payments.map(p => p.payer)).size
    };
  }
}
