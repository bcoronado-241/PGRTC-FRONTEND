import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { errorMessage } from '../services/http.util';

/**
 * Captura errores HTTP, los traduce a mensajes legibles y los muestra con
 * MatSnackBar. Nunca expone stack traces ni HTML del backend.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const isAuthForm = req.url.includes('/auth/login') || req.url.includes('/auth/register');

        if (error.status === 401 && !isAuthForm) {
          auth.logout();
          snackBar.open('Tu sesión expiró. Inicia sesión nuevamente.', 'Cerrar', {
            duration: 6000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        } else if (!isAuthForm) {
          snackBar.open(errorMessage(error), 'Cerrar', {
            duration: 6000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
