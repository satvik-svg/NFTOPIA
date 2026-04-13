import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Web3Service } from '../services/web3.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const web3 = inject(Web3Service);
  const router = inject(Router);

  if (web3.isConnected()) {
    return true;
  }

  return router.createUrlTree(['/'], {
    queryParams: { redirect: state.url }
  });
};
