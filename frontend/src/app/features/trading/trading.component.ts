import { NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CustomBotConfig, TradeLog, TradingAgent } from '../../core/models/trade.model';
import { AgentService } from '../../core/services/agent.service';
import { NotificationService } from '../../core/services/notification.service';
import { TradingService } from '../../core/services/trading.service';
import { Web3Service } from '../../core/services/web3.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AllocationManagerComponent } from './components/allocation-manager.component';
import { BotLeaderboardComponent } from './components/bot-leaderboard.component';
import { CustomBotBuilderComponent } from './components/custom-bot-builder.component';
import { PnlChartComponent } from './components/pnl-chart.component';
import { TradeLogTableComponent } from './components/trade-log-table.component';

@Component({
  selector: 'app-trading',
  standalone: true,
  imports: [
    NgIf,
    FormsModule,
    BotLeaderboardComponent,
    AllocationManagerComponent,
    CustomBotBuilderComponent,
    PnlChartComponent,
    TradeLogTableComponent
  ],
  template: `
    <section class="mx-auto max-w-7xl space-y-7">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="page-header">
          <p class="section-kicker">Invest</p>
          <h1>Trading Dashboard</h1>
          <p>Allocate capital to verified bots or train your own RL model.</p>
        </div>
        <div class="pill-tabs">
          <button
            class="pill-tab"
            [class]="tab() === 'market' ? 'pill-tab--active' : 'pill-tab--inactive'"
            (click)="tab.set('market')"
          >Marketplace Bots</button>
          <button
            class="pill-tab"
            [class]="tab() === 'build' ? 'pill-tab--active' : 'pill-tab--inactive'"
            (click)="tab.set('build')"
          >Build Your Own</button>
        </div>
      </header>

      <div class="space-y-4" *ngIf="tab() === 'market'">
        <div class="glass-card p-4">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input class="input-light" placeholder="Strategy" [(ngModel)]="strategyFilter" />
            <select class="input-light" [(ngModel)]="riskFilter">
              <option value="">All risk levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select class="input-light" [(ngModel)]="trackRecordFilter">
              <option value="">Any track record</option>
              <option value="7">7d+</option>
              <option value="30">30d+</option>
              <option value="90">90d+</option>
            </select>
            <select class="input-light" [(ngModel)]="sortBy" (ngModelChange)="sortLeaderboard()">
              <option value="returns">Sort: Returns</option>
              <option value="consistency">Sort: Consistency</option>
              <option value="popularity">Sort: Popularity</option>
            </select>
          </div>
        </div>

        <app-bot-leaderboard [bots]="filteredBots()" (allocate)="openAllocation($event)"></app-bot-leaderboard>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]" *ngIf="selectedBot()">
          <app-allocation-manager [selectedBot]="selectedBot()" (allocate)="confirmAllocation($event)"></app-allocation-manager>
          <app-pnl-chart [labels]="pnlLabels()" [pnlValues]="pnlSeries()"></app-pnl-chart>
        </div>

        <app-trade-log-table [trades]="tradeLog()"></app-trade-log-table>
      </div>

      <div *ngIf="tab() === 'build'">
        <app-custom-bot-builder (train)="mintTradingAgent($event)"></app-custom-bot-builder>

        <div *ngIf="isMinting()" class="glass-card mt-5 p-5 text-center space-y-2">
          <div class="animate-pulse">
            <p class="font-display text-lg text-white">Minting your Trading Agent...</p>
            <p class="text-sm text-forge-muted">Confirm the transaction in your wallet to proceed.</p>
          </div>
        </div>
      </div>
    </section>
  `
})
export class TradingComponent implements OnInit, OnDestroy {
  private readonly trading = inject(TradingService);
  private readonly notify = inject(NotificationService);
  private readonly ws = inject(WebSocketService);
  private readonly web3 = inject(Web3Service);
  private readonly agentService = inject(AgentService);
  private readonly route = inject(ActivatedRoute);

  private tradingFeedSub: Subscription | null = null;
  private activeTradingToken: number | null = null;

  readonly tab = signal<'market' | 'build'>('market');
  readonly bots = signal<TradingAgent[]>([]);
  readonly selectedBot = signal<TradingAgent | null>(null);
  readonly tradeLog = signal<TradeLog[]>([]);
  readonly pnlSeries = signal<number[]>([]);
  readonly pnlLabels = signal<string[]>([]);
  readonly isMinting = signal(false);

