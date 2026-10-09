import { Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';
import { Center } from '../../core/models';
import { CentersService, CenterPayload } from '../../core/services/centers.service';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/services/http.util';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-centers',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTableModule,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './centers.component.html',
  styleUrl: './centers.component.scss',
})
export class CentersComponent implements OnInit {
  private readonly service = inject(CentersService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly searchTerm = new Subject<string>();
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) private paginator?: MatPaginator;

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly displayedColumns = ['centerName', 'type', 'latitude', 'longitude', 'status', 'actions'];
  protected readonly centers = signal<Center[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly search = signal('');
  protected readonly status = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'red', label: 'Crítico' },
    { value: 'yellow', label: 'En alerta' },
    { value: 'green', label: 'Estable' },
  ];

  constructor() {
    this.searchTerm
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.search.set(term);
        this.page.set(0);
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.load();
      });
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.status.set((params.get('status') ?? '').trim());
        this.page.set(0);
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.load();
      });
  }

  protected onSearchInput(value: string): void {
    this.searchTerm.next(value);
  }

  protected onStatusChange(value: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: value ? { status: value } : { status: null },
      queryParamsHandling: 'merge',
    });
  }

  protected statusLabel(): string {
    return this.statusOptions.find((option) => option.value === this.status())?.label ?? '';
  }

  protected typeLabel(type: string): string {
    const key = (type ?? '').trim().toLowerCase();
    const labels: Record<string, string> = {
      hospital: 'Hospital',
      collection_center: 'Centro de acopio',
      shelter: 'Albergue',
      clinic: 'Clínica',
      warehouse: 'Almacén',
    };
    if (labels[key]) {
      return labels[key];
    }
    if (!key) {
      return '—';
    }
    return key
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const status = this.status();
    this.service
      .list({
        search: this.search(),
        page: status ? 1 : this.page() + 1,
        limit: status ? 100 : this.pageSize(),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          if (status) {
            // El backend no soporta filtrar por estado: se filtra en cliente
            // sobre el conjunto completo y se pagina localmente.
            const filtered = result.items.filter((center) => center.status === status);
            const start = this.page() * this.pageSize();
            this.centers.set(filtered.slice(start, start + this.pageSize()));
            this.total.set(filtered.length);
          } else {
            this.centers.set(result.items);
            this.total.set(result.total);
          }
        },
        error: (err: unknown) => {
          this.error.set(errorMessage(err, 'No se pudieron cargar los centros.'));
        },
      });
  }

  protected openForm(center?: Center): void {
    const ref = this.dialog.open(CenterFormDialog, {
      width: '460px',
      maxWidth: '95vw',
      data: { center: center ?? null },
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.notify(center ? 'Centro actualizado.' : 'Centro creado.');
        this.load();
      }
    });
  }

  protected confirmDelete(center: Center): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        title: 'Eliminar centro',
        message: `¿Seguro que deseas eliminar "${center.centerName}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.service.delete(center.id).subscribe({
          next: () => {
            this.notify('Centro eliminado.');
            this.load();
          },
        });
      }
    });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}

@Component({
  selector: 'app-center-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar centro' : 'Nuevo centro' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()" novalidate>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del centro</mat-label>
          <input matInput type="text" formControlName="centerName" />
          @if (form.controls.centerName.touched && form.controls.centerName.invalid) {
            <mat-error>El nombre es obligatorio.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo</mat-label>
          <input matInput type="text" formControlName="type" placeholder="Hospital, albergue, comedor…" />
          @if (form.controls.type.touched && form.controls.type.invalid) {
            <mat-error>El tipo es obligatorio.</mat-error>
          }
        </mat-form-field>

        <div class="dialog-grid">
          <mat-form-field appearance="outline">
            <mat-label>Latitud</mat-label>
            <input matInput type="number" formControlName="latitude" />
            @if (form.controls.latitude.touched && form.controls.latitude.hasError('required')) {
              <mat-error>Obligatoria.</mat-error>
            } @else if (
              form.controls.latitude.touched && form.controls.latitude.hasError('min')
            ) {
              <mat-error>Mínimo -90.</mat-error>
            } @else if (
              form.controls.latitude.touched && form.controls.latitude.hasError('max')
            ) {
              <mat-error>Máximo 90.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Longitud</mat-label>
            <input matInput type="number" formControlName="longitude" />
            @if (form.controls.longitude.touched && form.controls.longitude.hasError('required')) {
              <mat-error>Obligatoria.</mat-error>
            } @else if (
              form.controls.longitude.touched && form.controls.longitude.hasError('min')
            ) {
              <mat-error>Mínimo -180.</mat-error>
            } @else if (
              form.controls.longitude.touched && form.controls.longitude.hasError('max')
            ) {
              <mat-error>Máximo 180.</mat-error>
            }
          </mat-form-field>
        </div>

        @if (error()) {
          <p class="dialog-error" role="alert">{{ error() }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()" [disabled]="saving()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="save()" [disabled]="saving()">
        {{ saving() ? 'Guardando…' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 8px;
      min-width: 320px;
    }
    .dialog-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .dialog-error {
      margin: 0;
      padding: 8px 10px;
      border-radius: 8px;
      background: #fef2f2;
      color: #991b1b;
      font-size: 0.85rem;
    }
    @media (max-width: 420px) {
      .dialog-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class CenterFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CentersService);
  private readonly dialogRef = inject(MatDialogRef<CenterFormDialog>);
  protected readonly data = inject<{ center: Center | null }>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data?.center;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    centerName: ['', [Validators.required]],
    type: ['', [Validators.required]],
    latitude: [null as number | null, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [null as number | null, [Validators.required, Validators.min(-180), Validators.max(180)]],
  });

  constructor() {
    const center = this.data?.center;
    if (center) {
      this.form.patchValue({
        centerName: center.centerName,
        type: center.type,
        latitude: Number(center.latitude),
        longitude: Number(center.longitude),
      });
    }
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const payload: CenterPayload = {
      centerName: raw.centerName ?? '',
      type: raw.type ?? '',
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
    };

    const request$ = this.isEdit
      ? this.service.update(this.data.center!.id, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(true);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'No se pudo guardar el centro.'));
      },
    });
  }
}
