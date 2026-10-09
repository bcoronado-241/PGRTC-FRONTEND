import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CentersService } from './centers.service';

describe('CentersService', () => {
  let service: CentersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CentersService);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('list() debe mapear center_name a centerName', () => {
    let name: string | undefined;

    service.list({ page: 1, limit: 10 }).subscribe((result) => {
      name = result.items[0]?.centerName;
      expect(result.total).toBe(1);
    });

    const request = TestBed.inject(HttpTestingController).expectOne(
      (req) => req.url.endsWith('/centers') && req.method === 'GET',
    );
    request.flush({
      data: [{ id: 1, center_name: 'Hospital Central', type: 'hospital', status: 'green' }],
      total: 1,
    });

    expect(name).toBe('Hospital Central');
  });

  it('create() debe enviar center_name', () => {
    service
      .create({ centerName: 'Acopio Norte', type: 'collection_center', latitude: 1, longitude: 2 })
      .subscribe();

    const request = TestBed.inject(HttpTestingController).expectOne(
      (req) => req.url.endsWith('/centers') && req.method === 'POST',
    );
    expect(request.request.body).toEqual({
      center_name: 'Acopio Norte',
      type: 'collection_center',
      latitude: 1,
      longitude: 2,
    });
    request.flush({});
  });
});
