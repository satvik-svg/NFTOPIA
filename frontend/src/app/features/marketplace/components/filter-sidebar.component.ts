import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <aside class="glass-card--glow flex flex-col sm:flex-row items-center gap-4 p-4 lg:p-6 mb-2">
      <div class="flex-1 w-full sm:w-auto">
        <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Content Type</label>
        <select class="input-light !py-2 !text-sm" [(ngModel)]="contentType" (ngModelChange)="emitChange()">
          <option value="">All Types</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="text">Text</option>
        </select>
      </div>

      <div class="flex-1 w-full sm:w-auto">
        <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Origin</label>
        <select class="input-light !py-2 !text-sm" [(ngModel)]="agentType" (ngModelChange)="emitChange()">
          <option value="">All Creators</option>
          <option value="content">Content Agents</option>
          <option value="trading">Trading Agents</option>
        </select>
      </div>

      <div class="flex-1 w-full sm:w-auto">
        <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Sort By</label>
        <select class="input-light !py-2 !text-sm" [(ngModel)]="sort" (ngModelChange)="emitChange()">
          <option value="trending">Trending (Default)</option>
          <option value="newest">Recently Minted</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class FilterSidebarComponent {
  @Output() changeFilters = new EventEmitter<{ contentType: string; agentType: string; sort: string }>();
  contentType = '';
  agentType = '';
  sort = 'trending';

  emitChange(): void {
    this.changeFilters.emit({ contentType: this.contentType, agentType: this.agentType, sort: this.sort });
  }
}
