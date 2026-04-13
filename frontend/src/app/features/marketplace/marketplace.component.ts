import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContentNft } from '../../core/models/content.model';
import { AgentConfig } from '../../core/models/agent.model';
import { AgentService } from '../../core/services/agent.service';
import { ContentService } from '../../core/services/content.service';
import { NotificationService } from '../../core/services/notification.service';
import { Web3Service } from '../../core/services/web3.service';
import { ContentDetailModalComponent } from './components/content-detail-modal.component';
import { ContentGridComponent, ContentGridItem } from './components/content-grid.component';
import { FilterSidebarComponent } from './components/filter-sidebar.component';
import { AgentGridComponent } from './components/agent-grid.component';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe, FormsModule, FilterSidebarComponent, ContentGridComponent, AgentGridComponent, ContentDetailModalComponent],
  template: `
    <section class="mx-auto max-w-7xl space-y-7">
      <!-- Page Header -->
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="page-header">
          <p class="section-kicker">Explore</p>
          <h1>Marketplace</h1>
          <p>Discover content drops and high-performing agents.</p>
        </div>
        <div class="pill-tabs mb-2">
          <button
            class="pill-tab"
            [class]="tab() === 'content' ? 'pill-tab--active' : 'pill-tab--inactive'"
            (click)="tab.set('content')"
          >Content</button>
          <button
            class="pill-tab"
            [class]="tab() === 'leaderboard' ? 'pill-tab--active' : 'pill-tab--inactive'"
            (click)="tab.set('leaderboard'); loadLeaderboard()"
          >Leaderboard</button>
        </div>
      </header>

      <!-- Content Tab -->
      <div *ngIf="tab() === 'content'" class="space-y-6">
        <app-filter-sidebar (changeFilters)="applyFilters($event)"></app-filter-sidebar>
        <div class="animate-fade-up">
          <app-content-grid [items]="filteredContent()" (bid)="openBidModal($event)"></app-content-grid>
        </div>
      </div>

      <!-- Leaderboard Tab -->
      <div *ngIf="tab() === 'leaderboard'" class="glass-card--glow overflow-hidden animate-fade-up">
        <div class="border-b border-nft-border p-6">
          <h2 class="font-display text-2xl font-bold text-nft-text">Content Leaderboard</h2>
          <p class="text-sm text-nft-muted">All listed content ranked by current highest bid price.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs uppercase text-nft-muted bg-nft-surface/50">
              <tr>
                <th class="px-6 py-4">Rank</th>
                <th class="px-6 py-4">Preview</th>
                <th class="px-6 py-4">Creator Agent</th>
                <th class="px-6 py-4">Highest Bid</th>
                <th class="px-6 py-4">Total Bids</th>
                <th class="px-6 py-4">Base Price</th>
                <th class="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of leaderboardContent(); let i = index"
                class="border-b border-nft-border/40 hover:bg-nft-primary/5 transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-nft-primary">#{{ i + 1 }}</td>
                <td class="px-6 py-4">
                  <img [src]="item.image" class="h-12 w-20 rounded-lg object-cover shadow-sm" alt="thumb" />
                </td>
                <td class="px-6 py-4 font-semibold text-nft-text">Agent #{{ item.agentId }}</td>
                <td class="px-6 py-4 font-mono font-bold text-nft-primary">{{ (item.highestBid || item.price) | number:'1.0-0' }} $FORGE</td>
                <td class="px-6 py-4 text-nft-muted">{{ item.bidCount || 0 }}</td>
                <td class="px-6 py-4 font-mono text-nft-muted/70">{{ item.price | number:'1.0-0' }} $FORGE</td>
                <td class="px-6 py-4 text-right">
                  <button class="btn-forge !px-4 !py-1.5 !text-xs !rounded-full" (click)="openBidModal(item)">Bid</button>
                </td>
              </tr>
              <tr *ngIf="leaderboardContent().length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-nft-muted font-medium">No content available yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <app-content-detail-modal
        [item]="selectedContent()"
        (close)="selectedContent.set(null)"
        (buy)="placeBid($event)"
      ></app-content-detail-modal>
    </section>
  `
})
export class MarketplaceComponent implements OnInit {
  private readonly notify = inject(NotificationService);
  private readonly contentService = inject(ContentService);
  private readonly agentService = inject(AgentService);
  private readonly web3 = inject(Web3Service);
  private readonly router = inject(Router);

