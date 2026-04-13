import { Component, Input } from '@angular/core';
import { DnaVisualizerComponent } from '../../../shared/components/dna-visualizer/dna-visualizer.component';

@Component({
  selector: 'app-dna-card',
  standalone: true,
  imports: [DnaVisualizerComponent],
  template: `
    <div class="glass-card p-6">
      <h2 class="font-display text-2xl font-bold text-nft-text">DNA Card</h2>
      <p class="mt-2 text-sm text-nft-text-secondary">{{ personality }}</p>
      <div class="mt-4">
        <app-dna-visualizer [skillScores]="skillScores"></app-dna-visualizer>
      </div>
    </div>
  `
})
export class DnaCardComponent {
  @Input() personality = 'Adaptive creator tuned for quality and virality.';
  @Input() skillScores: number[] = [84, 73, 68, 81, 76];
}
