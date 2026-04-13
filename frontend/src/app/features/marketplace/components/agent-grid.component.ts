import { NgFor } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AgentConfig } from '../../../core/models/agent.model';
import { AgentCardComponent } from '../../../shared/components/agent-card/agent-card.component';

@Component({
  selector: 'app-agent-grid',
  standalone: true,
  imports: [NgFor, AgentCardComponent],
  template: `
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <app-agent-card *ngFor="let agent of agents" [agent]="agent" [showActions]="true" (onClick)="open.emit($event)"></app-agent-card>
    </div>
  `
})
export class AgentGridComponent {
  @Input() agents: AgentConfig[] = [];
  @Output() open = new EventEmitter<number>();
}
