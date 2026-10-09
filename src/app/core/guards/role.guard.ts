import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';

/**
 * Bloquea el acceso a una ruta cuando el rol del usuario no está incluido en
 * `route.data.roles`. Redirige al dashboard con un mensaje claro.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const roles = route.data?.['roles'] as string[] | undefined;
  if (!roles || roles.length === 0) {
    return true;
  }

  const role = auth.currentUser()?.role;
  if (role && roles.includes(role)) {
    return true;
  }

  snackBar.open('No tienes permisos para acceder a esta sección.', 'Cerrar', {
    duration: 5000,
    horizontalPosition: 'right',
    verticalPosition: 'top',
  });
  return router.createUrlTree(['/dashboard']);
};
