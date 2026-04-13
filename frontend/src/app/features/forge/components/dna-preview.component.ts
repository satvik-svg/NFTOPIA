import { NgIf } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DnaVisualizerComponent } from '../../../shared/components/dna-visualizer/dna-visualizer.component';

@Component({
  selector: 'app-dna-preview',
  standalone: true,
  imports: [NgIf, DnaVisualizerComponent],
  template: `
    <div class="glass-card p-5" *ngIf="specialization">
      <p class="text-xs font-semibold uppercase tracking-wider text-nft-muted">DNA Preview</p>
      <h3 class="mt-1 font-display text-xl font-bold text-nft-text">{{ specialization }}</h3>
      <p class="mt-2 text-sm text-nft-text-secondary">{{ personality }}</p>
      <div class="mt-4">
        <app-dna-visualizer [skillScores]="scores"></app-dna-visualizer>
      </div>
      <p class="mt-4 text-xs text-nft-muted">Estimated mint cost: {{ estimatedMintCost }} HLUSD</p>
    </div>
  `
})
export class DnaPreviewComponent implements OnChanges {
  @Input() specialization = '';
  @Input() estimatedMintCost = '0.010';

  personality = 'Adaptive and performance-obsessed, tuned for long-term evolution.';
  scores: number[] = [62, 68, 74, 71, 79];

  private readonly personalities: Record<string, string[]> = {
    cyberpunk_image_gen: [
      'A brooding digital artist obsessed with neon-drenched dystopias.',
      'A rebellious creator who channels urban decay into striking visuals.',
      'A cyberpunk visionary, blending man and neon machine.'
    ],
    anime_art: [
      'A passionate otaku artist who brings characters to life with vibrant energy.',
      'A meticulous illustrator inspired by soft cinematic anime scenes.',
      'A dynamic cel-shaded creator focusing on extreme action poses.'
    ],
    photorealistic_portraits: [
      'An ultra-detailed virtual photographer with an eye for subtle human emotion.',
      'A master of lighting and texture, forging incredibly lifelike faces.',
      'A dedicated portraitist specializing in dramatic studio lighting.'
    ],
    abstract_art: [
      'A chaotic mind that finds meaning in fluid shapes and bold color splashes.',
      'A surrealist orchestrator of impossible geometries.',
      'A structural minimalist who speaks only in harsh lines and stark contrasts.'
    ],
    lofi_aesthetic: [
      'A chill architect of cozy, rainy nights and nostalgic pastel bedrooms.',
      'A relaxed vintage artist creating warm, comforting visual atmospheres.',
      'A lo-fi connoisseur dedicated to late-night studies and soft gradients.'
    ]
  };

  private readonly tones = ['mischievous', 'bold', 'experimental', 'precise', 'focused', 'unpredictable'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['specialization'] && this.specialization) {
      this.generateRandomDna();
    }
  }

  private generateRandomDna(): void {
    // Generate Random Personality
    const seeds = this.personalities[this.specialization] || ['A highly skilled and adaptive AI agent.'];
    const base = seeds[Math.floor(Math.random() * seeds.length)];
    const tone = this.tones[Math.floor(Math.random() * this.tones.length)];
    this.personality = `${base} Working style: ${tone} and direct.`;

    // Generate Random Scores between 40 and 95
    this.scores = Array.from({ length: 5 }, () => Math.floor(Math.random() * 56) + 40);
  }
}
