import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WalletButtonComponent } from '../wallet-button/wallet-button.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, WalletButtonComponent],
  template: `
    <header class="fixed inset-x-0 top-0 z-50 border-b border-nft-border/40 bg-white/70 backdrop-blur-2xl transition-all">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-6 lg:px-10">
        <!-- Brand -->
        <a routerLink="/" class="group flex items-center gap-2.5">
          <img src="assets/nftopia-mark-large.svg" alt="NFTOPIA Logo" class="h-9 w-auto" />
          <span class="font-display text-lg font-extrabold tracking-tight text-nft-darker">NFTOPIA</span>
        </a>

        <!-- Nav Links — matching OLD navbar order -->
        <nav class="hidden items-center gap-1 md:flex">
          <a routerLink="/forge" routerLinkActive="nav-link--active" class="nav-link">Forge</a>
          <a routerLink="/marketplace" routerLinkActive="nav-link--active" class="nav-link">Marketplace</a>
          <a routerLink="/trading" routerLinkActive="nav-link--active" class="nav-link">Trading</a>
          <a routerLink="/dashboard" routerLinkActive="nav-link--active" class="nav-link">My Empire</a>
          <a routerLink="/rental" routerLinkActive="nav-link--active" class="nav-link">Rental</a>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-3">
          <app-wallet-button></app-wallet-button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .nav-link {
      position: relative;
      padding: 6px 2px;
      margin: 0 14px;
      font-size: 14px;
      font-weight: 500;
      color: #64748B;
      transition: all 0.2s ease;
      letter-spacing: 0.01em;
    }

    .nav-link::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: #0F172A;
      border-radius: 2px;
      transform: scaleX(0);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .nav-link:hover {
      color: #0F172A;
    }

    .nav-link:hover::after {
      transform: scaleX(0.3);
      opacity: 0.5;
    }

    .nav-link--active {
      color: #0F172A !important;
      font-weight: 700;
    }
    
    .nav-link--active::after {
      transform: scaleX(1);
      opacity: 1;
    }
  `]
})
export class NavbarComponent {}
