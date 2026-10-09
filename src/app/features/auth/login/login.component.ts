import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { errorMessage } from '../../../core/services/http.util';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
  ],
  template: `
    <div class="auth-shell">
      <section class="auth-panel">
        <div class="auth-card">
          <h1 class="auth-heading">Iniciar sesión</h1>
          <p class="auth-subheading">
            Accede para monitorear y redistribuir recursos en tiempo real.
          </p>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Correo electrónico</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              @if (form.controls.email.touched && form.controls.email.hasError('required')) {
                <mat-error>El correo es obligatorio.</mat-error>
              } @else if (form.controls.email.touched && form.controls.email.hasError('email')) {
                <mat-error>Ingresa un correo válido.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Contraseña</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                autocomplete="current-password"
              />
              @if (form.controls.password.touched && form.controls.password.hasError('required')) {
                <mat-error>La contraseña es obligatoria.</mat-error>
              }
            </mat-form-field>

            @if (error()) {
              <p class="auth-error" role="alert">{{ error() }}</p>
            }

            <button mat-flat-button class="auth-submit" type="submit" [disabled]="loading()">
              {{ loading() ? 'Ingresando…' : 'Ingresar' }}
            </button>
          </form>

          <p class="auth-alt">¿No tienes cuenta? <a routerLink="/register">Regístrate</a></p>
        </div>
      </section>

      <aside class="auth-hero">
        <svg
          class="auth-hero__svg"
          viewBox="0 0 320 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Red de centros de emergencia conectados"
        >
          <g stroke="#ffffff" stroke-opacity="0.45" stroke-width="2">
            <line x1="160" y1="110" x2="70" y2="55" />
            <line x1="160" y1="110" x2="250" y2="55" />
            <line x1="160" y1="110" x2="60" y2="165" />
            <line x1="160" y1="110" x2="258" y2="168" />
          </g>
          <g fill="#ffffff" fill-opacity="0.16" stroke="#ffffff" stroke-opacity="0.5">
            <circle cx="70" cy="55" r="16" />
            <circle cx="250" cy="55" r="16" />
            <circle cx="60" cy="165" r="16" />
            <circle cx="258" cy="168" r="16" />
          </g>
          <circle
            cx="160"
            cy="110"
            r="42"
            fill="#ffffff"
            fill-opacity="0.12"
            stroke="#ffffff"
            stroke-opacity="0.65"
            stroke-width="2"
          />
          <rect x="152" y="86" width="16" height="48" rx="4" fill="#f97316" />
          <rect x="136" y="102" width="48" height="16" rx="4" fill="#f97316" />
          <g fill="#f97316">
            <circle cx="70" cy="55" r="5" />
            <circle cx="250" cy="55" r="5" />
            <circle cx="60" cy="165" r="5" />
            <circle cx="258" cy="168" r="5" />
          </g>
        </svg>
        <h2 class="auth-hero__title">PGRTC</h2>
        <p class="auth-hero__tagline">
          Plataforma de gestión de recursos y trazabilidad de la red de centros de emergencia.
        </p>
        <div class="auth-hero__badges">
          <span class="auth-hero__badge">Centros</span>
          <span class="auth-hero__badge">Inventario</span>
          <span class="auth-hero__badge">Redistribución</span>
        </div>
      </aside>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required]),
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'No se pudo iniciar sesión. Revisa tus credenciales.'));
      },
    });
  }
}
