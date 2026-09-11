import { useState } from 'react';
import { View } from '../App';
import { License, findLicense, fmtDate, licenseStatus, hasSDK, searchLicensesAccela } from '../data';

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; licenses: License[]; source: 'accela' | 'mock'; method?: string }
  | { kind: 'error'; message: string; raw?: unknown };

export function Landing({ go, licenses }: { go: (v: View) => void; licenses: License[] }) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState<SearchState>({ kind: 'idle' });

  const sdkAvailable = hasSDK();

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;

    // If SDK is available, query Accela
    if (sdkAvailable) {
      setSearch({ kind: 'loading' });
      const result = await searchLicensesAccela(term);

      if (result.ok && result.licenses.length > 0) {
        setSearch({ kind: 'results', licenses: result.licenses, source: 'accela', method: result.method });
        // If exactly one result, jump straight to detail (but DON'T auto-navigate
        // so user can see the result card and the method used)
      } else if (result.ok && result.licenses.length === 0) {
        setSearch({ kind: 'results', licenses: [], source: 'accela', method: result.method });
      } else {
        setSearch({ kind: 'error', message: result.error || 'Unknown error', raw: result.raw });
      }
      return;
    }

    // Fallback: search mock data
    const hit = findLicense(term);
    if (hit) {
      setSearch({ kind: 'results', licenses: [hit], source: 'mock' });
      go({ name: 'detail', licenseNumber: hit.number });
    } else {
      setSearch({ kind: 'results', licenses: [], source: 'mock' });
    }
  };

  return (
    <>
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__eyebrow">City of Null Island · Business Licensing</div>
          <h1>
            Renew your license <span className="hero__hl">in minutes.</span>
          </h1>
          <p className="hero__lede">
            Look up your business license, confirm your details, and renew online — no trip to
            City Hall required.
          </p>

          {/* Data source indicator */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 12,
            background: sdkAvailable ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
            color: sdkAvailable ? '#16a34a' : '#d97706',
            border: `1px solid ${sdkAvailable ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: sdkAvailable ? '#22c55e' : '#f59e0b',
            }} />
            {sdkAvailable ? '● Live Accela data' : '○ Mock data (SDK not loaded)'}
          </div>

          <form className="lookup" onSubmit={doSearch}>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (search.kind !== 'idle') setSearch({ kind: 'idle' });
              }}
              placeholder={sdkAvailable
                ? 'License number, tracking number, or business name…'
                : 'License number (BL26-1042) or business name…'}
              aria-label="Search licenses"
            />
            <button
              className="btn btn--primary"
              type="submit"
              disabled={search.kind === 'loading'}
            >
              {search.kind === 'loading' ? 'Searching…' : 'Look up'}
            </button>
          </form>

          {/* Loading state */}
          {search.kind === 'loading' && (
            <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>
              ⏳ Querying Accela B1PERMIT table…
            </p>
          )}

          {/* No results */}
          {search.kind === 'results' && search.licenses.length === 0 && (
            <p className="lookup__miss">
              No matching records found{search.source === 'accela' ? ' in Accela' : ''}.
              {search.source === 'accela'
                ? ' Try a different license number or business name.'
                : ' Try your license number (on your certificate) or the business\'s legal name.'}
            </p>
          )}

          {/* Error state */}
          {search.kind === 'error' && (
            <div style={{
              marginTop: 12,
              padding: '12px 16px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              fontSize: 13,
              textAlign: 'left',
              maxWidth: 600,
            }}>
              <strong>Accela query failed:</strong> {search.message}
              {search.raw && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}>
                    Raw response
                  </summary>
                  <pre style={{
                    fontSize: 11,
                    marginTop: 4,
                    padding: 8,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 4,
                    overflow: 'auto',
                    maxHeight: 200,
                    whiteSpace: 'pre-wrap',
                    color: '#cbd5e1',
                  }}>
                    {JSON.stringify(search.raw, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="container">
        {/* Show Accela search results if we have them */}
        {search.kind === 'results' && search.licenses.length > 0 && search.source === 'accela' && (
          <section className="demo-licenses">
            <h2>
              Search results
              <span style={{ fontSize: 14, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
                ({search.licenses.length} record{search.licenses.length !== 1 ? 's' : ''} from Accela)
              </span>
            </h2>
            {search.method && (
              <p style={{ fontSize: 12, color: '#64748b', marginTop: -8, marginBottom: 12, fontFamily: 'monospace' }}>
                via {search.method}
              </p>
            )}
            <div className="permitlist">
              {search.licenses.map((lic) => {
                const status = licenseStatus(lic);
                return (
                  <button
                    key={lic.number}
                    className="permitcard"
                    onClick={() => go({ name: 'detail', licenseNumber: lic.number, accelaLicense: lic })}
                  >
                    <div className="permitcard__main">
                      <div className="permitcard__id">{lic.number}</div>
                      <div className="permitcard__biz">{lic.businessName}</div>
                      <div className="permitcard__meta">
                        {lic.type}
                        {lic._accelaStatus ? ` · Accela status: ${lic._accelaStatus}` : ''}
                        {lic.expires ? ` · expires ${fmtDate(lic.expires)}` : ''}
                      </div>
                      {lic._accelaId && (
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                          id: {lic._accelaId}
                        </div>
                      )}
                    </div>
                    <div className="permitcard__side">
                      <span className={`badge badge--${status.replace(/\s/g, '').toLowerCase()}`}>
                        {status}
                      </span>
                      <span className="permitcard__go" aria-hidden>→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Always show mock/seed licenses below */}
        <section className="demo-licenses">
          <h2>{sdkAvailable ? 'Demo licenses (mock data)' : 'Licenses on file for your account'}</h2>
          <p className="muted">
            {sdkAvailable
              ? 'These are hardcoded demo records. Use the search bar above to query real Accela data.'
              : 'Signed in as owner — select a license to view or renew it.'}
          </p>
          <div className="permitlist">
            {licenses.map((lic) => {
              const status = licenseStatus(lic);
              return (
                <button
                  key={lic.number}
                  className="permitcard"
                  onClick={() => go({ name: 'detail', licenseNumber: lic.number })}
                >
                  <div className="permitcard__main">
                    <div className="permitcard__id">{lic.number}</div>
                    <div className="permitcard__biz">{lic.businessName}</div>
                    <div className="permitcard__meta">
                      {lic.type} · expires {fmtDate(lic.expires)}
                    </div>
                  </div>
                  <div className="permitcard__side">
                    <span className={`badge badge--${status.replace(/\s/g, '').toLowerCase()}`}>
                      {status}
                    </span>
                    <span className="permitcard__go" aria-hidden>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="cardgrid">
          <div className="infocard">
            <div className="infocard__icon" aria-hidden>⏱️</div>
            <h3>Renew in about 3 minutes</h3>
            <p>Confirm your details, pay the renewal fee, and get a receipt instantly.</p>
          </div>
          <div className="infocard">
            <div className="infocard__icon" aria-hidden>🔔</div>
            <h3>Renew up to 90 days early</h3>
            <p>Early renewals keep your current expiry date — you never lose time you paid for.</p>
          </div>
          <div className="infocard">
            <div className="infocard__icon" aria-hidden>🧾</div>
            <h3>Expired? No problem</h3>
            <p>
              Renew within 90 days of expiry with a $50 late penalty. After that, reapply through
              the Licensing Division.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
