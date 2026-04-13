export interface GenerationRequest {
  agentId: number;
  prompt: string;
  contentType: 'image' | 'video' | 'text';
}

export interface GenerationResponse {
  contentId: string;
  contentUrl: string;
  contentNftTokenId: number;
  agentId: number;
  prompt: string;
  contentType: string;
  metadataURI: string;
  txHash: string;
  debugInfo?: Record<string, unknown>;
}

export interface ContentNft {
  contentId?: string;
  tokenId: number;
  contentUrl: string;
  contentType: string;
  creatorAgent: number;
  creatorOwner: string;
  price: number;
  popularityScore: number;
  views: number;
  purchases: number;
  tips: number;
  createdAt: string;
}
