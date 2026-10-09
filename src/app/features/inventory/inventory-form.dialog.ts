import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Center, InventoryItem, Supply } from '../../core/models';
import { errorMessage, humanize } from '../../core/services/http.util';
import { InventoryService } from '../../core/services/inventory.service';

export interface InventoryFormData {
  item: InventoryItem | null;
  centers: Center[];
  supplies: Supply[];
}

@Component({
  selector: 'app-inventory-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar inventario' : 'Nuevo registro de inventario' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()" novalidate>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Centro</mat-label>
          <mat-select formControlName="centerId">
            @for (center of data.centers; track center.id) {
              <mat-option [value]="center.id">{{ center.centerName }}</mat-option>
            }
          </mat-select>
          @if (form.controls.centerId.touched && form.controls.centerId.invalid) {
            <mat-error>Selecciona un centro.</mat-error>
          }
        </mat-form-field>

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

        <div class="dialog-grid">
          <mat-form-field appearance="outline">
            <mat-label>Cantidad</mat-label>
            <input matInput type="number" min="0" formControlName="quantity" />
            @if (form.controls.quantity.touched && form.controls.quantity.invalid) {
              <mat-error>Ingresa una cantidad válida.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Mínimo requerido</mat-label>
            <input matInput type="number" min="0" formControlName="minThreshold" />
            @if (form.controls.minThreshold.touched && form.controls.minThreshold.invalid) {
              <mat-error>Ingresa un mínimo válido.</mat-error>
            }
          </mat-form-field>
        </div>

        @if (isEdit) {
          <p class="text-muted">El centro y el insumo no se pueden modificar una vez creado el registro.</p>
        }

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
export class InventoryFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InventoryService);
  private readonly dialogRef = inject(MatDialogRef<InventoryFormDialog>);
  protected readonly data = inject<InventoryFormData>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data?.item;
  protected readonly humanize = humanize;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    centerId: ['' as string | number, [Validators.required]],
    supplyId: ['' as string | number, [Validators.required]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    minThreshold: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    const item = this.data?.item;
    if (item) {
      this.form.patchValue({
        centerId: item.centerId,
        supplyId: item.supplyId,
        quantity: Number(item.quantity),
        minThreshold: Number(item.minThreshold),
      });
      this.form.controls.centerId.disable();
      this.form.controls.supplyId.disable();
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

    const request$ = this.isEdit
      ? this.service.update(this.data.item!.id, {
          quantity: Number(raw.quantity),
          minThreshold: Number(raw.minThreshold),
        })
      : this.service.create({
          centerId: raw.centerId ?? '',
          supplyId: raw.supplyId ?? '',
          quantity: Number(raw.quantity),
          minThreshold: Number(raw.minThreshold),
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(true);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'No se pudo guardar el registro de inventario.'));
      },
    });
  }
}
