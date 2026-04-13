import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Web3Service } from '../services/web3.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const web3 = inject(Web3Service);

  const token = auth.token();
  const wallet = web3.walletAddress();

  let headers = req.headers;
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  if (wallet) {
    headers = headers.set('x-wallet-address', wallet);
  }

  return next(req.clone({ headers }));
};
