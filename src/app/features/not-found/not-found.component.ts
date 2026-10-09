import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [MatButtonModule, RouterLink],
  template: `
    <div class="not-found">
      <span class="not-found__code">404</span>
      <h1 class="not-found__title">Página no encontrada</h1>
      <p class="not-found__message">
        La ruta que intentaste abrir no existe o fue movida.
      </p>
      <a mat-flat-button color="primary" routerLink="/dashboard">Volver al dashboard</a>
    </div>
  `,
  styles: `
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
      background: var(--pgrtc-bg);
    }
    .not-found__code {
      font-size: 4rem;
      font-weight: 700;
      line-height: 1;
      color: var(--pgrtc-secondary);
    }
    .not-found__title {
      margin: 8px 0 0;
      color: var(--pgrtc-primary);
    }
    .not-found__message {
      margin: 0 0 16px;
      color: #5f6b7a;
    }
  `,
})
export class NotFoundComponent {}
