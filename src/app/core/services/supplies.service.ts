import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResult, Supply } from '../models';
import { asId, asString, normalizePaged, pick, unwrapEntity } from './http.util';

export interface PageQuery {
  page?: number;
  limit?: number;
}

export interface SupplyPayload {
  supplyName: string;
  unit: string;
}

@Injectable({ providedIn: 'root' })
export class SuppliesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/supplies`;

  list(params: PageQuery & { search?: string } = {}): Observable<PagedResult<Supply>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    let httpParams = new HttpParams().set('page', page).set('limit', limit);
    const search = params.search?.trim();
    if (search) {
      httpParams = httpParams.set('search', search);
    }
    return this.http.get<unknown>(this.baseUrl, { params: httpParams }).pipe(
      map((body) => {
        const paged = normalizePaged<unknown>(body, ['supplies'], page, limit);
        return { items: paged.items.map(toSupply), total: paged.total };
      }),
    );
  }

  getById(id: number | string): Observable<Supply> {
    return this.http
      .get<unknown>(`${this.baseUrl}/${id}`)
      .pipe(map((body) => toSupply(unwrapEntity<unknown>(body, ['supply']))));
  }

  create(payload: SupplyPayload): Observable<unknown> {
    return this.http.post(this.baseUrl, toPayload(payload));
  }

  update(id: number | string, payload: SupplyPayload): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}`, toPayload(payload));
  }

  delete(id: number | string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}

function toSupply(raw: unknown): Supply {
  return {
    id: asId(pick(raw, 'id')),
    supplyName: asString(pick(raw, 'supply_name', 'supplyName', 'name')),
    unit: asString(pick(raw, 'unit')),
  };
}

function toPayload(payload: SupplyPayload): Record<string, unknown> {
  return {
    supply_name: payload.supplyName,
    unit: payload.unit,
  };
}
