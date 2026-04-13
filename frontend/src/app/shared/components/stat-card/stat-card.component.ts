import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="glass-card--glow p-5 group hover:-translate-y-1 transition-all duration-400">
      <p class="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{{ label }}</p>
      <p class="mt-2.5 font-display text-2xl font-black text-nft-darker group-hover:text-nft-primary transition-colors">{{ value }}</p>
      <p class="mt-1.5 text-xs font-semibold" *ngIf="delta"
        [class.text-emerald-500]="delta.startsWith('+')"
        [class.text-red-400]="delta.startsWith('-')">
        {{ delta }}
      </p>
    </div>
  `
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() delta = '';
}
