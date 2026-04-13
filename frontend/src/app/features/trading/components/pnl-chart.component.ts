import { Component, Input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-pnl-chart',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="glass-card p-6">
      <h3 class="mb-3 font-display text-xl font-bold text-nft-text">P&L Performance</h3>
      <canvas baseChart [type]="'line'" [data]="lineData" [options]="lineOptions"></canvas>
    </div>
  `
})
export class PnlChartComponent {
  @Input() labels: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  @Input() pnlValues: number[] = [0, 42, -15, 60, 90, 110, 135];
  @Input() benchmarkValues: number[] = [0, 8, 12, 18, 21, 27, 33];

  get lineData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.labels,
      datasets: [
        {
          data: this.pnlValues,
          label: 'Agent P&L',
          borderColor: '#10B981',
          backgroundColor: 'rgba(16,185,129,.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 2
        },
        {
          data: this.benchmarkValues,
          label: 'Benchmark',
          borderColor: '#6366F1',
          borderDash: [6, 4],
          fill: false,
          tension: 0.35,
          pointRadius: 0
        }
      ]
    };
  }

  readonly lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#6B7280' }
      }
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
