import { NgFor } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AgentConfig } from '../../../core/models/agent.model';
import { AgentCardComponent } from '../../../shared/components/agent-card/agent-card.component';

@Component({
  selector: 'app-agent-roster',
  standalone: true,
  imports: [NgFor, AgentCardComponent],
  template: `
    <section class="space-y-5">
      <h2 class="font-display text-2xl font-bold text-nft-darker">Agent Roster</h2>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <app-agent-card *ngFor="let agent of agents" [agent]="agent" [showActions]="true"></app-agent-card>
      </div>
    </section>
  `
})
export class AgentRosterComponent {
  @Input() agents: AgentConfig[] = [];
}
