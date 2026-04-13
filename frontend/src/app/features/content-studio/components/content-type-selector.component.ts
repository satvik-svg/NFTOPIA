import { NgFor, TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type ContentType = 'image' | 'video' | 'text';

@Component({
  selector: 'app-content-type-selector',
  standalone: true,
  imports: [NgFor, TitleCasePipe],
  template: `
    <div class="inline-flex rounded-full border border-nft-border bg-nft-surface p-1">
      <button class="rounded-full bg-nft-primary px-5 py-2 text-sm font-medium text-white shadow-btn">
        Image
      </button>
    </div>
  `
})
export class ContentTypeSelectorComponent {
  @Input() selectedType: ContentType = 'image';
  @Output() selectedTypeChange = new EventEmitter<ContentType>();

  readonly contentTypes: ContentType[] = ['image'];

  onSelect(value: ContentType): void {
    this.selectedTypeChange.emit(value);
  }
}
