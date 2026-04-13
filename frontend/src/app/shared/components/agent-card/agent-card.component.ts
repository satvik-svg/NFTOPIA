import { NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AgentConfig } from '../../../core/models/agent.model';
import { ForgeAmountComponent } from '../forge-amount/forge-amount.component';
import { LevelBadgeComponent } from '../level-badge/level-badge.component';
import { TraitBadgeComponent } from '../trait-badge/trait-badge.component';

@Component({
  selector: 'app-agent-card',
  standalone: true,
  imports: [NgIf, NgFor, TitleCasePipe, ForgeAmountComponent, LevelBadgeComponent, TraitBadgeComponent],
  template: `
    <article
      class="glass-card--glow group cursor-pointer overflow-hidden"
      (click)="onCardClick()"
      style="transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);"
    >
      <!-- Image -->
      <div class="relative overflow-hidden">
        <img
          [src]="agent.metadataURI || fallbackImage"
          [alt]="'Agent #' + agent.tokenId"
          class="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <!-- Overlay gradient on hover -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <app-level-badge [level]="agent.level" class="absolute right-3 top-3"></app-level-badge>
        <span
          class="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide backdrop-blur-md"
          [class]="agent.agentType === 'content' ? 'bg-nft-secondary/85 text-white' : 'bg-nft-primary/85 text-white'"
        >
          {{ agent.agentType === 'content' ? 'CONTENT' : 'TRADING' }}
        </span>
      </div>

      <!-- Info -->
      <div class="p-5">
        <h3 class="font-display text-lg font-bold text-nft-darker">Agent #{{ agent.tokenId }}</h3>
        <p class="text-sm text-slate-400">{{ agent.specialization | titlecase }}</p>

        <div class="mt-4 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Earned</span>
            <app-forge-amount [amount]="agent.totalEarnings"></app-forge-amount>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Reputation</span>
            <span class="font-mono font-bold text-nft-darker">{{ agent.reputationScore }}<span class="text-slate-300">/100</span></span>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-1.5" *ngIf="agent.traits.length">
          <app-trait-badge *ngFor="let trait of agent.traits.slice(0, 3)" [trait]="trait"></app-trait-badge>
        </div>

        <div class="mt-4 flex gap-2" *ngIf="showActions">
          <button
            *ngIf="agent.agentType === 'content'"
            class="flex-1 rounded-xl bg-gradient-to-r from-nft-primary/10 to-nft-primary/5 py-2.5 text-sm font-semibold text-nft-primary hover:from-nft-primary hover:to-nft-primary-dark hover:text-white hover:shadow-btn transition-all duration-300"
            (click)="onAction.emit('studio'); $event.stopPropagation()"
          >
            Studio
          </button>
          <button
            class="flex-1 rounded-xl bg-slate-50 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 transition-all"
            (click)="onAction.emit('rent'); $event.stopPropagation()"
          >
            Rent
          </button>
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host article:hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 50px rgba(99, 102, 241, 0.1), 0 8px 20px rgba(0, 0, 0, 0.06);
    }
  `]
})
export class AgentCardComponent {
  @Input({ required: true }) agent!: AgentConfig;
  @Input() showActions = false;
  @Output() onAction = new EventEmitter<string>();
  @Output() onClick = new EventEmitter<number>();

  readonly fallbackImage =
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80';

  onCardClick(): void {
    this.onClick.emit(this.agent.tokenId);
  }
}
