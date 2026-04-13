import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AllocationRequest,
  CustomBotConfig,
  PnlSeriesResponse,
  TradeLog,
  TradingAgent,
  TrainingStartResponse
} from '../models/trade.model';
import { Web3Service } from './web3.service';

interface BackendTradingAgent {
  rank: number;
  tokenId: number;
  specialization?: string;
  level: number;
  traits: string[];
  strategyType: string;
  assets: string[];
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
}

interface BackendPnlPoint {
  timestamp: string;
  cumulative: number;
}

interface BackendTradeLog {
  trade_id: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  asset: string;
  entry_price: number;
  exit_price: number | null;
  quantity_forge: number;
  pnl_forge: number | null;
  reasoning: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class TradingService {
  private readonly http = inject(HttpClient);
  private readonly web3 = inject(Web3Service);
  private readonly apiUrl = environment.apiUrl;

  getLeaderboard(sortBy?: string): Observable<TradingAgent[]> {
    return this.http
      .get<BackendTradingAgent[]>(`${this.apiUrl}/trading/leaderboard`, {
        params: sortBy ? { sort: sortBy } : {}
      })
      .pipe(
        map((items) =>
          items.map((item) => ({
            tokenId: item.tokenId,
            specialization: item.specialization,
            strategyType: item.strategyType,
            assets: item.assets,
            totalPnl: item.totalPnl,
            winRate: item.winRate,
            totalTrades: item.totalTrades,
            maxDrawdown: item.maxDrawdown,
            sharpeRatio: item.sharpeRatio,
            rank: item.rank,
            traits: item.traits,
            level: item.level
          }))
        )
      );
  }

  allocate(request: AllocationRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/trading/allocate`, {
      agent_token_id: request.agentTokenId,
      amount_forge: request.amountForge
    });
  }

  getTradeLog(agentTokenId: number): Observable<TradeLog[]> {
    return this.http.get<BackendTradeLog[]>(`${this.apiUrl}/trading/${agentTokenId}/trades`).pipe(
      map((items) =>
        items.map((item) => ({
          tradeId: item.trade_id,
          action: item.action,
          asset: item.asset,
          entryPrice: item.entry_price,
          exitPrice: item.exit_price,
          quantityForge: item.quantity_forge,
          pnlForge: item.pnl_forge,
          reasoning: item.reasoning,
          timestamp: item.timestamp
        }))
      )
    );
  }

  getPnLData(agentTokenId: number, period: string): Observable<PnlSeriesResponse> {
    return this.http
      .get<BackendPnlPoint[]>(`${this.apiUrl}/trading/${agentTokenId}/pnl`, {
        params: { period }
      })
      .pipe(
        map((points) => ({
          labels: points.map((item) => new Date(item.timestamp).toLocaleDateString()),
          values: points.map((item) => item.cumulative)
        }))
      );
  }

  createCustomBot(config: CustomBotConfig): Observable<TrainingStartResponse> {
    const owner = this.web3.walletAddress() ?? '';
    const strategyType = config.strategyType || `${config.market}_${config.goal}`;

    return this.http.post<TrainingStartResponse>(`${this.apiUrl}/trading/custom/create`, {
      owner_address: owner,
      agent_token_id: config.agentTokenId,
      strategy_type: strategyType,
      assets: config.assets,
      timeframe: '4h',
      risk_params: {
        market: config.market,
        risk_tolerance: config.riskTolerance,
        goal: config.goal
      },
      goal: config.goal,
      risk_tolerance: config.riskTolerance,
      training_period: config.trainingPeriod,
      initial_balance: 10000
    });
  }

  getTrainingProgress(trainingId: string): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/trading/custom/training/${trainingId}`);
  }

  getMyAllocations(ownerAddress: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/trading/allocations/${ownerAddress}`);
  }
}
