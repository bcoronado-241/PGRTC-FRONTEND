import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';
import { Center, InventoryItem, Supply } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CentersService } from '../../core/services/centers.service';
import { errorMessage, humanize } from '../../core/services/http.util';
import { InventoryService } from '../../core/services/inventory.service';
import { SuppliesService } from '../../core/services/supplies.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { InventoryFormDialog } from './inventory-form.dialog';

@Component({
  selector: 'app-inventory',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTableModule,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent implements OnInit {
  private readonly service = inject(InventoryService);
  private readonly centersService = inject(CentersService);
  private readonly suppliesService = inject(SuppliesService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) private paginator?: MatPaginator;

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly canManage = this.auth.canManageInventory;
  protected readonly displayedColumns = [
    'center',
    'supply',
    'quantity',
    'minThreshold',
    'status',
    'actions',
  ];

  protected readonly items = signal<InventoryItem[]>([]);
  protected readonly centers = signal<Center[]>([]);
  protected readonly supplies = signal<Supply[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly loading = signal(false);
  protected readonly filtersLoading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly filters = this.fb.group({
    centerId: [''],
    supplyId: [''],
    status: [''],
  });

  protected readonly statusOptions = [
    { value: 'red', label: 'Crítico' },
    { value: 'yellow', label: 'Alerta' },
    { value: 'green', label: 'Estable' },
  ];

  protected readonly humanize = humanize;

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
    this.loadFilters();
    this.load();
  }

  protected centerLabel(item: InventoryItem): string {
    return (
      item.centerName ??
      item.center?.centerName ??
      item.center?.name ??
      this.centerMap().get(String(item.centerId)) ??
      `Centro #${item.centerId}`
    );
  }

  protected supplyLabel(item: InventoryItem): string {
    const resolved =
      item.supplyName ??
      item.supply?.supplyName ??
      item.supply?.name ??
      this.supplyMap().get(String(item.supplyId)) ??
      `Insumo #${item.supplyId}`;
    return humanize(resolved);
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const { centerId, supplyId, status } = this.filters.getRawValue();

    this.service
      .list({
        centerId: centerId || undefined,
        supplyId: supplyId || undefined,
        status: status || undefined,
        page: this.page() + 1,
        limit: this.pageSize(),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
        },
        error: (err: unknown) =>
          this.error.set(errorMessage(err, 'No se pudo cargar el inventario.')),
      });
  }

  protected openForm(item?: InventoryItem): void {
    const ref = this.dialog.open(InventoryFormDialog, {
      width: '480px',
      maxWidth: '95vw',
      data: { item: item ?? null, centers: this.centers(), supplies: this.supplies() },
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.notify(item ? 'Registro actualizado.' : 'Registro creado.');
        this.load();
      }
    });
  }

  protected confirmDelete(item: InventoryItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        title: 'Eliminar registro de inventario',
        message: `¿Seguro que deseas eliminar el inventario de "${this.supplyLabel(item)}" en "${this.centerLabel(item)}"?`,
        confirmText: 'Eliminar',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.service.delete(item.id).subscribe({
          next: () => {
            this.notify('Registro eliminado.');
            this.load();
          },
        });
      }
    });
  }

  private loadFilters(): void {
    this.filtersLoading.set(true);
    this.centersService.list({ page: 1, limit: 100 }).subscribe({
      next: (result) => this.centers.set(result.items),
      complete: () => this.filtersLoading.set(false),
      error: () => this.filtersLoading.set(false),
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
