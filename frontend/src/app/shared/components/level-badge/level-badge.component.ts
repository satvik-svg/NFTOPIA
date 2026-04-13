import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-level-badge',
  standalone: true,
  template: `
    <span class="rounded-full bg-nft-primary/15 px-2.5 py-1 font-mono text-xs font-bold text-nft-primary">
      LVL {{ level }}
    </span>
  `
})
export class LevelBadgeComponent {
  @Input() level = 1;
}
