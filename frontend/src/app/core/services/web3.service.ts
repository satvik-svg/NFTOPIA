import { Injectable, computed, signal } from '@angular/core';
import { ethers } from 'ethers';
import { environment } from '../../../environments/environment';

interface ChainConfig {
  chainId: string;
  chainName: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface MintAgentInput {
  ownerAddress?: string;
  to?: string;
  agentType: number;
  specialization: string;
  skillScores: [number, number, number, number, number];
  metadataURI: string;
}

const AGENT_NFT_ABI: ethers.InterfaceAbi = [
  'function mintAgent(address to, uint8 _agentType, string _specialization, uint256[5] _initialSkills, string _metadataURI) returns (uint256)',
  'function getAgentDNA(uint256 tokenId) view returns ((uint8 agentType, string specialization, uint256[5] skillScores, uint256 level, uint256 totalEarnings, uint256 jobsCompleted, uint256 reputationScore, string[] traits, uint256 mintedAt, address tbaWallet))',
  'function getAgentsByOwner(address owner) view returns (uint256[])',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

const FORGE_TOKEN_ABI: ethers.InterfaceAbi = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const JOB_ESCROW_ABI: ethers.InterfaceAbi = [
  'function createJob(uint256 agentTokenId, address agentOwner, address agentTBAWallet, uint256 amount) returns (uint256)'
];

const RENTAL_MARKET_ABI: ethers.InterfaceAbi = [
  'function listForRent(uint256 tokenId, uint256 pricePerDay, uint256 maxDuration)',
  'function rent(uint256 tokenId, uint256 days_)'
];

@Injectable({ providedIn: 'root' })
export class Web3Service {
  private readonly _walletAddress = signal<string | null>(null);
  private readonly _isConnected = signal(false);
  private readonly _chainId = signal<number | null>(null);
  private readonly _provider = signal<ethers.BrowserProvider | null>(null);
  private readonly _signer = signal<ethers.Signer | null>(null);

  readonly walletAddress = this._walletAddress.asReadonly();
  readonly isConnected = this._isConnected.asReadonly();
  readonly chainId = this._chainId.asReadonly();

  readonly shortAddress = computed(() => {
    const addr = this._walletAddress();
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
  });

  readonly isCorrectChain = computed(() => this._chainId() === environment.helaChainId);

  private readonly contractAddresses = {
    agentNFT: environment.contracts.agentNFT,
    forgeToken: environment.contracts.forgeToken,
    erc6551Registry: environment.contracts.erc6551Registry,
    jobEscrow: environment.contracts.jobEscrow,
    rentalMarket: environment.contracts.rentalMarket
  };

  private readonly helaConfig: ChainConfig = {
    chainId: '0xA2D08',
    chainName: 'HeLa Testnet',
    rpcUrls: [environment.helaRpcUrl],
    blockExplorerUrls: [environment.helaExplorerUrl],
    nativeCurrency: { name: 'HLUSD', symbol: 'HLUSD', decimals: 18 }
  };

  constructor() {
    this.checkInitialConnection();
  }

  private async checkInitialConnection(): Promise<void> {
    const eth = (window as Window & { ethereum?: any }).ethereum;
    if (!eth) return;

    try {
      const provider = new ethers.BrowserProvider(eth);
      const accounts = await provider.send('eth_accounts', []) as string[];
      if (accounts && accounts.length > 0) {
        const signer = await provider.getSigner();
        const network = await provider.getNetwork();

        this._provider.set(provider);
        this._signer.set(signer);
        this._walletAddress.set(accounts[0]);
        this._chainId.set(Number(network.chainId));
        this._isConnected.set(true);

        // Re-attach listeners
        eth.on('accountsChanged', (changedAccounts: string[]) => {
          this._walletAddress.set(changedAccounts[0] || null);
          this._isConnected.set(changedAccounts.length > 0);
        });

        eth.on('chainChanged', (newChainId: string) => {
          this._chainId.set(parseInt(newChainId, 16));
        });
      }
    } catch (e) {
      // Silently fail if we can't restore connection
      console.warn('[Web3Service] Could not auto-restore wallet session:', e);
    }
  }

  async connectWallet(): Promise<string> {
    const eth = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown>; on: (event: string, callback: (...args: unknown[]) => void) => void } }).ethereum;

