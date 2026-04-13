import { DecimalPipe, NgFor } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TradingAgent } from '../../../core/models/trade.model';

@Component({
  selector: 'app-bot-leaderboard',
  standalone: true,
  imports: [NgFor, DecimalPipe],
  template: `
    <div class="glass-card--glow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Agent</th>
              <th>Strategy</th>
              <th>Total P&L</th>
              <th>Trades</th>
              <th>Win Rate</th>
              <th>Sharpe</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let bot of bots" class="cursor-pointer group" (click)="open.emit(bot)">
              <td class="font-mono text-xs text-slate-400">#{{ bot.rank }}</td>
              <td class="font-semibold text-nft-darker">Agent #{{ bot.tokenId }}</td>
              <td class="text-slate-500">{{ bot.strategyType }}</td>
              <td class="font-mono font-bold" [class.text-emerald-500]="bot.totalPnl >= 0" [class.text-red-400]="bot.totalPnl < 0">{{ bot.totalPnl | number: '1.1-2' }}</td>
              <td class="text-slate-500">{{ bot.totalTrades }}</td>
              <td class="text-slate-500">{{ bot.winRate | number: '1.0-0' }}%</td>
              <td class="font-mono text-slate-500">{{ (bot.sharpeRatio ?? 0) | number: '1.1-2' }}</td>
              <td>
                <button class="btn-forge !px-4 !py-1.5 !text-xs !rounded-full" (click)="allocate.emit(bot); $event.stopPropagation()">Allocate</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class BotLeaderboardComponent {
  @Input() bots: TradingAgent[] = [];
  @Output() allocate = new EventEmitter<TradingAgent>();
  @Output() open = new EventEmitter<TradingAgent>();
}
