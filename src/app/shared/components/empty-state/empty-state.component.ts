import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty" role="status">
      <span class="empty__icon" aria-hidden="true">{{ icon() }}</span>
      <h3 class="empty__title">{{ title() }}</h3>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 40px 16px;
      text-align: center;
    }
    .empty__icon {
      font-size: 2rem;
      line-height: 1;
      color: #9aa7b4;
    }
    .empty__title {
      margin: 4px 0 0;
      font-size: 1.05rem;
      color: #33414f;
    }
    .empty__message {
      margin: 0;
      max-width: 420px;
      color: #5f6b7a;
      font-size: 0.9rem;
    }
  `,
})
export class EmptyStateComponent {
  readonly title = input('Sin resultados');
  readonly message = input('');
  readonly icon = input('∅');
}
