import { Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage, humanize } from '../../core/services/http.util';
import { SuppliesService, SupplyPayload } from '../../core/services/supplies.service';
import { Supply } from '../../core/models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-supplies',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatTableModule,
    EmptyStateComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Insumos</h1>
          <p class="page-subtitle">Catálogo de insumos y unidades de medida.</p>
        </div>
        @if (isAdmin()) {
          <button mat-flat-button color="primary" type="button" (click)="openForm()">
            Nuevo insumo
          </button>
        }
      </div>

      <div class="table-card">
        <div class="table-filters">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Buscar</mat-label>
            <input
              matInput
              type="search"
              [value]="search()"
              placeholder="Nombre o unidad"
              (input)="onSearchInput($any($event.target).value)"
            />
          </mat-form-field>
        </div>

        @if (loading()) {
          <app-loading-spinner message="Cargando insumos…" />
        } @else if (error()) {
          <div class="state-block">
            <app-empty-state title="No se pudieron cargar los insumos" [message]="error() ?? ''" icon="⚠" />
            <button mat-stroked-button type="button" (click)="load()">Reintentar</button>
          </div>
        } @else if (supplies().length === 0) {
          <app-empty-state title="Sin insumos" message="No se encontraron insumos." icon="📦" />
        } @else {
          <div class="table-scroll">
            <table mat-table [dataSource]="supplies()">
              <ng-container matColumnDef="supplyName">
                <th mat-header-cell *matHeaderCellDef>Insumo</th>
                <td mat-cell *matCellDef="let supply">{{ humanize(supply.supplyName) }}</td>
              </ng-container>

              <ng-container matColumnDef="unit">
                <th mat-header-cell *matHeaderCellDef>Unidad</th>
                <td mat-cell *matCellDef="let supply">{{ supply.unit }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="actions-header">Acciones</th>
                <td mat-cell *matCellDef="let supply" class="actions-cell">
                  @if (isAdmin()) {
                    <button mat-button type="button" (click)="openForm(supply)">Editar</button>
                    <button mat-button color="warn" type="button" (click)="confirmDelete(supply)">
                      Eliminar
                    </button>
                  } @else {
                    <span class="text-muted">Solo lectura</span>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>

          <mat-paginator
            [length]="total()"
            [pageSize]="pageSize()"
            [pageIndex]="page()"
            [pageSizeOptions]="[5, 10, 20, 50]"
            showFirstLastButtons
            (page)="onPage($event)"
          />
        }
      </div>
    </div>
  `,
  styles: `
    .table-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 16px 16px 0;
    }
    .search-field {
      width: 100%;
      max-width: 360px;
    }
    .actions-header {
      text-align: right;
    }
    .actions-cell {
      text-align: right;
      white-space: nowrap;
    }
  `,
})
export class SuppliesComponent implements OnInit {
  private readonly service = inject(SuppliesService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly searchTerm = new Subject<string>();
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) private paginator?: MatPaginator;

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly humanize = humanize;
  protected readonly displayedColumns = ['supplyName', 'unit', 'actions'];
  protected readonly supplies = signal<Supply[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly search = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

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
    this.load();
  }

  protected onSearchInput(value: string): void {
    this.searchTerm.next(value);
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service
      .list({ search: this.search(), page: this.page() + 1, limit: this.pageSize() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.supplies.set(result.items);
          this.total.set(result.total);
        },
        error: (err: unknown) => this.error.set(errorMessage(err, 'No se pudieron cargar los insumos.')),
      });
  }

  protected openForm(supply?: Supply): void {
    const ref = this.dialog.open(SupplyFormDialog, {
      width: '440px',
      maxWidth: '95vw',
      data: { supply: supply ?? null },
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.notify(supply ? 'Insumo actualizado.' : 'Insumo creado.');
        this.load();
      }
    });
  }

  protected confirmDelete(supply: Supply): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        title: 'Eliminar insumo',
        message: `¿Seguro que deseas eliminar "${supply.supplyName}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.service.delete(supply.id).subscribe({
          next: () => {
            this.notify('Insumo eliminado.');
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
  selector: 'app-supply-form-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar insumo' : 'Nuevo insumo' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()" novalidate>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del insumo</mat-label>
          <input matInput type="text" formControlName="supplyName" />
          @if (form.controls.supplyName.touched && form.controls.supplyName.invalid) {
            <mat-error>El nombre es obligatorio.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Unidad de medida</mat-label>
          <input matInput type="text" formControlName="unit" placeholder="caja, litros, unidades…" />
          @if (form.controls.unit.touched && form.controls.unit.invalid) {
            <mat-error>La unidad es obligatoria.</mat-error>
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
      min-width: 300px;
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
export class SupplyFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SuppliesService);
  private readonly dialogRef = inject(MatDialogRef<SupplyFormDialog>);
  protected readonly data = inject<{ supply: Supply | null }>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data?.supply;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    supplyName: ['', [Validators.required]],
    unit: ['', [Validators.required]],
  });

  constructor() {
    const supply = this.data?.supply;
    if (supply) {
      this.form.patchValue({ supplyName: supply.supplyName, unit: supply.unit });
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
    const { supplyName, unit } = this.form.getRawValue();
    const payload: SupplyPayload = { supplyName: supplyName ?? '', unit: unit ?? '' };

    const request$ = this.isEdit
      ? this.service.update(this.data.supply!.id, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(true);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'No se pudo guardar el insumo.'));
      },
    });
  }
}
