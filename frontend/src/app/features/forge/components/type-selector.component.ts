import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AgentType } from '../../../core/models/agent.model';

@Component({
  selector: 'app-type-selector',
  standalone: true,
  imports: [NgFor, NgClass, NgIf],
  template: `
    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
      <button
        *ngFor="let option of options"
        class="glass-card--glow p-7 text-left transition-all duration-400 group"
        [ngClass]="selection === option.type ? 'ring-2 ring-nft-primary/30 !shadow-btn' : 'hover:-translate-y-1'"
        (click)="select.emit(option.type)"
      >
        <p class="section-kicker">{{ option.kicker }}</p>
        <h3 class="mt-3 font-display text-2xl font-black text-nft-darker">{{ option.label }}</h3>
        <p class="mt-2 text-sm text-slate-400 leading-relaxed">{{ option.description }}</p>
        <!-- Active indicator -->
        <div *ngIf="selection === option.type" class="mt-4 flex items-center gap-2 text-xs font-bold text-nft-primary">
          <div class="h-2 w-2 rounded-full bg-nft-primary animate-pulse"></div>
          Selected
        </div>
      </button>
    </div>
  `
})
export class TypeSelectorComponent {
  @Input() selection: AgentType | null = null;
  @Output() select = new EventEmitter<AgentType>();

  readonly options: Array<{ type: AgentType; label: string; kicker: string; description: string }> = [
    { type: 'content', kicker: 'Creator Class', label: 'Content Agent', description: 'Generate images, video, and text content with signature style DNA.' },
    { type: 'trading', kicker: 'Quant Class', label: 'Build your own Trading Agent', description: 'Design and custom-build your own trading strategy to earn performance fees from allocations.' }
  ];
}
