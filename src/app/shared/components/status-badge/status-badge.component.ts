import { Component, computed, input } from '@angular/core';

type Tone = 'danger' | 'warning' | 'success' | 'info' | 'neutral';

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="badge" [class]="'badge badge--' + tone()">
      <span class="badge__dot" aria-hidden="true"></span>
      <span class="badge__text">{{ text() }}</span>
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.6;
      white-space: nowrap;
      border: 1px solid transparent;
    }
    .badge__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex: 0 0 auto;
    }
    .badge--danger {
      color: #991b1b;
      background: #fef2f2;
      border-color: #fecaca;
    }
    .badge--danger .badge__dot {
      background: var(--pgrtc-error);
    }
    .badge--warning {
      color: #92400e;
      background: #fffbeb;
      border-color: #fde68a;
    }
    .badge--warning .badge__dot {
      background: var(--pgrtc-warning);
    }
    .badge--success {
      color: #166534;
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .badge--success .badge__dot {
      background: var(--pgrtc-success);
    }
    .badge--info {
      color: #334155;
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .badge--info .badge__dot {
      background: var(--pgrtc-secondary);
    }
    .badge--neutral {
      color: #475569;
      background: #f1f5f9;
      border-color: #e2e8f0;
    }
    .badge--neutral .badge__dot {
      background: #94a3b8;
    }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly label = input<string>();

  readonly tone = computed(() => toneFor(this.status()));
  readonly text = computed(() => this.label() ?? labelFor(this.status()));
}

function toneFor(status: string): Tone {
  switch ((status ?? '').toLowerCase()) {
    case 'red':
    case 'rejected':
    case 'critical':
      return 'danger';
    case 'yellow':
    case 'pending':
    case 'warning':
      return 'warning';
    case 'green':
    case 'approved':
    case 'completed':
    case 'active':
      return 'success';
    case 'info':
      return 'info';
    default:
      return 'neutral';
  }
}

function labelFor(status: string): string {
  switch ((status ?? '').toLowerCase()) {
    case 'red':
      return 'Crítico';
    case 'yellow':
      return 'Alerta';
    case 'green':
      return 'Estable';
    case 'pending':
      return 'Pendiente';
    case 'approved':
      return 'Aprobada';
    case 'completed':
      return 'Completada';
    case 'rejected':
      return 'Rechazada';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Sin estado';
  }
}
