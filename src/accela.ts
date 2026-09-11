/**
 * accela.ts — Thin wrapper around window.radish.accela SDK.
 *
 * The RadishKit pipeline injects `window.radish` into the preview iframe.
 * This module exposes helpers that:
 *   1. Detect whether the SDK is present
 *   2. Query B1PERMIT via executeScript (EMSE SQL)
 *   3. Map raw Accela rows → the License shape the rest of the app uses
 */

import type { License } from './data';

// ---------------------------------------------------------------------------
// SDK type shims (window.radish is injected at runtime, no npm package)
// ---------------------------------------------------------------------------

interface RadishSDK {
  version: string;
  accela: {
    executeScript: (code: string) => Promise<unknown>;
    searchRecords: (criteria: object, opts?: { suppressOverlay?: boolean }) => Promise<unknown>;
    getRecord: (id: string) => Promise<unknown>;
    getRecordFees: (id: string) => Promise<unknown>;
    getRecordContacts: (id: string) => Promise<unknown>;
    getRecordCustomForms: (id: string) => Promise<unknown>;
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
 * Search for licenses in B1PERMIT via raw EMSE SQL.
 *
 * Accepts a search term which is matched against:
 *   - B1_ALT_ID (the human-readable license/record number)
 *   - B1_SPECIAL_TEXT (often used for business name / DBA)
 *
 * Also accepts a raw tracking number (B1_PER_ID1-B1_PER_ID2-B1_PER_ID3 concat).
 */
export async function searchLicensesAccela(query: string): Promise<{
  ok: boolean;
  licenses: License[];
  error?: string;
  raw?: unknown;
}> {
  if (!window.radish) {
    return { ok: false, licenses: [], error: 'RadishKit SDK not available (window.radish is undefined). This app must be viewed through the RadishKit preview proxy.' };
  }

  const safeQ = query.replace(/'/g, "''").trim();

  // Build EMSE script that queries B1PERMIT + related tables
  const script = `
function rowToObject(row) {
  var obj = {};
  var cols = row.getColumns();
  for (var i = 0; i < cols.length; i++) {
    var col = cols[i];
    obj[col] = row.get(col);
  }
  return obj;
}

try {
  var servProvCode = aa.getServiceProviderCode();
  var searchTerm = '${safeQ}';
  var upperTerm = searchTerm.toUpperCase();

  var query = "SELECT TOP 20 " +
    "B1_ALT_ID, B1_PER_ID1, B1_PER_ID2, B1_PER_ID3, " +
    "B1_SPECIAL_TEXT, B1_APPL_STATUS, B1_PER_TYPE, B1_PER_SUB_TYPE, " +
    "B1_PER_CATEGORY, B1_PER_GROUP, " +
    "REC_STATUS, REC_DATE, B1_CREATED_BY, " +
    "B1_EXPIRATION_DATE, B1_LICENSE_NBR " +
    "FROM B1PERMIT " +
    "WHERE SERV_PROV_CODE = '" + servProvCode + "' " +
    "AND REC_STATUS = 'A' " +
    "AND (" +
      "UPPER(B1_ALT_ID) LIKE '%" + upperTerm + "%' " +
      "OR UPPER(B1_SPECIAL_TEXT) LIKE '%" + upperTerm + "%' " +
      "OR B1_PER_ID1 + B1_PER_ID2 + B1_PER_ID3 = '" + searchTerm + "' " +
      "OR CAST(B1_PER_ID1 AS VARCHAR) + CAST(B1_PER_ID2 AS VARCHAR) + CAST(B1_PER_ID3 AS VARCHAR) LIKE '%" + searchTerm + "%' " +
    ") " +
    "ORDER BY REC_DATE DESC";

  var result = aa.db.select(query, []);

  if (!result.getSuccess()) {
    logMessage(JSON.stringify({
      success: false,
      error: "Query failed: " + result.getErrorMessage(),
      servProvCode: servProvCode
    }));
  } else {
    var rows = [];
    var rs = result.getOutput();
    for (var i = 0; i < rs.size(); i++) {
      rows.push(rowToObject(rs.get(i)));
    }
    logMessage(JSON.stringify({
      success: true,
      servProvCode: servProvCode,
      count: rows.length,
      data: rows
    }));
  }
} catch (err) {
  logMessage(JSON.stringify({
    success: false,
    error: err.toString()
  }));
}
`;

  try {
    const result = await window.radish.accela.executeScript(script);
    const parsed = parseScriptResult(result);

    if (!parsed.success) {
      return { ok: false, licenses: [], error: parsed.error || 'Script returned success=false', raw: result };
    }

    const licenses: License[] = (parsed.data || []).map(mapRowToLicense);
    return { ok: true, licenses, raw: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    return {
      ok: false,
      licenses: [],
      error: code ? `[${code}] ${msg}` : msg,
      raw: err,
    };
  }
}

// ---------------------------------------------------------------------------
// Result parsing
// ---------------------------------------------------------------------------

interface ScriptResult {
  success: boolean;
  data?: RawRow[];
  error?: string;
  servProvCode?: string;
  count?: number;
}

interface RawRow {
  B1_ALT_ID?: string;
  B1_PER_ID1?: string;
  B1_PER_ID2?: string;
  B1_PER_ID3?: string;
  B1_SPECIAL_TEXT?: string;
  B1_APPL_STATUS?: string;
  B1_PER_TYPE?: string;
  B1_PER_SUB_TYPE?: string;
  B1_PER_CATEGORY?: string;
  B1_PER_GROUP?: string;
  REC_STATUS?: string;
  REC_DATE?: string;
  B1_CREATED_BY?: string;
  B1_EXPIRATION_DATE?: string;
  B1_LICENSE_NBR?: string;
}

function parseScriptResult(raw: unknown): ScriptResult {
  // The broker may return the result in several shapes depending on the template wrapper.
  // executeScript returns whatever logMessage(...) emitted, parsed as JSON.
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;

    // Direct shape: { success, data, ... }
    if ('success' in obj) return obj as unknown as ScriptResult;

    // Wrapped in messages array
    if (Array.isArray(obj.messages)) {
      for (const msg of obj.messages) {
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          if (parsed && typeof parsed === 'object' && 'success' in parsed) {
            return parsed as ScriptResult;
          }
        } catch { /* skip non-JSON messages */ }
      }
    }

    // Wrapped in { logs, messages } shape
    if (typeof obj.messageOutput === 'string') {
      try {
        return JSON.parse(obj.messageOutput) as ScriptResult;
      } catch { /* fall through */ }
    }
  }

  // If it's a string, try parsing directly
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ScriptResult;
    } catch { /* fall through */ }
  }

