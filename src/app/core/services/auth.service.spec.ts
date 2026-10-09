import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService, TOKEN_KEY, USER_KEY } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('isAuthenticated() debe devolver false cuando no hay token guardado', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('register() debe enviar full_name y guardar token + usuario normalizado', () => {
    let fullName: string | undefined;

    service
      .register({ fullName: 'Ana Torres', email: 'ana@pgrtc.test', password: 'secret123' })
      .subscribe((user) => {
        fullName = user.fullName;
      });

    const request = TestBed.inject(HttpTestingController).expectOne(
      (req) => req.url.endsWith('/auth/register') && req.method === 'POST',
    );
    expect(request.request.body).toEqual({
      full_name: 'Ana Torres',
      email: 'ana@pgrtc.test',
      password: 'secret123',
    });

    request.flush({
      user: { id: 7, full_name: 'Ana Torres', email: 'ana@pgrtc.test', role: 'admin' },
      token: 'tok-123',
    });

    expect(fullName).toBe('Ana Torres');
    expect(service.getToken()).toBe('tok-123');
    expect(service.currentUser()?.fullName).toBe('Ana Torres');
    expect(service.currentUser()?.role).toBe('admin');
  });
});
