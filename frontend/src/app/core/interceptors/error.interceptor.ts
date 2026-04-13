import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message =
        error.error?.detail ||
        error.error?.message ||
        `Request failed (${error.status || 'network error'})`;

      if (!req.url.includes('/stats/platform')) {
        notify.error(message);
      }

      return throwError(() => error);
    })
  );
};