  return { success: false, error: 'Could not parse script result', data: [] };
}

// ---------------------------------------------------------------------------
// Row → License mapping
// ---------------------------------------------------------------------------

function mapRowToLicense(row: RawRow): License {
  const altId = row.B1_ALT_ID || '';
  const trackingNbr = [row.B1_PER_ID1, row.B1_PER_ID2, row.B1_PER_ID3].filter(Boolean).join('-');
  const licenseType = [row.B1_PER_GROUP, row.B1_PER_TYPE, row.B1_PER_SUB_TYPE, row.B1_PER_CATEGORY]
    .filter(Boolean)
    .join(' / ');

  return {
    number: altId || trackingNbr,
    businessName: row.B1_SPECIAL_TEXT || altId || 'Unknown',
    dba: undefined,
    type: licenseType || 'Business License',
    owner: row.B1_CREATED_BY || 'On file',
    email: '',
    phone: '',
    address: '',
    employees: '',
    issued: formatAccelaDate(row.REC_DATE),
    expires: formatAccelaDate(row.B1_EXPIRATION_DATE) || futureDate(365),
    renewalFee: 180, // default; real fee would come from F4FEEITEM
  };
}

function formatAccelaDate(val?: string): string {
  if (!val) return '';
  // Accela dates can be "2024-03-15 00:00:00.0" or ISO or just "YYYY-MM-DD"
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
