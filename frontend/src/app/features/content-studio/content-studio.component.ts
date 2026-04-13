import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentNft } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { NotificationService } from '../../core/services/notification.service';
import { Web3Service } from '../../core/services/web3.service';
import { ContentHistoryComponent } from './components/content-history.component';
import { ContentTypeSelectorComponent } from './components/content-type-selector.component';
import { GenerationPreviewComponent } from './components/generation-preview.component';
import { PromptAdvancedOptions, PromptInputComponent } from './components/prompt-input.component';

@Component({
  selector: 'app-content-studio',
  standalone: true,
  imports: [NgIf, PromptInputComponent, ContentTypeSelectorComponent, GenerationPreviewComponent, ContentHistoryComponent],
  template: `
    <section class="mx-auto grid max-w-7xl grid-cols-1 gap-7 lg:grid-cols-[1.1fr_1fr]">
      <div class="glass-card--glow space-y-6 p-7">
        <header class="page-header">
          <p class="section-kicker">Create</p>
          <h1 class="text-3xl">Content Studio</h1>
          <p>Agent #{{ agentId }} · Create AI-generated image outputs.</p>
          <div class="mt-4 rounded-xl border border-nft-border bg-slate-50 p-3 text-xs text-slate-500">
            Credits remaining: <span class="font-mono font-semibold text-nft-primary">{{ credits() }}</span>
          </div>
        </header>

        <app-content-type-selector [selectedType]="contentType()" (selectedTypeChange)="contentType.set($event)"></app-content-type-selector>

        <app-prompt-input [(prompt)]="prompt" [(options)]="advancedOptions"></app-prompt-input>

        <div class="flex items-center justify-between pt-2 border-t border-nft-border">
          <p class="text-xs text-nft-muted">Estimated time: {{ etaLabel() }}</p>
          <button class="btn-forge" (click)="generate()" [disabled]="isGenerating() || !prompt.trim()">Generate</button>
        </div>
      </div>

      <div class="space-y-4">
        <app-generation-preview
          [isGenerating]="isGenerating()"
          [contentType]="contentType()"
          [contentUrl]="generatedUrl()"
          [contentText]="generatedText()"
          [(mintAsNft)]="mintAsNft"
          [(priceForge)]="priceForge"
          [showMintAction]="!!lastContentId()"
          [minting]="isMinting()"
          [isMinted]="isMinted()"
          (mintNow)="mintLatestContent()"
          (viewMarketplace)="goMarketplace()"
          (viewAgent)="goAgent()"
        ></app-generation-preview>


        <app-content-history [items]="history()" (select)="selectHistoryItem($event)"></app-content-history>
      </div>
    </section>
  `
})
export class ContentStudioComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly content = inject(ContentService);
  private readonly notify = inject(NotificationService);
  private readonly web3 = inject(Web3Service);

  readonly agentId = Number(this.route.snapshot.paramMap.get('agentId') || 0);
  readonly contentType = signal<'image' | 'video' | 'text'>('image');
  readonly isGenerating = signal(false);
  readonly isMinting = signal(false);
  readonly isMinted = signal(false);
  readonly generatedUrl = signal('');
  readonly generatedText = signal('');
  readonly generationDebug = signal('');
  readonly lastContentId = signal<string | null>(null);
  readonly history = signal<ContentNft[]>([]);
  readonly credits = signal(18);

  prompt = '';
  mintAsNft = true;
  priceForge = 120;
  advancedOptions: PromptAdvancedOptions = {
    styleIntensity: 70,
    aspectRatio: '1:1',
    durationSec: 10,
    tone: 'neutral'
  };

  setContentType(value: string): void {
    if (value === 'image' || value === 'video' || value === 'text') {
      this.contentType.set(value);
    }
  }

  etaLabel(): string {
    const map = {
      image: '~5s',
      video: '~15s',
      text: '~3s'
    };
    return map[this.contentType()];
  }

  constructor() {
    if (this.agentId) {
      this.content.getAgentContent(this.agentId).subscribe({
        next: (items) => this.history.set(items),
        error: () => this.history.set([])
      });
    }
  }

  generate(): void {
    if (!this.prompt.trim()) {
      return;
    }

    this.isGenerating.set(true);
    this.content
      .generate({
        agentId: this.agentId,
        prompt: `${this.prompt}\n\nstyle_intensity=${this.advancedOptions.styleIntensity}; aspect_ratio=${this.advancedOptions.aspectRatio}; duration=${this.advancedOptions.durationSec}; tone=${this.advancedOptions.tone}`,
        contentType: this.contentType()
      })
      .subscribe({
        next: (res) => {
          this.isGenerating.set(false);
          this.generatedUrl.set(res.contentUrl);
          this.generatedText.set(this.contentType() === 'text' ? 'Generated text content is available via URL metadata.' : 'Generated preview based on your prompt.');
          this.generationDebug.set(this.buildDebugLabel(res.debugInfo));
          this.lastContentId.set(res.contentId || null);
          this.isMinted.set(false);
          this.credits.update((current) => Math.max(0, current - 1));

          if (this.mintAsNft && res.contentId) {
            this.mintLatestContent(true);
          } else {
            this.notify.success('Content generated successfully');
            this.refreshHistory();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isGenerating.set(false);
          this.generationDebug.set('request_failed');
          const detail = typeof error.error?.detail === 'string' ? error.error.detail : 'Verify backend and Gemini setup.';
          this.notify.error(`Generation failed: ${detail}`);
        }
      });
  }

  async mintLatestContent(isAuto = false): Promise<void> {
    const contentId = this.lastContentId();
    if (!contentId) {
      this.notify.warning('Generate content first, then mint.');
      return;
    }

    // Ensure wallet connected
    let wallet = this.web3.walletAddress();
    if (!wallet) {
      try {
        await this.web3.connectWallet();
        wallet = this.web3.walletAddress();
      } catch {
        this.notify.error('Connect your wallet to mint content');
        return;
      }
    }

    // Trigger MetaMask popup for mint fee
    this.isMinting.set(true);
    try {
      this.notify.info('Confirm the mint fee in your wallet...');
      await this.web3.sendMintFee('0.005');
    } catch (err) {
      this.isMinting.set(false);
      const msg = err instanceof Error ? err.message : 'Transaction rejected';
      if (msg.includes('rejected') || msg.includes('denied')) {
        this.notify.warning('Mint cancelled by user');
      } else {
        this.notify.error(`Wallet error: ${msg}`);
      }
      return;
    }

    // Proceed with backend mint
    this.content.mintContent(contentId, this.priceForge).subscribe({
      next: () => {
        this.isMinting.set(false);
        this.isMinted.set(true);
        this.notify.success(isAuto ? 'Content generated and minted to marketplace successfully' : 'Content minted to marketplace successfully');
        this.refreshHistory();
      },
      error: (error: HttpErrorResponse) => {
        this.isMinting.set(false);
        const detail = typeof error.error?.detail === 'string' ? error.error.detail : 'Minting failed.';
        this.notify.error(`Mint failed: ${detail}`);
        this.refreshHistory();
      }
    });
  }

  goMarketplace(): void {
    this.router.navigateByUrl('/marketplace');
  }

  goAgent(): void {
    this.router.navigate(['/agent', this.agentId]);
  }

  private refreshHistory(): void {
    if (!this.agentId) {
      return;
    }
    this.content.getAgentContent(this.agentId).subscribe({
      next: (items) => this.history.set(items),
      error: () => this.history.set([])
    });
  }

  selectHistoryItem(item: ContentNft): void {
    this.generatedUrl.set(item.contentUrl);
    this.generatedText.set(item.contentType === 'text' ? 'Previously generated text content selected.' : 'Generated preview based on your prompt.');
    this.generationDebug.set('history_item');
    this.contentType.set(item.contentType as 'image' | 'video' | 'text');
    this.lastContentId.set(item.contentId ?? null);
    this.isMinted.set(Boolean(item.tokenId && item.tokenId > 0));
  }

  private buildDebugLabel(debugInfo?: Record<string, unknown>): string {
    if (!debugInfo) {
      return 'no_debug_info';
    }

    const source = String(debugInfo['source'] ?? 'unknown');
    const reason = debugInfo['reason'];
    return reason ? `${source} (${String(reason)})` : source;
  }
}
