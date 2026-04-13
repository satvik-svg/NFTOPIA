import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomBotConfig } from '../../../core/models/trade.model';

@Component({
  selector: 'app-custom-bot-builder',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="glass-card space-y-4 p-6">
      <h2 class="font-display text-2xl font-bold text-nft-text">Custom Bot Builder</h2>

      <div>
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-nft-muted">Strategy Prompt</label>
        <textarea
          class="input-light"
          rows="3"
          placeholder="Describe your trading strategy... e.g. 'Aggressive momentum trader that buys on breakouts and sells on RSI divergence'"
          [(ngModel)]="strategyPrompt"
        ></textarea>
      </div>

      <div>
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-nft-muted">Market</label>
        <select class="input-light" [(ngModel)]="form.market">
          <option value="spot">Spot</option>
          <option value="options">Options</option>
          <option value="futures">Futures</option>
        </select>
      </div>

      <div>
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-nft-muted">Assets (comma separated)</label>
        <input class="input-light" [(ngModel)]="assetsInput" />
      </div>

      <div>
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-nft-muted">Goal</label>
        <select class="input-light" [(ngModel)]="form.goal">
          <option value="maximize_returns">Maximize Returns</option>
          <option value="maximize_sharpe">Maximize Sharpe Ratio</option>
          <option value="minimize_drawdown">Minimize Drawdown</option>
        </select>
      </div>

      <div>
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-nft-muted">Risk Tolerance</label>
        <select class="input-light" [(ngModel)]="form.riskTolerance">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div>
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-nft-muted">Training Period</label>
        <select class="input-light" [(ngModel)]="form.trainingPeriod">
          <option value="5d">5 Days</option>
          <option value="15d">15 Days</option>
          <option value="1m">1 Month</option>
          <option value="3m">3 Months</option>
          <option value="6m">6 Months</option>
          <option value="12m">1 Year</option>
        </select>
      </div>

      <button class="btn-forge w-full" (click)="submit()">MINT TRADING AGENT</button>
    </div>
  `
})
export class CustomBotBuilderComponent {
  @Output() train = new EventEmitter<CustomBotConfig & { strategyPrompt?: string }>();

  strategyPrompt = '';
  assetsInput = 'BTC,ETH';
  form: CustomBotConfig = {
    market: 'spot',
    assets: ['BTC', 'ETH'],
    goal: 'maximize_returns',
    riskTolerance: 'medium',
    trainingPeriod: '15d'
  };

  submit(): void {
    this.train.emit({
      ...this.form,
      assets: this.assetsInput
        .split(',')
        .map((asset) => asset.trim().toUpperCase())
        .filter(Boolean),
      strategyPrompt: this.strategyPrompt
    });
  }
}
