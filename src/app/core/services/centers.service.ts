import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Center, CenterStatus, PagedResult } from '../models';
import { asId, asNumber, asString, normalizePaged, pick, unwrapEntity } from './http.util';

export interface PageQuery {
  page?: number;
  limit?: number;
}

export interface CenterPayload {
  centerName: string;
  type: string;
  latitude: number;
  longitude: number;
}

@Injectable({ providedIn: 'root' })
export class CentersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/centers`;

  list(params: PageQuery & { search?: string } = {}): Observable<PagedResult<Center>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    let httpParams = new HttpParams().set('page', page).set('limit', limit);
    const search = params.search?.trim();
    if (search) {
      httpParams = httpParams.set('search', search);
    }
    return this.http.get<unknown>(this.baseUrl, { params: httpParams }).pipe(
      map((body) => {
        const paged = normalizePaged<unknown>(body, ['centers'], page, limit);
        return { items: paged.items.map(toCenter), total: paged.total };
      }),
    );
  }

  getById(id: number | string): Observable<Center> {
    return this.http
      .get<unknown>(`${this.baseUrl}/${id}`)
      .pipe(map((body) => toCenter(unwrapEntity<unknown>(body, ['center']))));
  }

  create(payload: CenterPayload): Observable<unknown> {
    return this.http.post(this.baseUrl, toPayload(payload));
  }

  update(id: number | string, payload: CenterPayload): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}`, toPayload(payload));
  }

  delete(id: number | string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}

function toCenter(raw: unknown): Center {
  return {
    id: asId(pick(raw, 'id')),
    centerName: asString(pick(raw, 'center_name', 'centerName', 'name')),
    type: asString(pick(raw, 'type')),
    latitude: asNumber(pick(raw, 'latitude')),
    longitude: asNumber(pick(raw, 'longitude')),
    status: asString(pick(raw, 'status'), 'green') as CenterStatus,
  };
}

function toPayload(payload: CenterPayload): Record<string, unknown> {
  return {
    center_name: payload.centerName,
    type: payload.type,
    latitude: payload.latitude,
    longitude: payload.longitude,
  };
}
