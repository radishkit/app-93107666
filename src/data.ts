// Business License Self-Service — types, seeded licenses, fees, persistence.

export type LicenseStatus = 'Active' | 'Expiring soon' | 'Expired';

export interface License {
  number: string; // BL26-XXXX or Accela customId
  businessName: string;
  dba?: string;
  type: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
  employees: string;
  issued: string; // YYYY-MM-DD
  expires: string; // YYYY-MM-DD
  renewalFee: number;
  // Extra fields populated when record comes from Accela V4 API
  _accelaStatus?: string;
  _accelaModule?: string;
  _accelaId?: string;
}

export interface Receipt {
  confirmation: string; // RN26-XXXXX
  licenseNumber: string;
  businessName: string;
  paidAt: string; // ISO
  lines: { label: string; amount: number }[];
  total: number;
  newExpiry: string; // YYYY-MM-DD
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const SEED_LICENSES: License[] = [
  {
    number: 'BL26-1042',
    businessName: 'Null Point Brewing Co.',
    dba: 'The Null Point Taproom',
    type: 'Food & Beverage — On-Premise',
    owner: 'Dana Okafor',
    email: 'dana@nullpointbrewing.com',
    phone: '(555) 010-2214',
    address: '42 Harborline Ave',
    employees: '11-25',
    issued: '2025-10-01',
    expires: daysFromNow(24),
    renewalFee: 285,
  },
  {
    number: 'BL26-0877',
    businessName: 'Meridian Marine Supply',
    type: 'Retail — General',
    owner: 'Luis Ferreira',
    email: 'luis@meridianmarine.com',
    phone: '(555) 010-8830',
    address: '9 Wharf St',
    employees: '2-10',
    issued: '2025-11-14',
    expires: daysFromNow(78),
    renewalFee: 180,
  },
  {
    number: 'BL26-0463',
    businessName: 'Lat Zero Surf Rentals',
    type: 'Recreation & Rentals',
    owner: 'Maya Contreras',
    email: 'maya@latzerosurf.com',
    phone: '(555) 010-7742',
    address: '3 Equator Beach Rd',
    employees: '2-10',
    issued: '2024-08-01',
    expires: daysFromNow(-12),
    renewalFee: 145,
  },
  {
    number: 'BL26-1290',
    businessName: 'Prime Meridian Pharmacy',
    type: 'Health & Personal Services',
    owner: 'Sam Adeyemi',
    email: 'sam@pmpharmacy.com',
    phone: '(555) 010-5567',
    address: '120 Meridian Walk',
    employees: '11-25',
    issued: '2026-01-05',
    expires: daysFromNow(140),
    renewalFee: 310,
  },
];

export const EMPLOYEE_BANDS = ['1 (just me)', '2-10', '11-25', '26-100', '100+'];

export const LATE_FEE = 50;
export const TECH_FEE = 8;

export function licenseStatus(lic: License): LicenseStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (lic.expires < today) return 'Expired';
  const soon = new Date();
  soon.setDate(soon.getDate() + 60);
  if (lic.expires <= soon.toISOString().slice(0, 10)) return 'Expiring soon';
  return 'Active';
}

export function renewalLines(lic: License): { label: string; amount: number }[] {
  const lines = [
    { label: `Annual renewal — ${lic.type}`, amount: lic.renewalFee },
    { label: 'Online processing fee', amount: TECH_FEE },
  ];
  if (licenseStatus(lic) === 'Expired') {
    lines.push({ label: 'Late renewal penalty', amount: LATE_FEE });
  }
  return lines;
}

export function newExpiryFor(lic: License): string {
  const base = licenseStatus(lic) === 'Expired' ? new Date() : new Date(lic.expires + 'T12:00:00');
  base.setFullYear(base.getFullYear() + 1);
  return base.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Persistence — renewed licenses + receipts overlay the seeds
// ---------------------------------------------------------------------------

const RENEWALS_KEY = 'nullisland-license-renewals';

interface StoredRenewal {
  receipt: Receipt;
  updated: Partial<License>;
}

function loadRenewals(): Record<string, StoredRenewal> {
  try {
    const raw = localStorage.getItem(RENEWALS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function loadLicenses(): License[] {
  const renewals = loadRenewals();
  return SEED_LICENSES.map((lic) => {
    const r = renewals[lic.number];
    return r ? { ...lic, ...r.updated, expires: r.receipt.newExpiry } : lic;
  });
}

/** Sync search — mock/seed data only (fallback when SDK unavailable). */
export function findLicense(q: string): License | undefined {
  const norm = q.trim().toLowerCase();
  if (!norm) return undefined;
  return loadLicenses().find(
    (l) =>
      l.number.toLowerCase() === norm ||
      l.businessName.toLowerCase().includes(norm) ||
      (l.dba ?? '').toLowerCase().includes(norm),
  );
}

// Re-export Accela helpers so Landing can import from one place
export { hasSDK, searchLicensesAccela } from './accela';

export function receiptFor(licenseNumber: string): Receipt | undefined {
  return loadRenewals()[licenseNumber]?.receipt;
}

export function saveRenewal(lic: License, updated: Partial<License>): Receipt {
  const lines = renewalLines(lic);
  const receipt: Receipt = {
    confirmation: 'RN26-' + String(10000 + Math.floor((Date.now() / 1000) % 90000)),
    licenseNumber: lic.number,
    businessName: lic.businessName,
    paidAt: new Date().toISOString(),
    lines,
    total: lines.reduce((s, l) => s + l.amount, 0),
    newExpiry: newExpiryFor(lic),
  };
  try {
    const all = loadRenewals();
    all[lic.number] = { receipt, updated };
    localStorage.setItem(RENEWALS_KEY, JSON.stringify(all));
  } catch {
    /* still return receipt for this session */
  }
  return receipt;
}

export function fmtDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
