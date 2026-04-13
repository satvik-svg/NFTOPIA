import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { Web3Service } from '../services/web3.service';

export const agentOwnerGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const web3 = inject(Web3Service);
  const router = inject(Router);

  if (!web3.isConnected()) {
    return router.createUrlTree(['/']);
  }

  const tokenId = route.paramMap.get('agentId');
  if (!tokenId) {
    return router.createUrlTree(['/dashboard']);
  }

  // Ownership check is finalized when backend ownership endpoint is active.
  return true;
};
