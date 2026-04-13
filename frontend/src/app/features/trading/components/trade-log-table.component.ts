import { DecimalPipe, NgFor } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TradeLog } from '../../../core/models/trade.model';

@Component({
  selector: 'app-trade-log-table',
  standalone: true,
  imports: [NgFor, DecimalPipe],
  template: `
    <div class="glass-card overflow-hidden">
      <h3 class="border-b border-nft-border p-4 font-display text-xl font-bold text-nft-text">Recent Trades</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-nft-surface-alt text-xs font-semibold uppercase tracking-wider text-nft-muted">
            <tr>
              <th class="px-4 py-3 text-left">Action</th>
              <th class="px-4 py-3 text-left">Asset</th>
              <th class="px-4 py-3 text-left">Entry</th>
              <th class="px-4 py-3 text-left">Exit</th>
              <th class="px-4 py-3 text-left">PnL</th>
              <th class="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let trade of trades" class="border-t border-nft-border/60 hover:bg-nft-surface-alt/50 transition-colors">
              <td class="px-4 py-2.5 font-semibold" [class.text-nft-secondary]="trade.action === 'BUY'" [class.text-nft-warning]="trade.action === 'HOLD'" [class.text-nft-danger]="trade.action === 'SELL'">{{ trade.action }}</td>
              <td class="px-4 py-2.5 text-nft-text">{{ trade.asset }}</td>
              <td class="px-4 py-2.5 font-mono text-nft-text-secondary">{{ trade.entryPrice | number: '1.2-2' }}</td>
              <td class="px-4 py-2.5 font-mono text-nft-text-secondary">{{ trade.exitPrice ?? '-' }}</td>
              <td class="px-4 py-2.5 font-mono font-semibold" [class.text-nft-success]="(trade.pnlForge ?? 0) >= 0" [class.text-nft-danger]="(trade.pnlForge ?? 0) < 0">{{ trade.pnlForge ?? 0 | number: '1.2-2' }}</td>
              <td class="px-4 py-2.5 text-xs text-nft-muted">{{ trade.timestamp }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class TradeLogTableComponent {
  @Input() trades: TradeLog[] = [];
}
