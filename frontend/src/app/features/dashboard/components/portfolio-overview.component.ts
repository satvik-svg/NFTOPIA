import { Component, Input } from '@angular/core';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-portfolio-overview',
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <app-stat-card label="FORGE Balance" [value]="forgeBalance" delta="+8.2%"></app-stat-card>
      <app-stat-card label="Agents Owned" [value]="agentsOwned" delta="+2"></app-stat-card>
      <app-stat-card label="All-Time Earnings" [value]="allTimeEarnings" delta="+12%"></app-stat-card>
      <app-stat-card label="Passive Income / week" [value]="passiveRate"></app-stat-card>
    </div>
  `
})
export class PortfolioOverviewComponent {
  @Input() forgeBalance = '45,382 $FORGE';
  @Input() agentsOwned = '12';
  @Input() allTimeEarnings = '128,900 $FORGE';
  @Input() passiveRate = '2,140 $FORGE';
}
