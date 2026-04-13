import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface PromptAdvancedOptions {
  styleIntensity: number;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:5';
  durationSec: 5 | 10 | 15;
  tone: 'neutral' | 'bold' | 'cinematic';
}

@Component({
  selector: 'app-prompt-input',
  standalone: true,
  imports: [NgIf, FormsModule],
  template: `
    <div class="space-y-3">
      <textarea
        class="h-40 w-full rounded-xl border border-nft-border bg-nft-surface p-4 text-nft-text outline-none transition-all focus:border-nft-primary focus:ring-2 focus:ring-nft-primary/10 placeholder:text-nft-text-light"
        [ngModel]="prompt"
        (ngModelChange)="promptChange.emit($event)"
        placeholder="Describe what your agent should generate..."
      ></textarea>

      <div class="flex items-center justify-start">
        <p class="text-xs text-nft-muted">Characters: {{ prompt.length }}</p>
      </div>
    </div>
  `
})
export class PromptInputComponent {
  @Input() prompt = '';
  @Output() promptChange = new EventEmitter<string>();
  @Input() options: PromptAdvancedOptions = {
    styleIntensity: 70,
    aspectRatio: '1:1',
    durationSec: 10,
    tone: 'neutral'
  };
  @Output() optionsChange = new EventEmitter<PromptAdvancedOptions>();

  showAdvanced = false;

  emitOptions(): void {
    this.optionsChange.emit({ ...this.options });
  }
}