    if (!eth) {
      throw new Error('MetaMask not installed');
    }

    const provider = new ethers.BrowserProvider(eth as ethers.Eip1193Provider);
    const accounts = (await provider.send('eth_requestAccounts', [])) as string[];
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();

    this._provider.set(provider);
    this._signer.set(signer);
    this._walletAddress.set(accounts[0]);
    this._chainId.set(Number(network.chainId));
    this._isConnected.set(true);

    if (Number(network.chainId) !== environment.helaChainId) {
      await this.switchToHela();
    }

    eth.on('accountsChanged', (changedAccounts: unknown) => {
      const nextAccounts = changedAccounts as string[];
      this._walletAddress.set(nextAccounts[0] || null);
      this._isConnected.set(nextAccounts.length > 0);
    });

    eth.on('chainChanged', (newChainId: unknown) => {
      this._chainId.set(parseInt(newChainId as string, 16));
    });

    return accounts[0];
  }

  async switchToHela(): Promise<void> {
    const eth = (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;

    if (!eth) {
      throw new Error('MetaMask not installed');
    }

    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.helaConfig.chainId }]
      });
    } catch (error) {
      const unknownError = error as { code?: number };
      if (unknownError.code === 4902) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [this.helaConfig]
        });
      } else {
        throw error;
      }
    }

    this._chainId.set(environment.helaChainId);
  }

  disconnectWallet(): void {
    this._walletAddress.set(null);
    this._isConnected.set(false);
    this._provider.set(null);
    this._signer.set(null);
    this._chainId.set(null);
  }

  private getContract(address: string, abi: ethers.InterfaceAbi): ethers.Contract {
    const signer = this._signer();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    if (!address) {
      throw new Error('Contract address missing in environment configuration');
    }

    return new ethers.Contract(address, abi, signer);
  }

  private async waitForReceipt(tx: ethers.ContractTransactionResponse): Promise<ethers.TransactionReceipt> {
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction dropped before confirmation');
    }
    return receipt;
  }

  private coerceMintInput(input: unknown): MintAgentInput {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Invalid mint payload');
    }

    const payload = input as Partial<MintAgentInput>;
    if (typeof payload.agentType !== 'number') {
      throw new Error('mintAgent payload missing numeric agentType');
    }
    if (typeof payload.specialization !== 'string' || !payload.specialization.trim()) {
      throw new Error('mintAgent payload missing specialization');
    }
    if (!Array.isArray(payload.skillScores) || payload.skillScores.length !== 5) {
      throw new Error('mintAgent payload requires skillScores[5]');
    }
    if (typeof payload.metadataURI !== 'string' || !payload.metadataURI.trim()) {
      throw new Error('mintAgent payload missing metadataURI');
    }

    const skillScores = payload.skillScores.map((value) => {
      if (typeof value !== 'number') {
        throw new Error('skillScores must contain numbers only');
      }
      return value;
    }) as [number, number, number, number, number];

    return {
      ownerAddress: payload.ownerAddress,
      to: payload.to,
      agentType: payload.agentType,
      specialization: payload.specialization,
      skillScores,
      metadataURI: payload.metadataURI
    };
  }

  async mintAgent(dnaMetadata: unknown): Promise<ethers.TransactionReceipt> {
    const signer = this._signer();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    const payload = this.coerceMintInput(dnaMetadata);
    const to = payload.ownerAddress ?? payload.to ?? (await signer.getAddress());

    const contract = this.getContract(this.contractAddresses.agentNFT, AGENT_NFT_ABI);
    const tx = await contract['mintAgent'](
      to,
      payload.agentType,
      payload.specialization,
      payload.skillScores,
      payload.metadataURI
    );

    return this.waitForReceipt(tx as ethers.ContractTransactionResponse);
  }

  async getAgentDNA(tokenId: number): Promise<unknown> {
    const contract = this.getContract(this.contractAddresses.agentNFT, AGENT_NFT_ABI);
    const dna = await contract['getAgentDNA'](tokenId);

    return {
      agentType: Number(dna.agentType),
      specialization: String(dna.specialization),
      skillScores: (dna.skillScores as bigint[]).map((value) => Number(value)),
      level: Number(dna.level),
      totalEarnings: String(dna.totalEarnings),
      jobsCompleted: Number(dna.jobsCompleted),
      reputationScore: Number(dna.reputationScore),
      traits: [...(dna.traits as string[])],
      mintedAt: Number(dna.mintedAt),
      tbaWallet: String(dna.tbaWallet)
    };
  }

  async getAgentsByOwner(owner: string): Promise<unknown[]> {
    const contract = this.getContract(this.contractAddresses.agentNFT, AGENT_NFT_ABI);
    const tokenIds = (await contract['getAgentsByOwner'](owner)) as bigint[];
    return tokenIds.map((value) => Number(value));
  }

  async getForgeBalance(address: string): Promise<string> {
    const contract = this.getContract(this.contractAddresses.forgeToken, FORGE_TOKEN_ABI);
    const rawBalance = (await contract['balanceOf'](address)) as bigint;
    return ethers.formatUnits(rawBalance, 18);
  }

  async approveForge(spender: string, amount: string): Promise<void> {
    const contract = this.getContract(this.contractAddresses.forgeToken, FORGE_TOKEN_ABI);
    const parsedAmount = ethers.parseUnits(amount, 18);
    const tx = await contract['approve'](spender, parsedAmount);
    await this.waitForReceipt(tx as ethers.ContractTransactionResponse);
  }

  async createJob(agentTokenId: number, amount: string): Promise<void> {
    const escrow = this.getContract(this.contractAddresses.jobEscrow, JOB_ESCROW_ABI);
    const agentNft = this.getContract(this.contractAddresses.agentNFT, AGENT_NFT_ABI);

    const owner = (await agentNft['ownerOf'](agentTokenId)) as string;
    const dna = await agentNft['getAgentDNA'](agentTokenId);
    const tbaWallet = String(dna.tbaWallet);
    if (!tbaWallet || tbaWallet === ethers.ZeroAddress) {
      throw new Error('Agent does not have a Token Bound Account yet');
    }

    const parsedAmount = ethers.parseUnits(amount, 18);
    const tx = await escrow['createJob'](agentTokenId, owner, tbaWallet, parsedAmount);
    await this.waitForReceipt(tx as ethers.ContractTransactionResponse);
  }

  async listForRent(tokenId: number, pricePerDay: string, duration: number): Promise<void> {
    const market = this.getContract(this.contractAddresses.rentalMarket, RENTAL_MARKET_ABI);
    const parsedPrice = ethers.parseUnits(pricePerDay, 18);
    const tx = await market['listForRent'](tokenId, parsedPrice, duration);
    await this.waitForReceipt(tx as ethers.ContractTransactionResponse);
  }

  async rentAgent(tokenId: number, days: number): Promise<void> {
    const market = this.getContract(this.contractAddresses.rentalMarket, RENTAL_MARKET_ABI);
    const tx = await market['rent'](tokenId, days);
    await this.waitForReceipt(tx as ethers.ContractTransactionResponse);
  }

  /**
   * Sends a small "mint fee" transaction via MetaMask so the user sees
   * a confirmation popup before the backend finalizes the forge.
   * The fee goes to the platform contract (AgentNFT) address.
   */
  async sendMintFee(mintCostEther: string = '0.01'): Promise<string> {
    const signer = this._signer();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    // Self-transfer to trigger MetaMask confirmation popup
    const selfAddress = await signer.getAddress();
    const tx = await signer.sendTransaction({
      to: selfAddress,
      value: ethers.parseEther(mintCostEther),
    });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Mint fee transaction dropped');
    }
    return receipt.hash;
  }

  getAddressSnapshot(): string | null {
    return this._walletAddress();
  }

  // Kept for Phase 2 ABI wiring.
  getContractInstance(address: string, abi: ethers.InterfaceAbi): ethers.Contract {
    return this.getContract(address, abi);
  }

  getContractAddresses() {
    return this.contractAddresses;
  }
}
