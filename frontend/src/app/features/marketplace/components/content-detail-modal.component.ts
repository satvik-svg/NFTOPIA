import { DecimalPipe, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentGridItem } from './content-grid.component';

@Component({
  selector: 'app-content-detail-modal',
  standalone: true,
  imports: [NgIf, FormsModule, DecimalPipe],
  template: `
    <div *ngIf="item" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" (click)="close.emit()">
      <div class="glass-card--glow max-h-[90vh] w-full max-w-lg overflow-auto p-7 shadow-2xl animate-fade-up" (click)="$event.stopPropagation()">
        <img [src]="item.image" class="h-60 w-full rounded-2xl object-cover shadow-inner" alt="Content detail" />

        <div class="mt-6 space-y-1">
          <h3 class="font-display text-2xl font-bold text-nft-text">Place a Bid</h3>
          <p class="text-sm text-nft-text-secondary">{{ item.prompt }}</p>
          <p class="text-xs font-medium text-nft-muted">Creator Agent #{{ item.agentId }}</p>
        </div>

        <div class="mt-6 rounded-2xl border border-nft-border bg-nft-surface/40 p-5 space-y-3">
          <div class="flex justify-between items-center text-sm">
            <span class="text-nft-muted font-medium">Current highest bid</span>
            <span class="font-mono text-lg font-black text-nft-primary">{{ (item.highestBid || item.price) | number:'1.0-0' }} $FORGE</span>
          </div>
          <div class="flex justify-between text-sm">
          <div class="flex justify-between text-sm">
            <span class="text-nft-muted">Total bids placed</span>
            <span class="font-medium text-nft-text">{{ item.bidCount || 0 }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-nft-muted">Auction ends in</span>
            <span class="font-mono font-medium text-amber-500">{{ timeRemaining }}</span>
          </div>
        </div>

        <div class="mt-6 w-full">
          <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Your bid amount ($FORGE)</label>
          <input
            type="number"
            [min]="(item.highestBid || item.price) + 1"
            class="input-light !w-full !font-mono !text-base"
            [(ngModel)]="bidAmount"
            placeholder="Enter bid amount"
          />
          <p class="text-xs text-slate-500 mt-2">Minimum bid is <span class="font-mono">{{ ((item.highestBid || item.price) + 1) | number:'1.0-0' }}</span> $FORGE.</p>
        </div>

        <div class="flex gap-3">
          <button class="btn-ghost flex-1" (click)="close.emit()">Cancel</button>
          <button
            class="btn-forge flex-1"
            (click)="placeBid()"
            [disabled]="!bidAmount || bidAmount <= (item.highestBid || item.price)"
          >Place Bid</button>
        </div>
      </div>
    </div>
  `
})
export class ContentDetailModalComponent implements OnChanges, OnDestroy {
  @Input() item: ContentGridItem | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() buy = new EventEmitter<ContentGridItem & { bidAmount: number }>();

  bidAmount = 0;
  timeRemaining = '00h 00m 00s';
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private auctionEndTime = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] && this.item) {
      this.bidAmount = (this.item.highestBid || this.item.price) + 10;
      
      // Deterministic 7-day auction end time based on image string
      const strId = this.item.image || String(this.item.agentId);
      let hash = 0;
      for (let i = 0; i < strId.length; i++) {
        hash = ((hash << 5) - hash) + strId.charCodeAt(i);
        hash |= 0;
      }
      
      const seed = Math.abs(hash);
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      // Pretend it was created somewhere in the past 7 days based on the seed
      // Using modulo against current time to keep it stable yet moving down
      const creationTime = Math.floor(Date.now() / sevenDaysMs) * sevenDaysMs + (seed % sevenDaysMs);
      
      // If creationTime is in the future relative to the interval, shift back one interval
      let endTime = creationTime + sevenDaysMs;
      if (endTime < Date.now()) {
        endTime += sevenDaysMs; 
      }
      
      this.auctionEndTime = endTime;
      this.startCountdown();
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.updateTimeRemaining();
    this.countdownInterval = setInterval(() => this.updateTimeRemaining(), 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private updateTimeRemaining(): void {
    const diff = Math.max(0, this.auctionEndTime - Date.now());
    if (diff === 0) {
       this.timeRemaining = 'Auction ended';
       this.stopCountdown();
       return;
    }
    const days = Math.floor(diff / (24 * 3600000));
    const hours = Math.floor((diff % (24 * 3600000)) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (days > 0) {
      this.timeRemaining = `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    } else {
      this.timeRemaining = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }
  }

  placeBid(): void {
    if (this.item && this.bidAmount > (this.item.highestBid || this.item.price)) {
      this.buy.emit({ ...this.item, bidAmount: this.bidAmount });
    }
  }
}
