import { NgFor, NgIf } from '@angular/common';
import { Component, inject, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgentConfig } from '../../core/models/agent.model';
import { AgentService } from '../../core/services/agent.service';
import { NotificationService } from '../../core/services/notification.service';
import { Web3Service } from '../../core/services/web3.service';
import { AgentRosterComponent } from './components/agent-roster.component';
import { PortfolioOverviewComponent } from './components/portfolio-overview.component';
import { TradingAgentMonitorComponent } from './components/trading-agent-monitor.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgIf, NgFor, FormsModule,
    PortfolioOverviewComponent, AgentRosterComponent,
    TradingAgentMonitorComponent
  ],
  template: `
    <section class="mx-auto max-w-7xl space-y-8">
      <header class="page-header">
        <p class="section-kicker">Overview</p>
        <h1>My Empire</h1>
      </header>

      <app-portfolio-overview [agentsOwned]="agents().length.toString()" forgeBalance="0 $FORGE" allTimeEarnings="0 $FORGE" passiveRate="0 $FORGE"></app-portfolio-overview>
      <app-agent-roster *ngIf="agents().length > 0" [agents]="agents()"></app-agent-roster>
      <div *ngIf="agents().length === 0" class="glass-card--glow flex flex-col items-center justify-center py-12 text-center">
         <p class="text-slate-500 text-lg mb-2">You don't own any agents yet.</p>
         <a href="/forge" class="btn-forge">Go to Forge</a>
      </div>

      <app-trading-agent-monitor
        *ngIf="tradingAgents().length > 0"
        [tradingAgents]="tradingAgents()"
        (allocate)="openAllocateModal($event)"
      ></app-trading-agent-monitor>

      <!-- Allocate Funds Modal -->
      <div *ngIf="allocatingAgent()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" (click)="allocatingAgent.set(null)">
        <div class="glass-card w-full max-w-md p-6 space-y-5" (click)="$event.stopPropagation()">
          <h3 class="font-display text-xl font-bold text-nft-text">Allocate Funds</h3>
          <p class="text-sm text-nft-muted">Agent #{{ allocatingAgent()!.tokenId }} -- {{ allocatingAgent()!.specialization }}</p>

          <div>
            <label class="block text-xs uppercase font-semibold text-nft-muted mb-1.5">Amount ($FORGE)</label>
            <input
              type="number"
              class="input-light font-mono"
              [(ngModel)]="allocateAmount"
              placeholder="Enter amount to allocate"
              min="1"
            />
          </div>

          <div class="flex gap-3 pt-2">
            <button class="btn-ghost flex-1 !rounded-full" (click)="allocatingAgent.set(null)">Cancel</button>
            <button class="btn-forge flex-1 !rounded-full" (click)="confirmAllocate()" [disabled]="!allocateAmount || allocateAmount <= 0">Allocate</button>
          </div>
        </div>
      </div>


    </section>
  `
})
export class DashboardComponent {
  private agentService = inject(AgentService);
  private web3Service = inject(Web3Service);
  private notify = inject(NotificationService);


  readonly allocatingAgent = signal<AgentConfig | null>(null);

  readonly agents = signal<AgentConfig[]>([]);
  readonly tradingAgents = signal<AgentConfig[]>([]);
  allocateAmount = 100;

  constructor() {
    effect(() => {
      const address = this.web3Service.walletAddress();
      if (address) {
        this.agentService.getMyAgents(address).subscribe(data => {
          this.agents.set(data);
          this.tradingAgents.set(data.filter(a => a.agentType === 'trading'));
        });
      } else {
        this.agents.set([]);
        this.tradingAgents.set([]);
      }
    }, { allowSignalWrites: true });
  }

  openAllocateModal(agent: AgentConfig): void {
    this.allocateAmount = 100;
    this.allocatingAgent.set(agent);
  }

  async confirmAllocate(): Promise<void> {
    const agent = this.allocatingAgent();
    if (!agent || !this.allocateAmount || this.allocateAmount <= 0) return;

    // Trigger wallet popup
    try {
      this.notify.info('Confirm allocation in your wallet...');
      await this.web3Service.sendMintFee('0.005');
      this.notify.success(`${this.allocateAmount} $FORGE allocated to Agent #${agent.tokenId}`);
      this.allocatingAgent.set(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction rejected';
      if (msg.includes('rejected') || msg.includes('denied')) {
        this.notify.warning('Allocation cancelled by user');
      } else {
        this.notify.error(`Wallet error: ${msg}`);
      }
    }
  }
}
