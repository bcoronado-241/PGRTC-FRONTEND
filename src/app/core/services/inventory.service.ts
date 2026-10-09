import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InventoryItem, PagedResult } from '../models';
import { asId, asNumber, asString, normalizePaged, pick, unwrapEntity } from './http.util';

export interface InventoryQuery {
  centerId?: number | string;
  supplyId?: number | string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface InventoryCreatePayload {
  centerId: number | string;
  supplyId: number | string;
  quantity: number;
  minThreshold: number;
}

export interface InventoryUpdatePayload {
  quantity: number;
  minThreshold: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inventory`;

  list(params: InventoryQuery = {}): Observable<PagedResult<InventoryItem>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    let httpParams = new HttpParams().set('page', page).set('limit', limit);
    if (params.centerId !== undefined && params.centerId !== '') {
      httpParams = httpParams.set('center_id', params.centerId);
    }
    if (params.supplyId !== undefined && params.supplyId !== '') {
      httpParams = httpParams.set('supply_id', params.supplyId);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<unknown>(this.baseUrl, { params: httpParams }).pipe(
      map((body) => {
        const paged = normalizePaged<unknown>(body, ['inventory', 'items'], page, limit);
        return { items: paged.items.map(toInventoryItem), total: paged.total };
      }),
    );
  }

  getById(id: number | string): Observable<InventoryItem> {
    return this.http
      .get<unknown>(`${this.baseUrl}/${id}`)
      .pipe(map((body) => toInventoryItem(unwrapEntity<unknown>(body, ['inventory', 'item']))));
  }

  create(payload: InventoryCreatePayload): Observable<unknown> {
    return this.http.post(this.baseUrl, {
      center_id: payload.centerId,
      supply_id: payload.supplyId,
      quantity: payload.quantity,
      min_threshold: payload.minThreshold,
    });
  }

  update(id: number | string, payload: InventoryUpdatePayload): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}`, {
      quantity: payload.quantity,
      min_threshold: payload.minThreshold,
    });
  }

  delete(id: number | string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}

function toInventoryItem(raw: unknown): InventoryItem {
  return {
    id: asId(pick(raw, 'id')),
    centerId: asId(pick(raw, 'center_id', 'centerId')),
    supplyId: asId(pick(raw, 'supply_id', 'supplyId')),
    quantity: asNumber(pick(raw, 'quantity')),
    minThreshold: asNumber(pick(raw, 'min_threshold', 'minThreshold')),
    status: asString(pick(raw, 'status')),
    centerName: asString(pick(raw, 'center_name', 'centerName')) || undefined,
    supplyName: asString(pick(raw, 'supply_name', 'supplyName')) || undefined,
  };
}
