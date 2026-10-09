import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="loading" role="status" aria-live="polite">
      <mat-spinner [diameter]="44"></mat-spinner>
      <p class="loading__text">{{ message() }}</p>
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px 16px;
    }
    .loading__text {
      margin: 0;
      color: #5f6b7a;
      font-size: 0.9rem;
    }
  `,
})
export class LoadingSpinnerComponent {
  readonly message = input('Cargando información…');
}
