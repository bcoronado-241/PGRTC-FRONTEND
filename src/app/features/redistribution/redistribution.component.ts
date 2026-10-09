import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';
import { Center, RedistributionRequest, Supply } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CentersService } from '../../core/services/centers.service';
import { errorMessage, humanize } from '../../core/services/http.util';
import {
  RedistributionService,
  RedistributionPayload,
} from '../../core/services/redistribution.service';
import { SuppliesService } from '../../core/services/supplies.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-redistribution',
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
  templateUrl: './redistribution.component.html',
  styleUrl: './redistribution.component.scss',
})
export class RedistributionComponent implements OnInit {
  private readonly service = inject(RedistributionService);
  private readonly centersService = inject(CentersService);
  private readonly suppliesService = inject(SuppliesService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) private paginator?: MatPaginator;

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly displayedColumns = [
    'source',
    'target',
    'supply',
    'quantity',
    'status',
    'actions',
  ];

  protected readonly requests = signal<RedistributionRequest[]>([]);
  protected readonly centers = signal<Center[]>([]);
  protected readonly supplies = signal<Supply[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'completed', label: 'Completada' },
    { value: 'rejected', label: 'Rechazada' },
  ];

  protected readonly filters = this.fb.group({ status: [''] });

  private readonly centerMap = computed(
    () => new Map(this.centers().map((center) => [String(center.id), center.centerName])),
  );
  private readonly supplyMap = computed(
    () => new Map(this.supplies().map((supply) => [String(supply.id), supply.supplyName])),
  );

  constructor() {
    this.filters.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(0);
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.load();
      });
  }

  ngOnInit(): void {
    this.loadCatalogs();
    this.load();
  }

  protected sourceLabel(request: RedistributionRequest): string {
    return (
      request.sourceCenterName ??
      request.sourceCenter?.centerName ??
      request.sourceCenter?.name ??
      this.centerMap().get(String(request.sourceCenterId)) ??
      `Centro #${request.sourceCenterId}`
    );
  }

  protected targetLabel(request: RedistributionRequest): string {
    return (
      request.targetCenterName ??
      request.targetCenter?.centerName ??
      request.targetCenter?.name ??
      this.centerMap().get(String(request.targetCenterId)) ??
      `Centro #${request.targetCenterId}`
    );
  }

  protected supplyLabel(request: RedistributionRequest): string {
    const resolved =
      request.supplyName ??
      request.supply?.supplyName ??
      request.supply?.name ??
      this.supplyMap().get(String(request.supplyId)) ??
      `Insumo #${request.supplyId}`;
    return humanize(resolved);
  }

  protected isPending(request: RedistributionRequest): boolean {
    return String(request.status ?? '').toLowerCase().startsWith('pend');
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const { status } = this.filters.getRawValue();

    this.service
      .list({ status: status || undefined, page: this.page() + 1, limit: this.pageSize() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.requests.set(result.items);
          this.total.set(result.total);
        },
        error: (err: unknown) =>
          this.error.set(errorMessage(err, 'No se pudieron cargar las solicitudes.')),
      });
  }

  protected openForm(): void {
    const ref = this.dialog.open(RedistributionFormDialog, {
      width: '520px',
      maxWidth: '95vw',
      data: { centers: this.centers(), supplies: this.supplies() },
    });
    ref.afterClosed().subscribe((created) => {
      if (created) {
        this.notify('Solicitud de redistribución creada.');
        this.load();
      }
    });
  }

  protected approve(request: RedistributionRequest): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      data: {
        title: 'Aprobar redistribución',
        message: `¿Confirmas aprobar el traslado de ${request.quantity} de "${this.supplyLabel(request)}" desde "${this.sourceLabel(request)}" hacia "${this.targetLabel(request)}"?`,
        confirmText: 'Aprobar',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.service.approve(request.id).subscribe({
          next: () => {
            this.notify('Solicitud aprobada.');
            this.load();
          },
        });
      }
    });
  }

  protected reject(request: RedistributionRequest): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      data: {
        title: 'Rechazar redistribución',
        message: `¿Confirmas rechazar esta solicitud de "${this.supplyLabel(request)}"?`,
        confirmText: 'Rechazar',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.service.reject(request.id).subscribe({
          next: () => {
            this.notify('Solicitud rechazada.');
            this.load();
          },
        });
      }
    });
  }

  private loadCatalogs(): void {
    this.centersService.list({ page: 1, limit: 100 }).subscribe({
      next: (result) => this.centers.set(result.items),
    });
    this.suppliesService.list({ page: 1, limit: 100 }).subscribe({
      next: (result) => this.supplies.set(result.items),
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
  selector: 'app-redistribution-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Nueva solicitud de redistribución</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()" novalidate>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Centro de origen</mat-label>
          <mat-select formControlName="sourceCenterId">
            @for (center of data.centers; track center.id) {
              <mat-option [value]="center.id">{{ center.centerName }}</mat-option>
            }
          </mat-select>
          @if (form.controls.sourceCenterId.touched && form.controls.sourceCenterId.invalid) {
            <mat-error>Selecciona el centro de origen.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Centro de destino</mat-label>
          <mat-select formControlName="targetCenterId">
            @for (center of data.centers; track center.id) {
              <mat-option [value]="center.id">{{ center.centerName }}</mat-option>
            }
          </mat-select>
          @if (form.controls.targetCenterId.touched && form.controls.targetCenterId.invalid) {
            <mat-error>Selecciona el centro de destino.</mat-error>
          }
        </mat-form-field>

        @if (form.hasError('sameCenter')) {
          <p class="dialog-error" role="alert">El centro de origen y destino deben ser distintos.</p>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Insumo</mat-label>
          <mat-select formControlName="supplyId">
            @for (supply of data.supplies; track supply.id) {
              <mat-option [value]="supply.id">{{ humanize(supply.supplyName) }}</mat-option>
            }
          </mat-select>
          @if (form.controls.supplyId.touched && form.controls.supplyId.invalid) {
            <mat-error>Selecciona un insumo.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Cantidad</mat-label>
          <input matInput type="number" min="1" formControlName="quantity" />
          @if (form.controls.quantity.touched && form.controls.quantity.invalid) {
            <mat-error>Ingresa una cantidad mayor a 0.</mat-error>
          }
        </mat-form-field>

        @if (error()) {
          <p class="dialog-error" role="alert">{{ error() }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()" [disabled]="saving()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="save()" [disabled]="saving()">
        {{ saving() ? 'Enviando…' : 'Crear solicitud' }}
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
    .dialog-error {
      margin: 0;
      padding: 8px 10px;
      border-radius: 8px;
      background: #fef2f2;
      color: #991b1b;
      font-size: 0.85rem;
    }
  `,
})
export class RedistributionFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(RedistributionService);
  private readonly dialogRef = inject(MatDialogRef<RedistributionFormDialog>);
  protected readonly data = inject<{ centers: Center[]; supplies: Supply[] }>(MAT_DIALOG_DATA);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly humanize = humanize;

  readonly form = this.fb.group(
    {
      sourceCenterId: ['' as string | number, [Validators.required]],
      targetCenterId: ['' as string | number, [Validators.required]],
      supplyId: ['' as string | number, [Validators.required]],
      quantity: [null as number | null, [Validators.required, Validators.min(1)]],
    },
    { validators: differentCenters },
  );

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
    const payload: RedistributionPayload = {
      sourceCenterId: raw.sourceCenterId ?? '',
      targetCenterId: raw.targetCenterId ?? '',
      supplyId: raw.supplyId ?? '',
      quantity: Number(raw.quantity),
    };

    this.service.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(true);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'No se pudo crear la solicitud.'));
      },
    });
  }
}

function differentCenters(group: AbstractControl): ValidationErrors | null {
  const source = group.get('sourceCenterId')?.value;
  const target = group.get('targetCenterId')?.value;
  return source && target && source === target ? { sameCenter: true } : null;
}
