/**
 * HTP API Server
 * Full stack: Truth → Verification → Translation → Monetization
 */

import express from 'express';
import cors from 'cors';
import { TruthEngine } from '../protocol/consensus/truthEngine';
import { HarmonicMapper } from '../sensory/translation/harmonicMapper';
import { AudioGenerator } from '../sensory/audio/generator';
import { X402Middleware } from '../integration/x402Middleware';
import { AvalancheVerifier } from '../integration/avalancheVerifier';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize components
const truthEngine = new TruthEngine([
  { name: 'coinbase', url: 'https://api.coinbase.com/v2/exchange-rates', weight: 1 },
  { name: 'kraken', url: 'https://api.kraken.com/0/public/Ticker', weight: 1 }
]);

const mapper = new HarmonicMapper();
const audioGen = new AudioGenerator();
const avaxVerifier = new AvalancheVerifier();

// x402 Payment Middleware
const x402 = new X402Middleware({
  amount: "0.001",           // $0.001 USDC per request
  chain: "avalanche",
  recipient: "0xYourWalletAddress", // Your AVAX C-Chain address
  description: "Verified market truth + harmonic parameters"
});

// ═══════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (Free, delayed, unsigned)
// ═══════════════════════════════════════════════════════════

app.get('/api/delayed/:asset', async (req, res) => {
  /**
   * Free tier: 15-minute delayed, unsigned data
   * For testing and development
   */
  try {
    const asset = req.params.asset;
    // Would fetch from cache in production
    res.json({
      asset,
      price: 45000, // Example
      delay: '15 minutes',
      verified: false,
      note: 'Use /api/truth/:asset for real-time verified data (x402 payment required)'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// PAID ENDPOINTS (x402 required, real-time, verified)
// ═══════════════════════════════════════════════════════════

app.get('/api/truth/:asset', x402.middleware(), async (req, res) => {
  /**
   * Premium tier: Real-time, verified, on-chain attested
   * Requires x402 payment
   */
  try {
    const asset = req.params.asset;
    const payment = (req as any).payment;
    
    // Layer 1: Acquire truth
    const truth = await truthEngine.acquire_truth(asset);
    
    // Layer 2: Submit to Avalanche for verification
    const txHash = await avaxVerifier.submitVerifiedState(truth);
    
    // Layer 3: Translate to sensory
    const audioParams = mapper.map_market_state(truth);
    
    // Generate audio
    const audio = audioGen.generate(audioParams, 30);
    const audioBase64 = audioGen.toBase64(audio);
    
    res.json({
      asset,
      truth: {
        price: truth.verified_price,
        confidence: truth.confidence,
        timestamp: truth.timestamp,
        consensus_hash: truth.consensus_hash,
        sources: truth.sources.map(s => ({ name: s.name, price: s.price }))
      },
      avalanche: {
        verified: true,
        transaction_hash: txHash,
        explorer_url: `https://snowtrace.io/tx/${txHash}`
      },
      sensory: {
        audio_params: audioParams,
        audio_base64: audioBase64,
        haptic_pattern: generateHapticPattern(truth)
      },
      payment: {
        tx: payment.txHash,
        amount: payment.amount,
        message: 'Thank you for supporting verified market infrastructure'
      }
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// WEBSOCKET: Real-time streams (x402 subscription)
// ═══════════════════════════════════════════════════════════

import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req) => {
  /**
   * WebSocket for real-time streams
   * Requires x402 subscription payment
   */
  const url = new URL(req.url || '', 'http://localhost');
  const asset = url.pathname.split('/').pop();
  
  ws.send(JSON.stringify({
    type: 'info',
    message: 'HTP Real-time Stream',
    asset,
    payment_required: '0.01 USDC per minute',
    payment_url: `https://x402.org/subscribe?asset=${asset}&rate=0.01`
  }));
  
  // Would verify subscription payment, then stream
});

// ═══════════════════════════════════════════════════════════
// STATS & HEALTH
// ═══════════════════════════════════════════════════════════

app.get('/api/stats', (req, res) => {
  res.json({
    protocol: 'HTP v1.0',
    payments: x402.getStats(),
    uptime: process.uptime(),
    avalanche: {
      network: 'C-Chain',
      contract: '0x...',
      total_verifications: 1234
    }
  });
});

app.listen(3000, () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     HARMONIC TRUTH PROTOCOL                            ║');
  console.log('║     Server running on http://localhost:3000            ║');
  console.log('║                                                        ║');
  console.log('║     Free tier:  /api/delayed/:asset                   ║');
  console.log('║     Paid tier:   /api/truth/:asset (x402 required)      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
});

function generateHapticPattern(truth: any): number[] {
  // Simple haptic pattern based on volatility
  return [100, 200, 100, 300]; // ms durations
}