  strategyFilter = '';
  riskFilter = '';
  trackRecordFilter = '';
  sortBy: 'returns' | 'consistency' | 'popularity' = 'returns';

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('tab') === 'build') {
      this.tab.set('build');
    }
    this.loadLeaderboard();
  }

  constructor() {}

  ngOnDestroy(): void {
    this.tradingFeedSub?.unsubscribe();
    if (this.activeTradingToken !== null) {
      this.ws.disconnect(`trading/${this.activeTradingToken}`);
    }
  }

  private loadLeaderboard(): void {
    this.trading.getLeaderboard().subscribe({
      next: (bots) => this.bots.set(bots),
      error: () => {}
    });
  }

  filteredBots(): TradingAgent[] {
    const query = this.strategyFilter.toLowerCase().trim();

    return this.bots()
      .filter((bot) => (query ? bot.strategyType.toLowerCase().includes(query) : true))
      .filter((bot) => {
        if (!this.riskFilter) return true;
        const drawdown = bot.maxDrawdown ?? 0;
        if (this.riskFilter === 'low') return drawdown <= 8;
        if (this.riskFilter === 'medium') return drawdown > 8 && drawdown <= 15;
        return drawdown > 15;
      })
      .filter((bot) => {
        if (!this.trackRecordFilter) return true;
        const requiredTrades = this.trackRecordFilter === '7' ? 10 : this.trackRecordFilter === '30' ? 30 : 80;
        return bot.totalTrades >= requiredTrades;
      });
  }

  sortLeaderboard(): void {
    const sorted = [...this.bots()];
    if (this.sortBy === 'returns') {
      sorted.sort((a, b) => b.totalPnl - a.totalPnl);
    } else if (this.sortBy === 'consistency') {
      sorted.sort((a, b) => (b.sharpeRatio ?? 0) - (a.sharpeRatio ?? 0));
    } else {
      sorted.sort((a, b) => b.totalTrades - a.totalTrades);
    }
    this.bots.set(sorted);
  }

  openAllocation(bot: TradingAgent): void {
    this.selectedBot.set(bot);

    this.trading.getTradeLog(bot.tokenId).subscribe({
      next: (items) => this.tradeLog.set(items),
      error: () => this.tradeLog.set([])
    });

    this.trading.getPnLData(bot.tokenId, '30d').subscribe({
      next: (series) => {
        this.pnlLabels.set(series.labels);
        this.pnlSeries.set(series.values);
      },
      error: () => {
        this.pnlLabels.set([]);
        this.pnlSeries.set([]);
      }
    });

    this.tradingFeedSub?.unsubscribe();
    if (this.activeTradingToken !== null) {
      this.ws.disconnect(`trading/${this.activeTradingToken}`);
    }

    this.activeTradingToken = bot.tokenId;
    this.tradingFeedSub = this.ws.subscribeTradingFeed(bot.tokenId).subscribe({
      next: (packet) => {
        if (typeof packet !== 'object' || packet === null) return;
        const payload = packet as {
          trades?: Array<{
            tradeId: string;
            action: 'BUY' | 'SELL' | 'HOLD';
            asset: string;
            entryPrice: number;
            exitPrice: number | null;
            quantityForge: number;
            pnlForge: number | null;
            timestamp: string;
            cumulativePnl?: number;
          }>;
        };
        if (!Array.isArray(payload.trades)) return;
        this.tradeLog.set(
          payload.trades.map((item) => ({
            tradeId: item.tradeId,
            action: item.action,
            asset: item.asset,
            entryPrice: item.entryPrice,
            exitPrice: item.exitPrice,
            quantityForge: item.quantityForge,
            pnlForge: item.pnlForge,
            reasoning: '',
            timestamp: item.timestamp
          }))
        );
        this.pnlLabels.set(payload.trades.map((item) => new Date(item.timestamp).toLocaleTimeString()));
        this.pnlSeries.set(payload.trades.map((item) => item.cumulativePnl ?? 0));
      }
    });
  }

  confirmAllocation(payload: { bot: TradingAgent; amount: number }): void {
    this.trading
      .allocate({
        agentTokenId: payload.bot.tokenId,
        amountForge: payload.amount
      })
      .subscribe({
        next: () => {
          this.notify.success(`Successfully allocated ${payload.amount} $FORGE to Agent #${payload.bot.tokenId}`);
          this.openAllocation(payload.bot);
        },
        error: () => this.notify.error('Allocation request failed')
      });
  }

  async mintTradingAgent(config: CustomBotConfig & { strategyPrompt?: string }): Promise<void> {
    // Step 1: Ensure wallet connected
    let wallet = this.web3.walletAddress();
    if (!wallet) {
      try {
        await this.web3.connectWallet();
        wallet = this.web3.walletAddress();
      } catch {
        this.notify.error('Please connect your wallet to mint');
        return;
      }
    }
    if (!wallet) {
      this.notify.error('Wallet not connected');
      return;
    }

    this.isMinting.set(true);

    // Step 2: Trigger MetaMask popup for mint fee
    try {
      this.notify.info('Confirm the mint fee in your wallet...');
      await this.web3.sendMintFee('0.01');
      this.notify.success('Mint fee confirmed. Creating agent...');
    } catch (err) {
      this.isMinting.set(false);
      const msg = err instanceof Error ? err.message : 'Transaction rejected';
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        this.notify.warning('Transaction was rejected by user');
      } else {
        this.notify.error(`Wallet error: ${msg}`);
      }
      return;
    }

    // Step 3: Forge on backend
    this.agentService.forgeAgent({
      agentType: 'trading',
      specialization: 'custom_rl_trader',
      ownerAddress: wallet
    }).pipe(finalize(() => this.isMinting.set(false)))
    .subscribe({
      next: (res) => {
        this.notify.success(`Trading Agent #${res.tokenId} minted successfully`);
      },
      error: (err) => {
        const detail = typeof err.error?.detail === 'string' ? err.error.detail : err.message;
        this.notify.error(`Mint failed: ${detail}`);
      }
    });
  }
}
