import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { errorMessage } from '../../../core/services/http.util';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    EmptyStateComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mi perfil</h1>
          <p class="page-subtitle">Consulta y actualiza tus datos personales.</p>
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Cargando perfil…" />
      } @else if (error()) {
        <div class="table-card state-block">
          <app-empty-state
            title="No se pudo cargar el perfil"
            [message]="error() ?? ''"
            icon="⚠"
          />
          <button mat-stroked-button type="button" (click)="load()">Reintentar</button>
        </div>
      } @else {
        <mat-card class="form-card" appearance="outlined">
          <div class="profile-info">
            <div>
              <span class="profile-label">Correo</span>
              <span class="profile-value">{{ currentUser()?.email }}</span>
            </div>
            <div>
              <span class="profile-label">Rol</span>
              <span class="profile-value">{{ currentUser()?.role }}</span>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()" novalidate class="profile-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre completo</mat-label>
              <input matInput type="text" formControlName="fullName" autocomplete="name" />
              @if (form.controls.fullName.touched && form.controls.fullName.hasError('required')) {
                <mat-error>El nombre es obligatorio.</mat-error>
              } @else if (
                form.controls.fullName.touched && form.controls.fullName.hasError('minlength')
              ) {
                <mat-error>Ingresa al menos 3 caracteres.</mat-error>
              }
            </mat-form-field>

            @if (saveError()) {
              <p class="profile-error" role="alert">{{ saveError() }}</p>
            }

            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || saving()"
            >
              {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </form>
        </mat-card>
      }
    </div>
  `,
  styles: `
    .profile-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .profile-label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #7a8794;
    }
    .profile-value {
      display: block;
      margin-top: 2px;
      font-size: 1rem;
      color: var(--pgrtc-text);
    }
    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 480px;
    }
    .profile-error {
      margin: 0;
      padding: 10px 12px;
      border-radius: 8px;
      background: #fef2f2;
      color: #991b1b;
      font-size: 0.88rem;
    }
  `,
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly currentUser = this.auth.currentUser;
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    fullName: this.fb.control('', [Validators.required, Validators.minLength(3)]),
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.getProfile().subscribe({
      next: (user) => {
        this.form.patchValue({ fullName: user.fullName ?? '' });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'No se pudo cargar el perfil.'));
      },
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    const { fullName } = this.form.getRawValue();

    this.auth.updateProfile(fullName).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Perfil actualizado correctamente.', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.saveError.set(errorMessage(err, 'No se pudo actualizar el perfil.'));
      },
    });
  }
}
