import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardData, RecentAlert } from '../models';
import { asNumber, pick } from './http.util';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  get(): Observable<DashboardData> {
    return this.http.get<unknown>(this.baseUrl).pipe(map((body) => normalizeDashboard(body)));
  }
}

function normalizeDashboard(body: unknown): DashboardData {
  const root = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const inner =
    root['dashboard'] && typeof root['dashboard'] === 'object'
      ? (root['dashboard'] as Record<string, unknown>)
      : root['data'] && typeof root['data'] === 'object' && !Array.isArray(root['data'])
        ? (root['data'] as Record<string, unknown>)
        : root;

  // El backend responde { centers: { total, red, yellow, green }, ... }.
  const centers =
    (pick(inner, 'centers', 'centersByStatus', 'centers_by_status') as Record<string, unknown>) ??
    {};

  const red = asNumber(pick(centers, 'red'));
  const yellow = asNumber(pick(centers, 'yellow'));
  const green = asNumber(pick(centers, 'green'));
  const total = asNumber(pick(centers, 'total'), red + yellow + green);

  const alertsRaw = pick(inner, 'recentAlerts', 'recent_alerts', 'alerts');

  return {
    centersByStatus: { red, yellow, green, total },
    pendingRequests: asNumber(
      pick(
        inner,
        'pending_redistribution_requests',
        'pendingRequests',
        'pending_requests',
        'pending',
      ),
    ),
    alertsLast24h: asNumber(pick(inner, 'alerts_last_24h', 'alertsLast24h')),
    recentAlerts: Array.isArray(alertsRaw) ? (alertsRaw as RecentAlert[]) : [],
  };
}
