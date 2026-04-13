import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-trait-badge',
  standalone: true,
  template: `
    <span class="rounded-full bg-nft-secondary/10 px-2.5 py-1 text-xs font-medium text-nft-secondary">
      {{ trait }}
    </span>
  `
})
export class TraitBadgeComponent {
  @Input() trait = '';
}
