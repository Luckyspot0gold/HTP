/**
 * Core Wallet Integration for HTP
 * Enables x402 payments via Avalanche's official wallet
 */

import { ethers } from 'ethers';

interface CoreWalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string;
}

export class CoreWalletIntegration {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  /**
   * Check if Core Wallet is installed
   */
  isInstalled(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).ethereum?.isCoreWallet === true;
  }

  /**
   * Connect to Core Wallet
   */
  async connect(): Promise<CoreWalletState> {
    if (!this.isInstalled()) {
      throw new Error('Core Wallet not installed. Please install from core.app');
    }

    // Request account access
    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts'
    });

    this.provider = new ethers.BrowserProvider((window as any).ethereum);
    this.signer = await this.provider.getSigner();

    const network = await this.provider.getNetwork();
    const balance = await this.provider.getBalance(accounts[0]);

    return {
      connected: true,
      address: accounts[0],
      chainId: Number(network.chainId),
      balance: ethers.formatEther(balance)
    };
  }

  /**
   * Switch to Avalanche Fuji Testnet (for testing)
   * or C-Chain Mainnet (for production)
   */
  async switchNetwork(network: 'fuji' | 'mainnet'): Promise<void> {
    const chainId = network === 'fuji' ? '0xa869' : '0xa86a'; // 43113 or 43114
    
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await this.addNetwork(network);
      }
    }
  }

  /**
   * Add Avalanche network to Core Wallet
   */
  async addNetwork(network: 'fuji' | 'mainnet'): Promise<void> {
    const config = network === 'fuji' ? {
      chainId: '0xa869',
      chainName: 'Avalanche Fuji Testnet',
      nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
      rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
      blockExplorerUrls: ['https://testnet.snowtrace.io/']
    } : {
      chainId: '0xa86a',
      chainName: 'Avalanche C-Chain',
      nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
      rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
      blockExplorerUrls: ['https://snowtrace.io/']
    };

    await (window as any).ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [config]
    });
  }

  /**
   * Sign x402 payment for HTP API access
   */
  async signX402Payment(
    amount: string,  // In AVAX
    recipient: string
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const tx = {
      to: recipient,
      value: ethers.parseEther(amount),
      data: '0x', // x402 identifier could go here
    };

    const signedTx = await this.signer.sendTransaction(tx);
    await signedTx.wait();
    
    return signedTx.hash;
  }

  /**
   * Get USDC.e balance (for x402 stablecoin payments)
   */
  async getUSDCBalance(): Promise<string> {
    if (!this.provider || !this.signer) {
      throw new Error('Wallet not connected');
    }

    const address = await this.signer.getAddress();
    
    // USDC.e contract on Avalanche
    const USDC_ADDRESS = '0xB97EF9Ef8734C71904D8006F4b8b4B8f8f8f8f8f'; // Replace with real address
    
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      this.provider
    );

    const balance = await usdcContract.balanceOf(address);
    return ethers.formatUnits(balance, 6); // USDC has 6 decimals
  }

  /**
   * Listen for account changes
   */
  onAccountChange(callback: (accounts: string[]) => void): void {
    (window as any).ethereum?.on('accountsChanged', callback);
  }

  /**
   * Listen for chain changes
   */
  onChainChange(callback: (chainId: string) => void): void {
    (window as any).ethereum?.on('chainChanged', callback);
  }
}
