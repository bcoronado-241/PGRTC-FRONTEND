import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResult, RedistributionRequest } from '../models';
import { asId, asNumber, asString, normalizePaged, pick, unwrapEntity } from './http.util';

export interface RedistributionQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export interface RedistributionPayload {
  sourceCenterId: number | string;
  targetCenterId: number | string;
  supplyId: number | string;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class RedistributionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/redistribution-requests`;

  list(params: RedistributionQuery = {}): Observable<PagedResult<RedistributionRequest>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    let httpParams = new HttpParams().set('page', page).set('limit', limit);
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<unknown>(this.baseUrl, { params: httpParams }).pipe(
      map((body) => {
        const paged = normalizePaged<unknown>(
          body,
          ['requests', 'redistributionRequests', 'redistributions'],
          page,
          limit,
        );
        return { items: paged.items.map(toRedistribution), total: paged.total };
      }),
    );
  }

  getById(id: number | string): Observable<RedistributionRequest> {
    return this.http
      .get<unknown>(`${this.baseUrl}/${id}`)
      .pipe(
        map((body) =>
          toRedistribution(unwrapEntity<unknown>(body, ['request', 'redistribution'])),
        ),
      );
  }

  create(payload: RedistributionPayload): Observable<unknown> {
    return this.http.post(this.baseUrl, {
      source_center_id: payload.sourceCenterId,
      target_center_id: payload.targetCenterId,
      supply_id: payload.supplyId,
      quantity: payload.quantity,
    });
  }

  approve(id: number | string): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: number | string): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}/reject`, {});
  }
}

function toRedistribution(raw: unknown): RedistributionRequest {
  return {
    id: asId(pick(raw, 'id')),
    sourceCenterId: asId(pick(raw, 'source_center_id', 'sourceCenterId')),
    targetCenterId: asId(pick(raw, 'target_center_id', 'targetCenterId')),
    supplyId: asId(pick(raw, 'supply_id', 'supplyId')),
    quantity: asNumber(pick(raw, 'quantity')),
    status: asString(pick(raw, 'status')),
    createdAt: asString(pick(raw, 'created_at', 'createdAt')) || undefined,
    updatedAt:
      asString(pick(raw, 'updated_at', 'updatedAt', 'resolved_at', 'resolvedAt')) || undefined,
    sourceCenterName: asString(pick(raw, 'source_center_name', 'sourceCenterName')) || undefined,
    targetCenterName: asString(pick(raw, 'target_center_name', 'targetCenterName')) || undefined,
    supplyName: asString(pick(raw, 'supply_name', 'supplyName')) || undefined,
  };
}
