export interface AgentListing {
  tokenId: number;
  strategyType: string;
  assets: string[];
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number | null;
  sharpeRatio: number | null;
  listedAt: string;
  isListed: boolean;
}

export interface RentalListingRequest {
  tokenId: number;
  pricePerDay: number;
  maxDuration: number;
}

export interface PlatformStats {
  agentsMinted: number;
  forgeEarned: number;
  contentTraded: number;
}
