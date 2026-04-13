import { NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface EvolutionTimelineItem {
  title: string;
  time: string;
  reason?: string;
}

@Component({
  selector: 'app-evolution-timeline',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="glass-card p-6">
      <h3 class="font-display text-2xl font-bold text-nft-text">Evolution Timeline</h3>
      <div class="mt-4 space-y-3">
        <div *ngFor="let event of events" class="flex items-start gap-3 rounded-xl border border-nft-border bg-nft-surface p-4">
          <div class="mt-1 h-3 w-3 rounded-full bg-gradient-to-br from-nft-primary to-nft-secondary flex-shrink-0"></div>
          <div>
            <p class="text-sm font-medium text-nft-text">{{ event.title }}</p>
            <p class="text-xs text-nft-muted">{{ event.time }}</p>
            <p class="mt-1 text-xs text-nft-text-secondary" *ngIf="event.reason">{{ event.reason }}</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EvolutionTimelineComponent {
  @Input() events: EvolutionTimelineItem[] = [];
}
