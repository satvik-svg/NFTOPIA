import { NgFor } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TraitBadgeComponent } from '../../../shared/components/trait-badge/trait-badge.component';

@Component({
  selector: 'app-trait-badges',
  standalone: true,
  imports: [NgFor, TraitBadgeComponent],
  template: `
    <div class="flex flex-wrap gap-2">
      <app-trait-badge *ngFor="let trait of traits" [trait]="trait"></app-trait-badge>
    </div>
  `
})
export class TraitBadgesComponent {
  @Input() traits: string[] = [];
}
