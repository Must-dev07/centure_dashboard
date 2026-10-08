/** Maps an ApiError from a DRF 400 response to per-field messages + a general message. */

import { ApiError } from './api';

export interface ApiFormErrors {
  fields: Record<string, string>;
  general: string | null;
}

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.map(asText).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(asText).join(' ');
  return String(value);
}

export function apiFormErrors(e: unknown, fallback: string): ApiFormErrors {
  if (e instanceof ApiError) {
    if (e.status === 400 && e.body && typeof e.body === 'object') {
      const fields: Record<string, string> = {};
      let general: string | null = null;
      for (const [key, value] of Object.entries(e.body as Record<string, unknown>)) {
        if (key === 'detail' || key === 'non_field_errors') general = asText(value);
        else fields[key] = asText(value);
      }
      return { fields, general: general ?? (Object.keys(fields).length ? null : fallback) };
    }
    if (e.status === 403) {
      return { fields: {}, general: e.message || 'You are not allowed to perform this action.' };
    }
    return { fields: {}, general: e.message };
  }
  return { fields: {}, general: e instanceof Error ? e.message : fallback };
}
