import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private push(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    // Notifications disabled per user request
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  success(message: string, title = 'Success'): void {
    this.push(`${title}: ${message}`, 'success');
  }

  error(message: string, title = 'Error'): void {
    this.push(`${title}: ${message}`, 'error');
  }

  info(message: string, title = 'Info'): void {
    this.push(`${title}: ${message}`, 'info');
  }

  warning(message: string, title = 'Warning'): void {
    this.push(`${title}: ${message}`, 'warning');
  }
}
