import { NgClass, NgFor, TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-specialization-picker',
  standalone: true,
  imports: [NgFor, NgClass, TitleCasePipe],
  template: `
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
      <button
        *ngFor="let item of options"
        class="rounded-xl border p-3.5 text-left text-sm font-medium transition-all"
        [ngClass]="
          selected === item
            ? 'border-nft-primary bg-nft-primary/8 text-nft-primary ring-1 ring-nft-primary/20'
            : 'border-nft-border bg-white text-nft-text-secondary hover:border-nft-primary/40 hover:text-nft-primary'
        "
        (click)="select.emit(item)"
      >
        {{ item | titlecase }}
      </button>
    </div>
  `
})
export class SpecializationPickerComponent {
  @Input() options: string[] = [];
  @Input() selected = '';
  @Output() select = new EventEmitter<string>();
}
