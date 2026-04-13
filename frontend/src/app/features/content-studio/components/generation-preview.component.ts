import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

type ContentType = 'image' | 'video' | 'text';

@Component({
  selector: 'app-generation-preview',
  standalone: true,
  imports: [NgIf, FormsModule, LoadingSpinnerComponent],
  template: `
    <div class="glass-card p-6">
      <h2 class="font-display text-2xl font-bold text-nft-text">Preview</h2>

      <div class="mt-4 min-h-72 rounded-xl border border-nft-border bg-nft-surface p-4">
        <app-loading-spinner *ngIf="isGenerating" label="Generating output..."></app-loading-spinner>

        <ng-container *ngIf="!isGenerating && contentUrl">
          <img *ngIf="contentType === 'image'" [src]="contentUrl" class="h-64 w-full rounded-lg object-contain bg-[#0a1b29]" alt="Generated content" />
          <video *ngIf="contentType === 'video'" [src]="contentUrl" controls class="h-64 w-full rounded-lg object-cover"></video>
          <p *ngIf="contentType === 'text'" class="whitespace-pre-wrap text-nft-text-secondary">{{ contentText }}</p>
        </ng-container>

        <p *ngIf="!isGenerating && !contentUrl" class="text-sm text-nft-muted">Your generated output will appear here.</p>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-nft-border bg-nft-surface p-4 md:grid-cols-2">
        <label class="flex items-center gap-2 text-sm text-nft-text-secondary">
          <input type="checkbox" class="accent-nft-primary" [ngModel]="mintAsNft" (ngModelChange)="mintAsNftChange.emit($event)" />
          Mint as NFT
        </label>

        <label class="flex items-center gap-2 text-sm text-nft-text-secondary">
          Price
          <input
            type="number"
            min="1"
            class="w-28 rounded-lg border border-nft-border bg-white px-2 py-1 text-sm text-nft-text"
            [ngModel]="priceForge"
            (ngModelChange)="priceForgeChange.emit($event)"
          />
          $FORGE
        </label>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3" *ngIf="contentUrl">
        <button class="btn-forge" (click)="mintNow.emit()" [disabled]="minting || isMinted" *ngIf="showMintAction">
          {{ minting ? 'Minting...' : isMinted ? 'Minted ✓' : 'Mint Now' }}
        </button>
        <button class="btn-ghost" (click)="viewMarketplace.emit()">Open Marketplace</button>
        <button class="btn-ghost" (click)="viewAgent.emit()">View Agent</button>
      </div>
    </div>
  `
})
export class GenerationPreviewComponent {
  @Input() isGenerating = false;
  @Input() contentType: ContentType = 'image';
  @Input() contentUrl = '';
  @Input() contentText = '';
  @Input() mintAsNft = true;
  @Input() priceForge = 120;
  @Input() showMintAction = false;
  @Input() minting = false;
  @Input() isMinted = false;
  @Output() mintAsNftChange = new EventEmitter<boolean>();
  @Output() priceForgeChange = new EventEmitter<number>();
  @Output() mintNow = new EventEmitter<void>();
  @Output() viewMarketplace = new EventEmitter<void>();
  @Output() viewAgent = new EventEmitter<void>();
}
