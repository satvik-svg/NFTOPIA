import { NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface ActiveRentalItem {
  tokenId: number;
  income: number;
  renter: string;
}

@Component({
  selector: 'app-active-rentals',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="glass-card p-6">
      <h2 class="font-display text-2xl font-bold text-nft-text">My Listings</h2>
      <div class="mt-4 space-y-3">
        <div *ngIf="items.length === 0" class="rounded-xl border border-nft-border bg-nft-surface p-4 text-center text-nft-muted text-sm border-dashed">
          No active listings.
        </div>
        <article *ngFor="let item of items" class="rounded-xl border border-nft-border bg-nft-surface p-4">
          <p class="text-sm font-semibold text-nft-text">Agent #{{ item.tokenId }}</p>
          <p class="text-xs text-nft-muted mt-1">Total income: {{ item.income }} $FORGE · Active renter: {{ item.renter }}</p>
        </article>
      </div>
    </div>
  `
})
export class ActiveRentalsComponent {
  @Input() items: ActiveRentalItem[] = [];
}
