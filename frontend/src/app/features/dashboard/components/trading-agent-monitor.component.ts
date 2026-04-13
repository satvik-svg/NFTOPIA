import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { AgentConfig } from '../../../core/models/agent.model';

interface TrainingParam {
  name: string;
  value: number;
  target: number;
  unit: string;
}

interface AgentTrainingState {
  tokenId: number;
  timeRemaining: string;
  overallProgress: number;
  params: TrainingParam[];
  endTime: number;
}

const PARAM_TEMPLATES: { name: string; target: number; unit: string }[] = [
  { name: 'Normalized Price', target: 0.85, unit: '' },
  { name: 'Change 1d', target: 2.4, unit: '%' },
  { name: 'Change 7d', target: 8.7, unit: '%' },
  { name: 'RSI Proxy', target: 0.62, unit: '' },
  { name: 'Volume Ratio', target: 1.35, unit: '' },
  { name: 'Balance Ratio', target: 0.92, unit: '' },
  { name: 'Position Ratio', target: 0.45, unit: '' },
  { name: 'Unrealized PnL', target: 3.8, unit: '%' },
  { name: 'Step Progress', target: 1.0, unit: '' },
  { name: 'Trade Count Norm.', target: 0.72, unit: '' },
  { name: 'Portfolio Ratio', target: 1.15, unit: '' },
  { name: 'High Deviation', target: 0.03, unit: '' },
  { name: 'Low Deviation', target: 0.02, unit: '' },
  { name: 'Open Deviation', target: 0.01, unit: '' },
  { name: 'Volume Normalized', target: 0.48, unit: '' },
];

@Component({
  selector: 'app-trading-agent-monitor',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  template: `
    <section class="space-y-4" *ngIf="tradingAgents.length > 0">
      <h2 class="font-display text-2xl text-white">Trading Agent Monitor</h2>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div *ngFor="let state of agentStates" class="glass-card p-5 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-display text-lg text-white">Agent #{{ state.tokenId }}</h3>
              <p class="text-xs text-forge-muted">custom_rl_trader -- trading</p>
            </div>
            <div class="rounded-lg border border-forge-secondary/30 bg-forge-secondary/10 px-3 py-1">
              <span class="text-xs font-mono text-forge-secondary">Training</span>
            </div>
          </div>

          <div class="rounded-xl border border-forge-border bg-[#091825] p-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-forge-muted">Time remaining</span>
              <span class="font-mono text-forge-warning">{{ state.timeRemaining }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-forge-muted">Overall progress</span>
              <span class="font-mono text-forge-secondary">{{ state.overallProgress | number:'1.1-1' }}%</span>
            </div>
            <div class="w-full rounded-full bg-[#0a1a28] h-2 mt-1">
              <div class="h-2 rounded-full bg-gradient-to-r from-forge-primary to-forge-secondary transition-all duration-500"
                [style.width.%]="state.overallProgress"></div>
            </div>
          </div>

          <div class="rounded-xl border border-forge-border bg-[#091825] p-4">
            <p class="text-xs uppercase text-forge-muted mb-3">Observation Vector (15 dimensions)</p>
            <div class="grid grid-cols-1 gap-2">
              <div *ngFor="let param of state.params" class="flex items-center justify-between text-xs">
                <span class="text-slate-400 w-40 truncate">{{ param.name }}</span>
                <div class="flex-1 mx-3 rounded-full bg-[#0a1a28] h-1.5">
                  <div class="h-1.5 rounded-full transition-all duration-700"
                    [style.width.%]="(param.value / param.target) * 100"
                    [class]="param.value >= param.target * 0.8 ? 'bg-forge-secondary' : 'bg-forge-primary'"></div>
                </div>
                <span class="font-mono text-slate-300 w-20 text-right">{{ param.value | number:'1.3-3' }}{{ param.unit }}</span>
              </div>
            </div>
          </div>

          <button class="btn-forge w-full" (click)="allocate.emit(getAgent(state.tokenId))">Allocate Funds</button>
        </div>
      </div>
    </section>
  `
})
export class TradingAgentMonitorComponent implements OnInit, OnChanges, OnDestroy {
  @Input() tradingAgents: AgentConfig[] = [];
  @Output() allocate = new EventEmitter<AgentConfig>();

  agentStates: AgentTrainingState[] = [];
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private paramInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.buildStates();
    this.startSimulation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tradingAgents']) {
      this.buildStates();
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.paramInterval) clearInterval(this.paramInterval);
  }

  getAgent(tokenId: number): AgentConfig {
    return this.tradingAgents.find(a => a.tokenId === tokenId) || this.tradingAgents[0];
  }

  private buildStates(): void {
    const existingMap = new Map(this.agentStates.map(s => [s.tokenId, s]));

    this.agentStates = this.tradingAgents.map((agent, index) => {
      // If we already track this agent, keep its state
      const existing = existingMap.get(agent.tokenId);
      if (existing) return existing;

      // Determine starting progress based on position (older agents = further along)
      // Reverse index: first agent in list is oldest
      const totalAgents = this.tradingAgents.length;
      const ageRank = totalAgents - index; // oldest = highest rank

      let startProgress: number;
      if (ageRank >= 3) {
        // Oldest agents: ~35-45% done
        startProgress = 35 + Math.random() * 10;
      } else if (ageRank === 2) {
        // Second oldest: ~15-25% done
        startProgress = 15 + Math.random() * 10;
      } else {
        // Newest agent: start from 0
        startProgress = 0;
      }

      // Time remaining is proportional: 5 days total, subtract elapsed
      const totalMs = 5 * 24 * 60 * 60 * 1000;
      const elapsedMs = (startProgress / 100) * totalMs;
      const endTime = Date.now() + (totalMs - elapsedMs);

      // Build params with starting values based on progress
      const params = PARAM_TEMPLATES.map(t => ({
        name: t.name,
        target: t.target,
        unit: t.unit,
        value: t.target * (startProgress / 100) * (0.85 + Math.random() * 0.3)
      }));

      return {
        tokenId: agent.tokenId,
        timeRemaining: '5d 00h 00m 00s',
        overallProgress: startProgress,
        params,
        endTime
      };
    });
  }

  private startSimulation(): void {
    // Timer: update all agent countdowns every 1 second (real-time)
    this.timerInterval = setInterval(() => {
      for (const state of this.agentStates) {
        const remaining = Math.max(0, state.endTime - Date.now());
        const d = Math.floor(remaining / 86400000);
        const h = Math.floor((remaining % 86400000) / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        state.timeRemaining = `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
      }
    }, 1000);

    // Parameters: update every 5 seconds with tiny increments per agent
    this.paramInterval = setInterval(() => {
      for (const state of this.agentStates) {
        let totalProgress = 0;

        state.params = state.params.map(param => {
          const gap = param.target - param.value;
          const step = gap * (0.0002 + Math.random() * 0.0004);
          const jitter = (Math.random() < 0.15) ? -(step * 0.3 * Math.random()) : 0;
          const newValue = Math.max(0, param.value + step + jitter);

          totalProgress += Math.min(100, (newValue / param.target) * 100);
          return { ...param, value: newValue };
        });

        state.overallProgress = totalProgress / state.params.length;
      }
    }, 5000);
  }
}
