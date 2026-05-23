/**
 * Avalanche C-Chain Integration
 * Submits verified market states to HONESTVerifier contract
 */

import { ethers } from 'ethers';
import { TruthCertificate } from '../protocol/consensus/truthEngine';

// Contract ABI (minimal)
const HONEST_VERIFIER_ABI = [
  "function submitVerifiedState(bytes32 _consensusHash, string _asset, uint256 _price, uint256 _volume, uint256 _confidence) payable returns (bytes32)",
  "function verifyState(bytes32 _consensusHash) view returns (bool, tuple)",
  "event VerifiedStateSubmitted(bytes32 indexed consensusHash, string asset, uint256 price, uint256 confidence, uint256 timestamp, uint256 blockNumber, address indexed submitter)"
];

export class AvalancheVerifier {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private wallet: ethers.Wallet;
  
  // Fuji Testnet - update to mainnet for production
  private RPC_URL = 'https://api.avax-test.network/ext/bc/C/rpc';
  private CONTRACT_ADDRESS = '0xYourContractAddressHere';
  
  constructor(privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(this.RPC_URL);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(
      this.CONTRACT_ADDRESS,
      HONEST_VERIFIER_ABI,
      this.wallet
    );
  }
  
  /**
   * Submit verified truth to Avalanche C-Chain
   * Burns AVAX gas and creates permanent audit trail
   */
  async submitVerifiedState(truth: TruthCertificate): Promise<string> {
    try {
      // Convert price to uint256 (8 decimal places)
      const priceScaled = Math.round(truth.verified_price * 100000000);
      const volumeScaled = Math.round(truth.verified_volume);
      const confidenceBps = Math.round(truth.confidence * 10000); // 0-10000
      
      // Extract asset from first source name (e.g., "coinbase_btc" -> "BTC")
      const asset = this._extractAsset(truth.sources[0]?.name || 'unknown');
      
      // Convert consensus hash to bytes32
      const hashBytes32 = '0x' + truth.consensus_hash;
      
      console.log(`Submitting ${asset} verification to Avalanche...`);
      console.log(`  Price: $${truth.verified_price}`);
      console.log(`  Confidence: ${(truth.confidence * 100).toFixed(2)}%`);
      console.log(`  Hash: ${truth.consensus_hash.substring(0, 16)}...`);
      
      // Submit transaction with 0.001 AVAX fee
      const tx = await this.contract.submitVerifiedState(
        hashBytes32,
        asset,
        priceScaled,
        volumeScaled,
        confidenceBps,
        {
          value: ethers.parseEther('0.001'), // Burn AVAX
          gasLimit: 300000
        }
      );
      
      console.log(`  Transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation (2-3 seconds on Avalanche)
      const receipt = await tx.wait();
      console.log(`  ✅ Confirmed in block ${receipt?.blockNumber}`);
      console.log(`  Gas used: ${receipt?.gasUsed} units`);
      
      return tx.hash;
      
    } catch (error) {
      console.error('Avalanche submission failed:', error);
      throw error;
    }
  }
  
  /**
   * Verify that a state was attested on-chain
   */
  async verifyOnChain(consensusHash: string): Promise<{
    verified: boolean;
    timestamp: number;
    blockNumber: number;
  }> {
    try {
      const hashBytes32 = consensusHash.startsWith('0x') 
        ? consensusHash 
        : '0x' + consensusHash;
      
      const [exists, state] = await this.contract.verifyState(hashBytes32);
      
      return {
        verified: exists,
        timestamp: Number(state.timestamp),
        blockNumber: Number(state.blockNumber)
      };
      
    } catch (error) {
      console.error('Verification check failed:', error);
      return { verified: false, timestamp: 0, blockNumber: 0 };
    }
  }
  
  /**
   * Listen for verification events (for real-time indexing)
   */
  async listenForVerifications(callback: (event: any) => void) {
    this.contract.on('VerifiedStateSubmitted', (
      consensusHash,
      asset,
      price,
      confidence,
      timestamp,
      blockNumber,
      submitter
    ) => {
      callback({
        consensusHash,
        asset,
        price: Number(price) / 100000000, // Unscale
        confidence: Number(confidence) / 10000, // Basis points to decimal
        timestamp: Number(timestamp),
        blockNumber: Number(blockNumber),
        submitter
      });
    });
    
    console.log('👂 Listening for Avalanche verification events...');
  }
  
  /**
   * Get contract stats
   */
  async getStats(): Promise<{
    submissionCount: number;
    balance: string;
  }> {
    const count = await this.contract.submissionCount();
    const balance = await this.provider.getBalance(this.CONTRACT_ADDRESS);
    
    return {
      submissionCount: Number(count),
      balance: ethers.formatEther(balance)
    };
  }
  
  private _extractAsset(sourceName: string): string {
    // Extract asset from source name like "coinbase_btc"
    const parts = sourceName.split('_');
    return parts.length > 1 ? parts[1].toUpperCase() : 'UNKNOWN';
  }
}
