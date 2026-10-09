import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title ?? 'Confirmar acción' }}</h2>
    <mat-dialog-content>
      <p class="confirm-message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close(false)">
        {{ data.cancelText ?? 'Cancelar' }}
      </button>
      <button
        mat-flat-button
        type="button"
        [color]="data.danger ? 'warn' : 'primary'"
        [class.confirm-btn--danger]="data.danger"
        (click)="close(true)"
      >
        {{ data.confirmText ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .confirm-message {
      margin: 0;
      color: #33414f;
      line-height: 1.5;
    }
    .confirm-btn--danger {
      --mdc-filled-button-container-color: var(--pgrtc-danger);
      --mat-button-filled-container-color: var(--pgrtc-danger);
      --mdc-filled-button-label-text-color: #ffffff;
      --mat-button-filled-label-text-color: #ffffff;
      background-color: var(--pgrtc-danger);
      color: #ffffff;
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);

  protected close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
