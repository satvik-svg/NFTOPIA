import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AgentType, ForgeRequest } from '../../core/models/agent.model';
import { AgentService } from '../../core/services/agent.service';
import { NotificationService } from '../../core/services/notification.service';
import { Web3Service } from '../../core/services/web3.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { DnaPreviewComponent } from './components/dna-preview.component';
import { SpecializationPickerComponent } from './components/specialization-picker.component';
import { TypeSelectorComponent } from './components/type-selector.component';

@Component({
  selector: 'app-forge',
  standalone: true,
  imports: [NgIf, TypeSelectorComponent, SpecializationPickerComponent, DnaPreviewComponent, LoadingSpinnerComponent],
  template: `
    <section class="mx-auto max-w-5xl space-y-7">
      <header class="page-header">
        <p class="section-kicker">Create</p>
        <h1>Forge New Agent</h1>
        <p>Choose your agent class, specialization, and mint your AI business as an NFT.</p>
      </header>

      <div class="glass-card--glow space-y-8 p-8 sm:p-10">
        <!-- Step 1 -->
        <div class="animate-fade-up">
          <p class="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Step 1 · Choose Type</p>
          <app-type-selector [selection]="agentType()" (select)="selectType($event)"></app-type-selector>
        </div>

        <!-- Step 2 -->
        <div *ngIf="agentType()" class="animate-fade-up">
          <p class="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Step 2 · Specialization</p>
          <app-specialization-picker
            [options]="specializations()"
            [selected]="specialization()"
            (select)="specialization.set($event)"
          ></app-specialization-picker>
        </div>

        <!-- Step 3 -->
        <div *ngIf="specialization()" class="animate-fade-up">
          <p class="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Step 3 · DNA Preview</p>
          <app-dna-preview [specialization]="specialization()"></app-dna-preview>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
          <button class="btn-ghost" (click)="connectWallet()" *ngIf="!web3.isConnected()" [disabled]="isConnecting() || isMinting()">
            {{ isConnecting() ? 'Connecting...' : 'Connect Wallet' }}
          </button>
          <button class="btn-forge" (click)="forge()" [disabled]="isMinting() || isConnecting()">Forge This Agent ✦</button>
          <app-loading-spinner *ngIf="isMinting()" label="Minting and finalizing on-chain DNA..."></app-loading-spinner>
          <p class="text-xs text-slate-400" *ngIf="!canMint()">Choose both agent type and specialization before forging.</p>
        </div>
      </div>
    </section>
  `
})
export class ForgeComponent {
  private readonly agentService = inject(AgentService);
  private readonly notify = inject(NotificationService);
  readonly web3 = inject(Web3Service);
  private readonly router = inject(Router);

  readonly agentType = signal<AgentType | null>(null);
  readonly specialization = signal('');
  readonly isMinting = signal(false);
  readonly isConnecting = signal(false);

  readonly specializations = computed(() =>
    this.agentType() === 'content'
      ? this.agentService.getContentSpecializations()
      : this.agentType() === 'trading'
        ? this.agentService.getTradingSpecializations()
        : []
  );

  readonly canMint = computed(() => !!this.agentType() && !!this.specialization());

  selectType(value: AgentType): void {
    if (value === 'trading') {
      this.router.navigateByUrl('/trading');
      return;
    }
    this.agentType.set(value);
    this.specialization.set('');
  }

  async connectWallet(): Promise<void> {
    if (this.web3.isConnected()) return;
    this.isConnecting.set(true);
    try {
      await this.web3.connectWallet();
      this.notify.success('Wallet connected');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet connection failed';
      this.notify.error(message);
    } finally {
      this.isConnecting.set(false);
    }
  }

  private async ensureWalletConnected(): Promise<string | null> {
    const wallet = this.web3.walletAddress();
    if (wallet) return wallet;
    await this.connectWallet();
    return this.web3.walletAddress();
  }

  async forge(): Promise<void> {
    const wallet = await this.ensureWalletConnected();
    const selectedType = this.agentType();
    const selectedSpecialization = this.specialization();

    if (!wallet || !selectedType || !selectedSpecialization) {
      if (!wallet) this.notify.warning('Connect your wallet to continue');
      else this.notify.warning('Complete all steps before minting');
      return;
    }

    this.isMinting.set(true);

    // Step 1: Trigger MetaMask popup for mint fee confirmation
    let txHash: string;
    try {
      this.notify.info('Confirm the mint fee in your wallet...');
      txHash = await this.web3.sendMintFee('0.01');
      this.notify.success('Mint fee confirmed! Forging agent on-chain...');
    } catch (err) {
      this.isMinting.set(false);
      const msg = err instanceof Error ? err.message : 'Transaction rejected';
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        this.notify.warning('Transaction was rejected by user');
      } else {
        this.notify.error(`Wallet error: ${msg}`);
      }
      return;
    }

    // Step 2: Backend forge (registers agent in DB + optional on-chain mint)
    const payload: ForgeRequest = {
      agentType: selectedType,
      specialization: selectedSpecialization,
      ownerAddress: wallet
    };

    this.agentService
      .forgeAgent(payload)
      .pipe(finalize(() => this.isMinting.set(false)))
      .subscribe({
        next: (res) => {
          this.notify.success(`Agent #${res.tokenId} forged successfully! Tx: ${txHash.slice(0, 10)}...`);
          const nextRoute = selectedType === 'content' ? `/studio/${res.tokenId}` : '/trading';
          this.router.navigateByUrl(nextRoute);
        },
        error: (error: HttpErrorResponse) => {
          const detail = typeof error.error?.detail === 'string' ? error.error.detail : error.message;
          this.notify.error(`Forge failed: ${detail}`);
        }
      });
  }
}
