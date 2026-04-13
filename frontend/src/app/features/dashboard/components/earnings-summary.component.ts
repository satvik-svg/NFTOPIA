import { Component, Input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-earnings-summary',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="glass-card--glow p-6">
      <h3 class="font-display text-xl font-bold text-nft-darker">Earnings Breakdown</h3>
      <div class="mt-5 h-64">
        <canvas baseChart [type]="'bar'" [data]="barData" [options]="barOptions"></canvas>
      </div>
    </div>
  `
})
export class EarningsSummaryComponent {
  @Input() labels: string[] = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

  readonly barData: ChartConfiguration<'bar'>['data'] = {
    labels: this.labels,
    datasets: [
      { label: 'Content Sales', data: [0, 0, 0, 0], backgroundColor: '#0EA5A1', borderRadius: 6 },
      { label: 'Royalties', data: [0, 0, 0, 0], backgroundColor: '#22D3EE', borderRadius: 6 },
      { label: 'Trading Fees', data: [0, 0, 0, 0], backgroundColor: '#F97316', borderRadius: 6 },
      { label: 'Rental Income', data: [0, 0, 0, 0], backgroundColor: '#A78BFA', borderRadius: 6 }
    ]
  };

  readonly barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#64748B', font: { family: 'Inter', weight: 'normal' } } } },
    scales: {
      x: { stacked: true, ticks: { color: '#94A3B8', font: { family: 'Inter' } }, grid: { color: 'rgba(226,232,240,.4)' } },
      y: { stacked: true, ticks: { color: '#94A3B8', font: { family: 'Inter' } }, grid: { color: 'rgba(226,232,240,.4)' } }
    }
  };
}
