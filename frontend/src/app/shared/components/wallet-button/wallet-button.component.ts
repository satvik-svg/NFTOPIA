import { Component, computed, inject, signal } from '@angular/core';
import { Web3Service } from '../../../core/services/web3.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-wallet-button',
  standalone: true,
  template: `
    <button
      class="btn-dark rounded-full px-5 py-2"
      (click)="onClick()"
      [disabled]="loading()"
    >
      {{ label() }}
    </button>
  `
})
export class WalletButtonComponent {
  private readonly web3 = inject(Web3Service);
  private readonly notify = inject(NotificationService);
  readonly loading = signal(false);

  readonly label = computed(() => {
    if (this.loading()) {
      return 'Connecting...';
    }

    if (this.web3.isConnected()) {
      return this.web3.shortAddress();
    }

    return 'Connect Wallet';
  });

  async onClick(): Promise<void> {
    if (this.web3.isConnected()) {
      this.web3.disconnectWallet();
      this.notify.info('Wallet disconnected');
      return;
    }

    this.loading.set(true);
    try {
      await this.web3.connectWallet();
      this.notify.success('Wallet connected');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet connection failed';
      this.notify.error(message);
    } finally {
      this.loading.set(false);
    }
  }
}
