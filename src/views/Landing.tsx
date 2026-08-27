import { useState } from 'react';
import { View } from '../App';
import { License, findLicense, fmtDate, licenseStatus } from '../data';

export function Landing({ go, licenses }: { go: (v: View) => void; licenses: License[] }) {
  const [q, setQ] = useState('');
  const [notFound, setNotFound] = useState(false);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const hit = findLicense(q);
    if (hit) {
      setNotFound(false);
      go({ name: 'detail', licenseNumber: hit.number });
    } else {
      setNotFound(true);
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
          <form className="lookup" onSubmit={search}>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setNotFound(false);
              }}
              placeholder="License number (BL26-1042) or business name…"
              aria-label="Search licenses"
            />
            <button className="btn btn--primary" type="submit">
              Look up
            </button>
          </form>
          {notFound && (
            <p className="lookup__miss">
              No match — try your license number (on your certificate) or the business's legal
              name.
            </p>
          )}
        </div>
      </header>

      <main className="container">
        <section className="demo-licenses">
          <h2>Licenses on file for your account</h2>
          <p className="muted">Signed in as owner — select a license to view or renew it.</p>
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
