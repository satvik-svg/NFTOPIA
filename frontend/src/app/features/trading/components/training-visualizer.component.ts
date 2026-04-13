import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-training-visualizer',
  standalone: true,
  imports: [BaseChartDirective, DecimalPipe],
  template: `
    <div class="glass-card p-6">
      <h3 class="font-display text-2xl font-bold text-nft-text">Training Progress</h3>

      <div class="mt-4 space-y-2">
        <p class="text-sm text-nft-text-secondary">Epoch: {{ epoch }}/{{ totalEpochs }}</p>
        <div class="h-3 rounded-full bg-nft-surface-alt">
          <div class="h-3 rounded-full bg-gradient-to-r from-nft-primary to-nft-secondary transition-all" [style.width.%]="progress"></div>
        </div>
        <p class="text-xs text-nft-muted">Sharpe: {{ sharpe | number: '1.2-2' }} · Max drawdown: {{ maxDrawdown | number: '1.2-2' }}%</p>
      </div>

      <div class="mt-4 h-52">
        <canvas baseChart [type]="'line'" [data]="lineData" [options]="lineOptions"></canvas>
      </div>
    </div>
  `
})
export class TrainingVisualizerComponent {
  @Input() epoch = 0;
  @Input() totalEpochs = 100;
  @Input() rewards: number[] = [0.1, 0.18, 0.22, 0.28, 0.36, 0.42, 0.5, 0.54, 0.58, 0.63];
  @Input() sharpe = 1.12;
  @Input() maxDrawdown = 7.4;

  get progress(): number {
    if (!this.totalEpochs) {
      return 0;
    }

    return (this.epoch / this.totalEpochs) * 100;
  }

  get lineData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.rewards.map((_, index) => `E${index + 1}`),
      datasets: [
        {
          data: this.rewards,
          label: 'Reward Curve',
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99,102,241,.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 1.8
        }
      ]
    };
  }

  readonly lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#6B7280' } }
    },
    scales: {
      x: {
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(229,231,235,.5)' }
      },
      y: {
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(229,231,235,.5)' }
      }
    }
  };
}
