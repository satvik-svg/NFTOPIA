import { Component, Input } from '@angular/core';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-stats-panel',
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <div class="grid grid-cols-2 gap-3">
      <app-stat-card label="Total Earnings" [value]="totalEarnings"></app-stat-card>
      <app-stat-card label="Jobs Completed" [value]="jobsCompleted"></app-stat-card>
      <app-stat-card label="Reputation" [value]="reputation"></app-stat-card>
      <app-stat-card label="TBA Balance" [value]="tbaBalance"></app-stat-card>
    </div>
  `
})
export class StatsPanelComponent {
  @Input() totalEarnings = '0 $FORGE';
  @Input() jobsCompleted = '0';
  @Input() reputation = '0/100';
  @Input() tbaBalance = '0 $FORGE';
}
