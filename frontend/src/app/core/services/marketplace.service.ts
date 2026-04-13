import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AgentListing, PlatformStats, RentalListingRequest } from '../models/marketplace.model';
import { ContentNft } from '../models/content.model';

interface BackendStats {
  agents: number;
  contents: number;
  trades: number;
}

interface BackendStrategy {
  token_id: number;
  strategy_type: string;
  assets: string[];
  total_pnl: number;
  total_trades: number;
  win_rate: number;
  max_drawdown: number | null;
  sharpe_ratio: number | null;
  is_marketplace_listed: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getContent(filters?: Record<string, string>): Observable<ContentNft[]> {
    return this.http.get<ContentNft[]>(`${this.apiUrl}/marketplace/content`, {
      params: filters
    });
  }

  getAgents(filters?: Record<string, string>): Observable<AgentListing[]> {
    return this.http
      .get<BackendStrategy[]>(`${this.apiUrl}/marketplace/strategies`, {
        params: filters
      })
      .pipe(
        map((items) =>
          items.map((item) => ({
            tokenId: item.token_id,
            strategyType: item.strategy_type,
            assets: item.assets,
            totalPnl: item.total_pnl,
            totalTrades: item.total_trades,
            winRate: item.win_rate,
            maxDrawdown: item.max_drawdown,
            sharpeRatio: item.sharpe_ratio,
            listedAt: item.created_at,
            isListed: item.is_marketplace_listed
          }))
        )
      );
  }

  getPlatformStats(): Observable<PlatformStats> {
    return this.http.get<BackendStats>(`${this.apiUrl}/stats/platform`).pipe(
      map((stats) => ({
        agentsMinted: stats.agents,
        forgeEarned: stats.trades,
        contentTraded: stats.contents
      }))
    );
  }

  listForRent(payload: RentalListingRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/marketplace/strategies/list`, {
      token_id: payload.tokenId,
      price_per_day: payload.pricePerDay,
      max_duration: payload.maxDuration
    });
  }

  rentStrategy(tokenId: number, days: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/marketplace/strategies/rent`, {
      token_id: tokenId,
      days
    });
  }

  getActiveRentals(ownerAddress: string): Observable<AgentListing[]> {
    return this.getAgents().pipe(
      map((items) =>
        items.filter((item) => item.isListed)
      )
    );
  }
}
