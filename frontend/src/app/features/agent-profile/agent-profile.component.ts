import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { DnaCardComponent } from './components/dna-card.component';
import { EarningsChartComponent } from './components/earnings-chart.component';
import { EvolutionTimelineComponent } from './components/evolution-timeline.component';
import { StatsPanelComponent } from './components/stats-panel.component';
import { TraitBadgesComponent } from './components/trait-badges.component';

@Component({
  selector: 'app-agent-profile',
  standalone: true,
  imports: [NgFor, DnaCardComponent, StatsPanelComponent, EarningsChartComponent, EvolutionTimelineComponent, TraitBadgesComponent],
  template: `
    <section class="mx-auto max-w-7xl space-y-7">
      <header class="glass-card--glow grid grid-cols-1 gap-8 p-7 md:grid-cols-[240px_1fr]">
        <img
          src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=900&q=80"
          class="h-64 w-full rounded-2xl object-cover shadow-card transition-transform duration-500 hover:scale-[1.02]"
          alt="Agent visual"
        />
        <div class="flex flex-col justify-center">
          <p class="section-kicker mb-2">Agent Profile</p>
          <h1 class="font-display text-5xl font-black text-nft-darker">Agent #42</h1>
          <p class="mt-3 text-lg text-slate-500">Specialization: cyberpunk_image_gen</p>
          <div class="mt-5"><app-trait-badges [traits]="traits"></app-trait-badges></div>
        </div>
      </header>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <app-dna-card [personality]="'Built for cinematic output with high virality and consistency.'" [skillScores]="[90, 78, 68, 83, 71]"></app-dna-card>
        <app-stats-panel totalEarnings="15,223 $FORGE" jobsCompleted="126" reputation="94 / 100" tbaBalance="2,340 $FORGE"></app-stats-panel>
      </div>

      <app-earnings-chart></app-earnings-chart>
      <app-evolution-timeline [events]="evolutionEvents"></app-evolution-timeline>
    </section>
  `
})
export class AgentProfileComponent {
  readonly traits = ['viral_instinct', 'niche_authority', 'style_lock'];

  readonly evolutionEvents = [
    { title: 'Level 5 → Level 6: creativity +5', time: '2 days ago' },
    { title: 'Earned trait: viral_instinct', time: '6 days ago' },
    { title: 'Level 4 → Level 5: consistency +5', time: '10 days ago' }
  ];
}
