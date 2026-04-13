export interface TradingAgent {
  tokenId: number;
  specialization?: string;
  strategyType: string;
  assets: string[];
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number | null;
  sharpeRatio: number | null;
  rank: number;
  traits: string[];
  level: number;
}

export interface TradeLog {
  tradeId: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  asset: string;
  entryPrice: number;
  exitPrice: number | null;
  quantityForge: number;
  pnlForge: number | null;
  reasoning: string;
  timestamp: string;
}

export interface AllocationRequest {
  agentTokenId: number;
  amountForge: number;
}

export interface CustomBotConfig {
  agentTokenId?: number;
  strategyType?: string;
  market: 'spot' | 'options' | 'futures';
  assets: string[];
  goal: 'maximize_returns' | 'maximize_sharpe' | 'minimize_drawdown';
  riskTolerance: 'low' | 'medium' | 'high';
  trainingPeriod: string;
}

export interface PnlSeriesResponse {
  labels: string[];
  values: number[];
}

export interface TrainingStartResponse {
  trainingId: string;
  status: string;
}
