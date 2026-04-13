import { Component, signal } from '@angular/core';
import { MarketplaceService } from '../../core/services/marketplace.service';
import { NotificationService } from '../../core/services/notification.service';
import { ActiveRentalItem } from './components/active-rentals.component';
import { ActiveRentalsComponent } from './components/active-rentals.component';
import { RentalBrowseComponent, RentalBrowseItem } from './components/rental-browse.component';
import { RentalListingFormComponent } from './components/rental-listing-form.component';

@Component({
  selector: 'app-rental',
  standalone: true,
  imports: [RentalBrowseComponent, RentalListingFormComponent, ActiveRentalsComponent],
  template: `
    <section class="mx-auto max-w-7xl space-y-7">
      <header class="page-header">
        <p class="section-kicker">Passive Income</p>
        <h1>Rental Market</h1>
        <p>List your agents for passive yield or lease top performers.</p>
      </header>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <app-rental-browse [items]="browse()" (rent)="rentAgent($event)"></app-rental-browse>
        <div class="space-y-6">
          <app-rental-listing-form (createListing)="createListing($event)"></app-rental-listing-form>
          <app-active-rentals [items]="listings()"></app-active-rentals>
        </div>
      </div>
    </section>
  `
})
export class RentalComponent {
  constructor(
    private readonly notify: NotificationService,
    private readonly marketplace: MarketplaceService
  ) {
    this.refreshListings();
  }

  readonly browse = signal<RentalBrowseItem[]>([]);
  readonly listings = signal<ActiveRentalItem[]>([]);

  private refreshListings(): void {
    this.marketplace.getAgents().subscribe({
      next: (agents) => {
        this.browse.set(
          agents
            .filter((item) => item.isListed)
            .map((item) => ({
              tokenId: item.tokenId,
              specialization: item.strategyType,
              rate: 0,
              maxDays: 30
            }))
        );
      },
      error: () => this.browse.set([])
    });

    this.marketplace.getActiveRentals('').subscribe({
      next: (items) => {
        this.listings.set(
          items.map((item) => ({
            tokenId: item.tokenId,
            income: item.totalPnl,
            renter: 'Active'
          }))
        );
      },
      error: () => this.listings.set([])
    });
  }

  rentAgent(item: RentalBrowseItem): void {
    this.marketplace.rentStrategy(item.tokenId, 1).subscribe({
      next: () => {
        this.notify.success(`Rented Agent #${item.tokenId} for 1 day`);
        this.refreshListings();
      },
      error: () => this.notify.error(`Rent request failed for Agent #${item.tokenId}`)
    });
  }

  createListing(payload: { tokenId: number; pricePerDay: number; maxDuration: number }): void {
    this.marketplace
      .listForRent({
        tokenId: payload.tokenId,
        pricePerDay: payload.pricePerDay,
        maxDuration: payload.maxDuration
      })
      .subscribe({
        next: () => {
          this.notify.success(`Listing created: Agent #${payload.tokenId} at ${payload.pricePerDay} $FORGE/day`);
          this.refreshListings();
        },
        error: () => this.notify.error('Failed to create rental listing')
      });
  }
}
