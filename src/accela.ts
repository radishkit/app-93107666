/**
 * accela.ts — Thin wrapper around window.radish.accela SDK.
 *
 * Uses the V4 REST API methods (searchRecords, getRecords) which the broker
 * proxies directly to Accela's /v4/... endpoints.
 *
 * NOTE: executeScript() is broken — the broker proxies '/execute-script' to
 * Accela which doesn't have that endpoint (404). The broker-side handler for
 * script execution isn't wired up for this app type. All V4 REST methods work.
 */

import type { License } from './data';

// ---------------------------------------------------------------------------
// SDK type shims (window.radish is injected at runtime, no npm package)
// ---------------------------------------------------------------------------

interface AccelaRecord {
  id?: string;
  customId?: string;
  type?: { value?: string; text?: string; group?: string; category?: string; subType?: string; alias?: string };
  status?: { value?: string; text?: string };
  name?: string;
  description?: string;
  module?: string;
  openedDate?: string;
  closedDate?: string;
  expirationDate?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface RadishSDK {
  version: string;
  accela: {
    executeScript: (code: string) => Promise<unknown>;
    searchRecords: (criteria: object, opts?: { suppressOverlay?: boolean }) => Promise<unknown>;
    getRecords: (params?: Record<string, string>) => Promise<unknown>;
    getRecord: (id: string) => Promise<unknown>;
    getRecordFees: (id: string, opts?: { suppressOverlay?: boolean }) => Promise<unknown>;
    getRecordContacts: (id: string, opts?: { suppressOverlay?: boolean }) => Promise<unknown>;
    getRecordCustomForms: (id: string, opts?: { suppressOverlay?: boolean }) => Promise<unknown>;
    api: (path: string, method: string, opts?: { body?: unknown; suppressOverlay?: boolean }) => Promise<unknown>;
  };
  _debug: {
    getToken: () => string;
    getBrokerUrl: () => string;
  };
}

declare global {
  interface Window {
    radish?: RadishSDK;
  }
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Is the RadishKit runtime SDK present in this page? */
export function hasSDK(): boolean {
  return typeof window !== 'undefined' && !!window.radish;
}

/**
 * Search for records in Accela using V4 REST API.
 *
 * Strategy:
 *   1. Try GET /v4/records?customId=<term> (exact match on B1_ALT_ID)
 *   2. If no results, try GET /v4/records with broader params
 *   3. Map V4 record objects → License shape
 */
export async function searchLicensesAccela(query: string): Promise<{
  ok: boolean;
  licenses: License[];
  error?: string;
  raw?: unknown;
  method?: string;
}> {
  if (!window.radish) {
    return {
      ok: false,
      licenses: [],
      error: 'RadishKit SDK not available (window.radish is undefined). This app must be viewed through the RadishKit preview proxy.',
    };
  }

  const term = query.trim();
  if (!term) {
    return { ok: true, licenses: [] };
  }

  // Strategy 1: Try searching by customId (B1_ALT_ID)
  try {
    const result = await window.radish.accela.getRecords({ customId: term });
    const records = normalizeResult(result);

    if (records.length > 0) {
      return {
        ok: true,
        licenses: records.map(mapRecordToLicense),
        raw: result,
        method: 'getRecords(customId)',
      };
    }
  } catch (err) {
    // If customId search fails, fall through to next strategy
    console.warn('[accela] customId search failed, trying broader search:', err);
  }

  // Strategy 2: Try POST /v4/records/search with module/type filter
  try {
    const result = await window.radish.accela.searchRecords(
      { customId: term },
      { suppressOverlay: true },
    );
    const records = normalizeResult(result);

    if (records.length > 0) {
      return {
        ok: true,
        licenses: records.map(mapRecordToLicense),
        raw: result,
        method: 'searchRecords(customId)',
      };
    }
  } catch (err) {
    console.warn('[accela] searchRecords(customId) failed:', err);
  }

  // Strategy 3: Try fetching a single record by ID directly
  try {
    const result = await window.radish.accela.getRecord(term);
    const records = normalizeResult(result);

    if (records.length > 0) {
      return {
        ok: true,
        licenses: records.map(mapRecordToLicense),
        raw: result,
        method: 'getRecord(id)',
      };
    }
  } catch (err) {
    console.warn('[accela] getRecord(id) failed:', err);
  }

  // Strategy 4: Try GET /v4/records with no filter to prove connectivity,
  // and search the results client-side (limited to first page of results)
  try {
    const result = await window.radish.accela.getRecords({});
    const records = normalizeResult(result);

    if (records.length > 0) {
      // Search the returned records client-side
      const upperTerm = term.toUpperCase();
      const filtered = records.filter((r) => {
        const cid = (r.customId || '').toUpperCase();
        const name = (r.name || '').toUpperCase();
        const desc = (r.description || '').toUpperCase();
        const rid = (r.id || '').toUpperCase();
        return (
          cid.includes(upperTerm) ||
          name.includes(upperTerm) ||
          desc.includes(upperTerm) ||
          rid.includes(upperTerm)
        );
      });

      if (filtered.length > 0) {
        return {
          ok: true,
          licenses: filtered.map(mapRecordToLicense),
          raw: result,
          method: 'getRecords() + client filter',
        };
      }

      // No match, but we got records — return them all so user can see what exists
      return {
        ok: true,
        licenses: records.slice(0, 20).map(mapRecordToLicense),
        raw: result,
        method: 'getRecords() — no match for "' + term + '", showing all records',
      };
    }

    // Got an empty result
    return {
      ok: true,
      licenses: [],
      raw: result,
      method: 'getRecords() — empty result',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    return {
      ok: false,
      licenses: [],
      error: code ? `[${code}] ${msg}` : msg,
      raw: err,
      method: 'getRecords() — failed',
    };
  }
}

// ---------------------------------------------------------------------------
// Result normalization — V4 API returns records in various shapes
// ---------------------------------------------------------------------------

function normalizeResult(raw: unknown): AccelaRecord[] {
  if (!raw) return [];

  // Direct array
  if (Array.isArray(raw)) return raw as AccelaRecord[];

  // Object with result array (Accela wraps in { result: [...] })
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.result)) return obj.result as AccelaRecord[];
    // Single record object
    if (obj.id || obj.customId) return [obj as AccelaRecord];
  }

  return [];
}

// ---------------------------------------------------------------------------
// V4 Record → License mapping
// ---------------------------------------------------------------------------

function mapRecordToLicense(rec: AccelaRecord): License {
  const typeStr = rec.type
    ? [rec.type.group, rec.type.text || rec.type.value, rec.type.subType, rec.type.category]
        .filter(Boolean)
        .join(' / ')
    : 'Business License';

  const statusText = rec.status?.text || rec.status?.value || '';
  const displayName = rec.name || rec.description || rec.customId || rec.id || 'Unknown';

  return {
    number: rec.customId || rec.id || '',
    businessName: displayName,
    dba: undefined,
    type: typeStr || 'Business License',
    owner: 'On file',
    email: '',
    phone: '',
    address: '',
    employees: '',
    issued: formatAccelaDate(rec.openedDate),
    expires: formatAccelaDate(rec.expirationDate) || futureDate(365),
    renewalFee: 180,
    // Stash extra V4 fields for debugging / detail view
    _accelaStatus: statusText,
    _accelaModule: rec.module || '',
    _accelaId: rec.id || '',
  };
}

function formatAccelaDate(val?: string): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