  readonly tab = signal<'content' | 'leaderboard'>('content');
  readonly selectedContent = signal<ContentGridItem | null>(null);

  private readonly filters = signal({
    contentType: '',
    agentType: '',
    sort: 'trending'
  });

  contentItems: (ContentGridItem & { contentType: 'image' | 'video' | 'text' })[] = [];
  agents: AgentConfig[] = [];

  ngOnInit() {
    this.fetchContent();
    this.fetchAgents();
  }

  private fetchAgents() {
    this.agentService.getLeaderboard().subscribe(agents => {
      this.agents = agents;
    });
  }

  private fetchContent() {
    this.contentService.getMarketplaceContent().subscribe(items => {
      this.contentItems = items.map(item => ({
        image: item.contentUrl || '',
        prompt: `Agent #${item.creatorAgent} ${item.contentType}`,
        price: item.price,
        agentId: item.creatorAgent,
        contentType: item.contentType as 'image'|'video'|'text',
        purchases: item.purchases || 0,
        contentId: item.contentId || '',
        highestBid: item.tips > 0 && item.tips > item.price ? item.tips : item.price,
        bidCount: item.purchases || 0
      }));
    });
  }

  loadLeaderboard(): void {
    // Refresh content to get latest bid data for leaderboard
    this.fetchContent();
  }

  leaderboardContent(): ContentGridItem[] {
    // Sort all content by highest bid descending
    return [...this.contentItems].sort((a, b) =>
      (b.highestBid || b.price) - (a.highestBid || a.price)
    );
  }

  applyFilters(next: { contentType: string; agentType: string; sort: string }): void {
    this.filters.set(next);
  }

  filteredContent(): ContentGridItem[] {
    const f = this.filters();
    let list = [...this.contentItems];

    if (f.contentType) {
      list = list.filter((item) => item.contentType === f.contentType);
    }

    if (f.sort === 'price_low') {
      list.sort((a, b) => (a.highestBid || a.price) - (b.highestBid || b.price));
    } else if (f.sort === 'price_high') {
      list.sort((a, b) => (b.highestBid || b.price) - (a.highestBid || a.price));
    }

    return list;
  }

  filteredAgents(): AgentConfig[] {
    const f = this.filters();
    return !f.agentType ? this.agents : this.agents.filter((a) => a.agentType === f.agentType);
  }

  openContentModal(item: ContentGridItem): void {
    this.selectedContent.set(item);
  }

  openBidModal(item: ContentGridItem): void {
    this.selectedContent.set(item);
  }

  openAgent(event: number | { tokenId: number }): void {
    const tokenId = typeof event === 'number' ? event : event.tokenId;
    this.router.navigate(['/agent', tokenId]);
  }

  async placeBid(item: ContentGridItem & { bidAmount?: number }): Promise<void> {
    const bidAmount = item.bidAmount || item.price;

    let wallet = this.web3.walletAddress();
    if (!wallet) {
      try {
        await this.web3.connectWallet();
        wallet = this.web3.walletAddress();
      } catch {
        this.notify.error('Connect your wallet to place a bid');
        return;
      }
    }

    if (!wallet) return;

    // Trigger MetaMask popup for bid confirmation
    const bidFeeEther = '0.005';
    try {
      this.notify.info('Confirm your bid in wallet...');
      await this.web3.sendMintFee(bidFeeEther);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction rejected';
      if (msg.includes('rejected') || msg.includes('denied')) {
        this.notify.warning('Bid cancelled by user');
      } else {
        this.notify.error(`Wallet error: ${msg}`);
      }
      return;
    }

    // Record on backend
    if (item.contentId) {
      this.contentService.buyContent(item.contentId, bidAmount).subscribe({
        next: () => {
          this.notify.success(`Bid of ${bidAmount} $FORGE placed successfully on Agent #${item.agentId} content`);
          this.selectedContent.set(null);
          this.fetchContent();
        },
        error: () => this.notify.error('Failed to record bid')
      });
    } else {
      this.notify.success(`Bid of ${bidAmount} $FORGE placed successfully`);
      this.selectedContent.set(null);
      this.fetchContent();
    }
  }
}
