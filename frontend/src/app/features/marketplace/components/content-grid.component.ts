import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ContentGridItem {
  image: string;
  prompt: string;
  price: number;
  agentId: number;
  purchases?: number;
  contentId?: string;
  highestBid?: number;
  bidCount?: number;
}

@Component({
  selector: 'app-content-grid',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  template: `
    <div class="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3" *ngIf="items.length > 0">
      <article *ngFor="let item of items; let i = index" class="glass-card--glow overflow-hidden group transition-all duration-500 hover:-translate-y-2" [style.animation-delay.ms]="i * 80">
        <div class="overflow-hidden relative rounded-t-2xl">
          <img [src]="item.image" class="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Content preview" />
        </div>
        <div class="space-y-3 p-5">
          <p class="line-clamp-2 text-sm font-semibold text-nft-text leading-snug">{{ item.prompt }}</p>
          <div class="flex items-center justify-between">
            <p class="text-[10px] uppercase tracking-wider font-bold text-nft-muted">Agent #{{ item.agentId }}</p>
            <span class="text-[10px] font-mono font-bold text-nft-primary bg-nft-primary/10 px-2 py-0.5 rounded-full" *ngIf="item.bidCount">{{ item.bidCount }} Bids</span>
          </div>
          <div class="flex items-center justify-between pt-3 border-t border-nft-border">
            <span class="font-mono text-[15px] font-black text-nft-primary">{{ (item.highestBid || item.price) | number:'1.0-0' }} $FORGE</span>
            <button class="btn-forge !px-4 !py-1.5 !text-[11px] !rounded-full font-bold shadow-btn" (click)="bid.emit(item)">Bid Now</button>
          </div>
        </div>
      </article>
    </div>
    <div *ngIf="items.length === 0" class="glass-card--glow p-12 text-center animate-fade-up">
      <p class="text-nft-muted font-medium">No content listed yet. Forge an agent and generate images to get started.</p>
    </div>
  `
})
export class ContentGridComponent {
  @Input() items: ContentGridItem[] = [];
  @Output() bid = new EventEmitter<ContentGridItem>();
}
