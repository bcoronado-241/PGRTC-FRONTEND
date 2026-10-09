import { HttpErrorResponse } from '@angular/common/http';
import { PagedResult } from '../models';

// Las respuestas del backend pueden venir en formas ligeramente distintas
// (arreglo plano, { data: [...] }, { items, total }, etc.). Estas utilidades
// normalizan la lectura para no acoplar los componentes a un solo formato.

export function normalizePaged<T>(
  body: unknown,
  keys: string[],
  page: number,
  limit: number,
): PagedResult<T> {
  if (Array.isArray(body)) {
    return { items: body as T[], total: estimateTotal(body.length, page, limit) };
  }

  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;

    for (const key of [...keys, 'data', 'items', 'rows', 'results']) {
      const value = obj[key];
      if (Array.isArray(value)) {
        const totalKeys = ['total', 'count', 'totalCount', 'totalItems'];
        let total = estimateTotal(value.length, page, limit);
        for (const totalKey of totalKeys) {
          if (typeof obj[totalKey] === 'number') {
            total = obj[totalKey] as number;
            break;
          }
        }
        return { items: value as T[], total };
      }
    }

    if (obj['data'] && typeof obj['data'] === 'object' && !Array.isArray(obj['data'])) {
      return normalizePaged<T>(obj['data'], keys, page, limit);
    }
  }

  return { items: [], total: 0 };
}

// El backend expone campos en snake_case (center_name, full_name, min_threshold…)
// mientras que el frontend trabaja con camelCase. Estas utilidades permiten leer
// cualquiera de las dos variantes y construir el modelo interno.

export function pick(source: unknown, ...keys: string[]): unknown {
  if (!source || typeof source !== 'object') {
    return undefined;
  }
  const obj = source as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asId(value: unknown): number | string {
  return typeof value === 'number' || typeof value === 'string' ? value : '';
}

// Convierte identificadores en snake_case (blood_o_negative) en etiquetas
// legibles (Blood O Negative) para mostrarlas en la interfaz.
export function humanize(value: unknown, fallback = '—'): string {
  const text = asString(value).trim();
  if (!text) {
    return fallback;
  }
  return text
    .split(/[_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function unwrapEntity<T>(body: unknown, keys: string[]): T {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const obj = body as Record<string, unknown>;
    for (const key of keys) {
      const value = obj[key];
      if (value && typeof value === 'object') {
        return value as T;
      }
    }
    if (obj['data'] && typeof obj['data'] === 'object' && !Array.isArray(obj['data'])) {
      return unwrapEntity<T>(obj['data'], keys);
    }
    return body as T;
  }
  return body as T;
}

// Cuando el backend no informa el total, se estima con el tamaño de página.
function estimateTotal(items: number, page: number, pageSize: number): number {
  const base = Math.max(0, page - 1) * Math.max(pageSize, 1) + items;
  return items >= pageSize && pageSize > 0 ? base + 1 : base;
}

// Traduce errores HTTP a mensajes legibles sin exponer detalles internos
// (stack traces, HTML, etc.). Si el backend envía un `message` corto y
// limpio, se usa ese texto; en caso contrario se mapea por código de estado.
export function errorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (error instanceof HttpErrorResponse) {
    const backendMessage = extractBackendMessage(error.error);
    if (backendMessage) {
      return backendMessage;
    }

    switch (error.status) {
      case 0:
        return 'No se pudo conectar con el servidor. Verifica que el backend esté activo.';
      case 400:
        return 'Solicitud inválida. Revisa los datos ingresados.';
      case 401:
        return 'Correo o contraseña incorrectos.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'El recurso solicitado no existe.';
      case 409:
        return 'El recurso ya existe o entra en conflicto con otro.';
      case 500:
        return 'Error interno del servidor. Intenta nuevamente más tarde.';
      default:
        return fallback;
    }
  }

  return fallback;
}

function extractBackendMessage(body: unknown): string | null {
  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    const message = body.trim();
    return message.length > 0 && message.length <= 200 && !message.includes('<') ? message : null;
  }

  if (typeof body === 'object') {
    const candidate = (body as Record<string, unknown>)['message'];
    if (typeof candidate === 'string') {
      const message = candidate.trim();
      return message.length > 0 && message.length <= 300 && !message.includes('\n') ? message : null;
    }
  }

  return null;
}
