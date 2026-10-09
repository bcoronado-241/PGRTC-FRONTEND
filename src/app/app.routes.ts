import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { NavComponent } from './core/layout/nav.component';
import { LoginComponent } from './features/auth/login/login.component';
import { ProfileComponent } from './features/auth/profile/profile.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { CentersComponent } from './features/centers/centers.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { NotFoundComponent } from './features/not-found/not-found.component';
import { RedistributionComponent } from './features/redistribution/redistribution.component';
import { SuppliesComponent } from './features/supplies/supplies.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: NavComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'centers', component: CentersComponent },
      { path: 'supplies', component: SuppliesComponent },
      {
        path: 'inventory',
        component: InventoryComponent,
        canActivate: [roleGuard],
        data: { roles: ['admin', 'rescuer'] },
      },
      { path: 'redistribution', component: RedistributionComponent },
      { path: 'profile', component: ProfileComponent },
    ],
  },
  { path: '**', component: NotFoundComponent },
];
