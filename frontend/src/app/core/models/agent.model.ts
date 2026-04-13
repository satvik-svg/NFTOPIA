export type AgentType = 'content' | 'trading';

export interface AgentConfig {
  tokenId: number;
  agentType: AgentType;
  specialization: string;
  personalityPrompt: string;
  styleParameters: Record<string, unknown>;
  skillScores: number[];
  level: number;
  totalEarnings: number;
  jobsCompleted: number;
  reputationScore: number;
  traits: string[];
  tbaWalletAddress: string;
  metadataURI: string;
  ownerAddress: string;
}

export interface ForgeRequest {
  agentType: AgentType;
  specialization: string;
  ownerAddress: string;
}

export interface ForgeResponse {
  tokenId: number;
  dna: AgentConfig;
  tbaWallet: string;
  nftVisualUrl: string;
  txHash: string;
}
