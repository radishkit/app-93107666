import { View } from '../App';
import { License, fmtDate, licenseStatus, receiptFor, renewalLines } from '../data';

export function Detail({ license, go }: { license: License; go: (v: View) => void }) {
  const status = licenseStatus(license);
  const receipt = receiptFor(license.number);
  const total = renewalLines(license).reduce((s, l) => s + l.amount, 0);

  return (
    <main className="container container--narrow">
      <button className="linkbtn" onClick={() => go({ name: 'landing' })}>
        ← Back to licenses
      </button>

      <div className="tracker__head">
        <div>
          <h1>{license.businessName}</h1>
          <p className="muted">
            {license.number} · {license.type}
            {license.dba ? ` · DBA “${license.dba}”` : ''}
          </p>
        </div>
        <span className={`badge badge--${status.replace(/\s/g, '').toLowerCase()}`}>{status}</span>
      </div>

      {status !== 'Active' && !receipt && (
        <div className={'notice' + (status === 'Expired' ? ' notice--warn' : '')}>
          {status === 'Expired' ? (
            <>
              This license expired on <strong>{fmtDate(license.expires)}</strong>. Renew within 90
              days to avoid reapplying — a $50 late penalty applies.
            </>
          ) : (
            <>
              This license expires on <strong>{fmtDate(license.expires)}</strong>. Renew now and
              your new term still starts from the current expiry date.
            </>
          )}
        </div>
      )}

      {receipt && (
        <div className="notice notice--good">
          Renewed! New expiration: <strong>{fmtDate(receipt.newExpiry)}</strong> ·{' '}
          <button className="linkbtn" onClick={() => go({ name: 'receipt', receipt })}>
            View receipt {receipt.confirmation}
          </button>
        </div>
      )}

      <section className="panel">
        <h3 className="panel__title">License details</h3>
        <dl className="detailgrid">
          <div><dt>Owner</dt><dd>{license.owner}</dd></div>
          <div><dt>Contact</dt><dd>{license.email} · {license.phone}</dd></div>
          <div><dt>Business address</dt><dd>{license.address}</dd></div>
          <div><dt>Employees</dt><dd>{license.employees}</dd></div>
          <div><dt>First issued</dt><dd>{fmtDate(license.issued)}</dd></div>
          <div><dt>Expires</dt><dd>{fmtDate(license.expires)}</dd></div>
        </dl>
      </section>

      {!receipt && (
        <div className="feebox">
          <div>
            <div className="feebox__label">Renew online now</div>
            <div className="feebox__detail">
              Renewal fee{status === 'Expired' ? ' + late penalty' : ''} + $8 processing
            </div>
          </div>
          <div className="feebox__side">
            <div className="feebox__amount">${total}</div>
            <button
              className="btn btn--primary"
              onClick={() => go({ name: 'renew', licenseNumber: license.number })}
            >
              Start renewal →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
