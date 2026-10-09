import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models';
import { asId, asString, pick, unwrapEntity } from './http.util';

export const TOKEN_KEY = 'pgrtc_token';
export const USER_KEY = 'pgrtc_user';

interface AuthResponse {
  token?: string;
  user?: unknown;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly userSignal = signal<User | null>(readStoredUser());

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');
  readonly canManageInventory = computed(() => {
    const role = this.userSignal()?.role;
    return role === 'admin' || role === 'rescuer';
  });

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  hasRole(role: string): boolean {
    return this.userSignal()?.role === role;
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap((response) => this.storeSession(response)),
      map((response) => this.extractUser(response)),
    );
  }

  register(payload: RegisterPayload): Observable<User> {
    // El backend espera snake_case: { full_name, email, password, role? }.
    const body: Record<string, unknown> = {
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
    };
    if (payload.role) {
      body['role'] = payload.role;
    }
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, body).pipe(
      tap((response) => this.storeSession(response)),
      map((response) => this.extractUser(response)),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
    void this.router.navigate(['/login']);
  }

  getProfile(): Observable<User> {
    return this.http.get<unknown>(`${this.baseUrl}/profile`).pipe(
      map((body) => toUser(unwrapEntity<unknown>(body, ['user', 'profile']))),
      tap((user) => this.persistUser(user)),
    );
  }

  updateProfile(fullName: string): Observable<User> {
    // El backend espera { full_name }.
    return this.http.put<unknown>(`${this.baseUrl}/profile`, { full_name: fullName }).pipe(
      map((body) => toUser(unwrapEntity<unknown>(body, ['user', 'profile']))),
      map((partial) => {
        const current = this.userSignal();
        const updated: User = {
          id: partial.id || current?.id || '',
          email: partial.email || current?.email || '',
          role: partial.role || current?.role || '',
          fullName: partial.fullName || fullName,
        };
        this.persistUser(updated);
        return updated;
      }),
    );
  }

  private storeSession(response: AuthResponse | null | undefined): void {
    if (typeof response?.token === 'string' && response.token.length > 0) {
      localStorage.setItem(TOKEN_KEY, response.token);
    }
    this.persistUser(this.extractUser(response));
  }

  private extractUser(response: AuthResponse | null | undefined): User {
    return toUser(response?.user ?? unwrapEntity<unknown>(response, ['user', 'profile']));
  }

  private persistUser(user: User | null | undefined): void {
    if (!user || typeof user !== 'object' || typeof user.email !== 'string' || user.email === '') {
      return;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userSignal.set(user);
  }
}

// Normaliza la representación del usuario proveniente del backend
// ({ id, full_name, email, role }) al modelo interno camelCase.
function toUser(raw: unknown): User {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    id: asId(pick(source, 'id')),
    fullName: asString(pick(source, 'full_name', 'fullName', 'name')),
    email: asString(pick(source, 'email')),
    role: asString(pick(source, 'role')),
  };
}

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as User;
    const user = toUser(parsed);
    return user.email ? user : null;
  } catch {
    return null;
  }
}
