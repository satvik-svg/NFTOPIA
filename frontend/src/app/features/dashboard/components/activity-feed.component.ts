import { NgFor } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="glass-card--glow p-6">
      <h3 class="font-display text-xl font-bold text-nft-darker">Activity Feed</h3>
      <ul class="mt-5 space-y-3">
        <li *ngFor="let item of items; let i = index" class="group flex items-center gap-3 rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-500 hover:bg-nft-primary/4 hover:text-nft-darker transition-all duration-300" [style.animation-delay.ms]="i * 60">
          <div class="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-nft-primary to-nft-secondary flex-shrink-0 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all"></div>
          {{ item }}
        </li>
      </ul>
    </div>
  `
})
export class ActivityFeedComponent {
  @Input() items: string[] = [];
}
