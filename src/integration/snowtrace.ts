/**
 * Snowtrace Integration for HTP
 * Avalanche block explorer verification and analytics
 */

interface SnowtraceConfig {
  apiKey?: string;  // Optional for higher rate limits
  network: 'fuji' | 'mainnet';
}

interface VerificationResult {
  verified: boolean;
  blockNumber: number;
  timestamp: string;
  gasUsed: string;
  gasPrice: string;
  status: 'success' | 'failed';
  explorerUrl: string;
}

export class SnowtraceVerifier {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: SnowtraceConfig) {
    this.baseUrl = config.network === 'fuji'
      ? 'https://api-testnet.snowtrace.io/api'
      : 'https://api.snowtrace.io/api';
    this.apiKey = config.apiKey;
  }

  /**
   * Verify a transaction on Snowtrace
   */
  async verifyTransaction(txHash: string): Promise<VerificationResult> {
    const params = new URLSearchParams({
      module: 'transaction',
      action: 'gettxreceiptstatus',
      txhash: txHash,
      ...(this.apiKey && { apikey: this.apiKey })
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    const data = await response.json();

    if (data.status !== '1') {
      throw new Error(`Snowtrace error: ${data.message}`);
    }

    const status = data.result.status === '1' ? 'success' : 'failed';

    // Get full transaction details
    const txDetails = await this.getTransactionDetails(txHash);

    return {
      verified: status === 'success',
      blockNumber: txDetails.blockNumber,
      timestamp: txDetails.timestamp,
      gasUsed: txDetails.gasUsed,
      gasPrice: txDetails.gasPrice,
      status,
      explorerUrl: this.getExplorerUrl(txHash)
    };
  }

  /**
   * Get detailed transaction info
   */
  private async getTransactionDetails(txHash: string): Promise<any> {
    const params = new URLSearchParams({
      module: 'proxy',
      action: 'eth_getTransactionReceipt',
      txhash: txHash,
      ...(this.apiKey && { apikey: this.apiKey })
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    const data = await response.json();
    
    return {
      blockNumber: parseInt(data.result.blockNumber, 16),
      gasUsed: parseInt(data.result.gasUsed, 16).toString(),
      timestamp: new Date().toISOString() // Would fetch from block in production
    };
  }

  /**
   * Get human-readable explorer URL
   */
  getExplorerUrl(txHash: string): string {
    const base = this.baseUrl.includes('testnet')
      ? 'https://testnet.snowtrace.io'
      : 'https://snowtrace.io';
    return `${base}/tx/${txHash}`;
  }

  /**
   * Get contract source verification status
   */
  async isContractVerified(address: string): Promise<boolean> {
    const params = new URLSearchParams({
      module: 'contract',
      action: 'getabi',
      address: address,
      ...(this.apiKey && { apikey: this.apiKey })
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    const data = await response.json();
    
    return data.status === '1' && data.result !== 'Contract source code not verified';
  }

  /**
   * Get gas usage statistics for Retro9000 tracking
   */
  async getGasStats(contractAddress: string, days: number = 30): Promise<{
    totalGasUsed: string;
    totalTx: number;
    avgGasPerTx: string;
  }> {
    // This would use Snowtrace API to get historical gas usage
    // Placeholder for actual implementation
    return {
      totalGasUsed: '0',
      totalTx: 0,
      avgGasPerTx: '0'
    };
  }
}
