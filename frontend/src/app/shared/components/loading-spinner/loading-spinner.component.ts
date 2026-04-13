import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="inline-flex items-center gap-3" [class.text-sm]="small">
      <div class="h-5 w-5 animate-spin rounded-full border-2 border-nft-border border-t-nft-primary"></div>
      <span class="text-nft-muted">{{ label }}</span>
    </div>
  `
})
export class LoadingSpinnerComponent {
  @Input() label = 'Loading...';
  @Input() small = false;
}
