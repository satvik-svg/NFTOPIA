import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgentConfig } from '../../../core/models/agent.model';
import { AgentService } from '../../../core/services/agent.service';
import { Web3Service } from '../../../core/services/web3.service';

@Component({
  selector: 'app-rental-listing-form',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `
    <div class="glass-card p-6">
      <h2 class="font-display text-2xl font-bold text-nft-text">List Agent For Rent</h2>
      <div class="mt-4 grid grid-cols-1 gap-4">
        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-nft-muted">Select Agent</label>
          <select class="input-light" [(ngModel)]="tokenId">
            <option [value]="0" *ngIf="myAgents.length === 0">No agents found</option>
            <option *ngFor="let agent of myAgents" [value]="agent.tokenId">
              Agent #{{ agent.tokenId }} — {{ agent.specialization }} ({{ agent.agentType }})
            </option>
          </select>
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-nft-muted">Price per day ($FORGE)</label>
          <input type="number" min="1" class="input-light" [(ngModel)]="pricePerDay" />
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-nft-muted">Max duration (days)</label>
          <input type="number" min="1" max="30" class="input-light" [(ngModel)]="maxDuration" />
        </div>

        <button class="btn-forge" (click)="submit()" [disabled]="!tokenId">Create Listing</button>
      </div>
    </div>
  `
})
export class RentalListingFormComponent {
  @Output() createListing = new EventEmitter<{ tokenId: number; pricePerDay: number; maxDuration: number }>();

  private readonly agentService = inject(AgentService);
  private readonly web3 = inject(Web3Service);

  myAgents: AgentConfig[] = [];
  tokenId = 0;
  pricePerDay = 25;
  maxDuration = 7;

  constructor() {
    effect(() => {
      const address = this.web3.walletAddress();
      if (address) {
        this.agentService.getMyAgents(address).subscribe(agents => {
          this.myAgents = agents;
          if (agents.length > 0 && !this.tokenId) {
            this.tokenId = agents[0].tokenId;
          }
        });
      } else {
        this.myAgents = [];
        this.tokenId = 0;
      }
    });
  }

  submit(): void {
    if (!this.tokenId) return;
    this.createListing.emit({
      tokenId: this.tokenId,
      pricePerDay: this.pricePerDay,
      maxDuration: this.maxDuration
    });
  }
}
