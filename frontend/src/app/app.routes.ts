import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () =>
			import('./features/landing/landing.component').then((m) => m.LandingComponent)
	},
	{
		path: 'forge',
		loadComponent: () => import('./features/forge/forge.component').then((m) => m.ForgeComponent),
		canActivate: [authGuard]
	},
	{
		path: 'studio/:agentId',
		loadComponent: () =>
			import('./features/content-studio/content-studio.component').then((m) => m.ContentStudioComponent),
		canActivate: [authGuard]
	},
	{
		path: 'trading',
		loadComponent: () => import('./features/trading/trading.component').then((m) => m.TradingComponent),
		canActivate: [authGuard]
	},
	{
		path: 'marketplace',
		loadComponent: () =>
			import('./features/marketplace/marketplace.component').then((m) => m.MarketplaceComponent)
	},
	{
		path: 'agent/:tokenId',
		loadComponent: () =>
			import('./features/agent-profile/agent-profile.component').then((m) => m.AgentProfileComponent)
	},
	{
		path: 'dashboard',
		loadComponent: () =>
			import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
		canActivate: [authGuard]
	},
	{
		path: 'rental',
		loadComponent: () => import('./features/rental/rental.component').then((m) => m.RentalComponent),
		canActivate: [authGuard]
	},
	{ path: '**', redirectTo: '' }
];
