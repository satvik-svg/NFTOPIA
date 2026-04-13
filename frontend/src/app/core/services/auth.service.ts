import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Web3Service } from './web3.service';

interface SiwePayload {
  message: string;
  signature: string;
}

interface AuthResponse {
  jwt_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly web3 = inject(Web3Service);

  private readonly _token = signal<string | null>(localStorage.getItem('agentforge_token'));

  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && this.web3.isConnected());

  signIn(payload: SiwePayload) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/siwe`, payload).pipe(
      tap((response) => {
        this._token.set(response.jwt_token);
        localStorage.setItem('agentforge_token', response.jwt_token);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('agentforge_token');
    this._token.set(null);
    this.web3.disconnectWallet();
  }
}
