import { Injectable } from '@angular/core';
import { Observable, retry, share } from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private readonly connections = new Map<string, WebSocketSubject<unknown>>();

  connect(channel: string): Observable<unknown> {
    if (!this.connections.has(channel)) {
      const ws = webSocket(`${environment.wsUrl}/${channel}`);
      this.connections.set(channel, ws);
    }

    return this.connections.get(channel)!.pipe(retry({ delay: 3000 }), share());
  }

  subscribeTradingFeed(agentTokenId: number): Observable<unknown> {
    return this.connect(`trading/${agentTokenId}`);
  }

  subscribeTrainingFeed(trainingId: string): Observable<unknown> {
    return this.connect(`training/${trainingId}`);
  }

  subscribeMarketplaceFeed(): Observable<unknown> {
    return this.connect('marketplace');
  }

  disconnect(channel: string): void {
    const ws = this.connections.get(channel);
    if (!ws) {
      return;
    }

    ws.complete();
    this.connections.delete(channel);
  }

  disconnectAll(): void {
    this.connections.forEach((ws) => ws.complete());
    this.connections.clear();
  }
}
