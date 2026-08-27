import { useState, type ReactNode } from 'react';
import { View } from '../App';
import {
  EMPLOYEE_BANDS,
  License,
  fmtDate,
  licenseStatus,
  newExpiryFor,
  renewalLines,
  saveRenewal,
} from '../data';

const STEPS = ['Confirm business', 'Update details', 'Review & pay'];

export function RenewWizard({
  license,
  go,
  onRenewed,
}: {
  license: License;
  go: (v: View) => void;
  onRenewed: () => void;
}) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(license.email);
  const [phone, setPhone] = useState(license.phone);
  const [employees, setEmployees] = useState(license.employees);
  const [tried, setTried] = useState(false);
  const [certified, setCertified] = useState(false);

  const lines = renewalLines(license);
  const total = lines.reduce((s, l) => s + l.amount, 0);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const phoneOk = phone.replace(/\D/g, '').length >= 10;

  const next = () => {
    setTried(true);
    if (step === 1 && (!emailOk || !phoneOk)) return;
    setTried(false);
    setStep((s) => Math.min(s + 1, 2));
    window.scrollTo({ top: 0 });
  };

  const pay = () => {
    setTried(true);
    if (!certified) return;
    const receipt = saveRenewal(license, { email, phone, employees });
    onRenewed();
    go({ name: 'receipt', receipt });
  };

  return (
    <main className="container container--narrow">
      <div className="wizard__head">
        <h1>Renew {license.number}</h1>
        <p className="muted">{license.businessName} · {license.type}</p>
      </div>

      <ol className="progress">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? 'is-current' : i < step ? 'is-done' : ''}>
            <button type="button" disabled={i > step} onClick={() => i < step && setStep(i)}>
              <span className="progress__dot">{i < step ? '✓' : i + 1}</span>
              <span className="progress__label">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <section className="panel">
        {step === 0 && (
          <div className="formgrid">
            <h2>Is this your business?</h2>
            <dl className="detailgrid">
              <div><dt>Legal name</dt><dd>{license.businessName}</dd></div>
              {license.dba && <div><dt>DBA</dt><dd>{license.dba}</dd></div>}
              <div><dt>License type</dt><dd>{license.type}</dd></div>
              <div><dt>Owner</dt><dd>{license.owner}</dd></div>
              <div><dt>Address</dt><dd>{license.address}</dd></div>
              <div><dt>Current expiry</dt><dd>{fmtDate(license.expires)}</dd></div>
            </dl>
            <div className="notice">
              Renewing keeps everything above the same. Need to change the legal name, ownership,
              or address? Call the Licensing Division instead — those changes need a new
              application.
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="formgrid">
            <h2>Anything to update?</h2>
            <div className="formgrid__row">
              <Field label="Contact email" required error={tried && !emailOk} errorText="Enter a valid email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Phone" required error={tried && !phoneOk} errorText="Enter a 10-digit phone">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
            <Field label="Number of employees" required error={false}>
              <select value={employees} onChange={(e) => setEmployees(e.target.value)}>
                {EMPLOYEE_BANDS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="review">
            <h2>Review & pay</h2>
            <div className="review__section">
              <div className="review__head">
                <h3>Renewal summary</h3>
              </div>
              <dl>
                <Row k="License" v={`${license.number} · ${license.businessName}`} />
                <Row k="Contact" v={`${email} · ${phone}`} />
                <Row k="Employees" v={employees} />
                <Row k="New expiration" v={fmtDate(newExpiryFor(license))} />
              </dl>
            </div>

            <div className="feebox feebox--detailed">
              <div className="feebox__lines">
                {lines.map((l) => (
                  <div className="feebox__line" key={l.label}>
                    <span>{l.label}</span>
                    <span>${l.amount}</span>
                  </div>
                ))}
                <div className="feebox__line feebox__line--total">
                  <span>Total due today</span>
                  <span>${total}</span>
                </div>
              </div>
            </div>

            <div className="paybox">
              <div className="paybox__row">
                <span className="paybox__icon" aria-hidden>💳</span>
                <span>
                  <strong>City payment portal (demo)</strong>
                  <em>Card ending •••• 4242 on file</em>
                </span>
              </div>
            </div>

            <label className={'certify' + (tried && !certified ? ' certify--error' : '')}>
              <input
                type="checkbox"
                checked={certified}
                onChange={(e) => setCertified(e.target.checked)}
              />
              <span>
                I certify this business remains in good standing and the information above is
                accurate.
              </span>
            </label>
          </div>
        )}

        <div className="panel__actions">
          {step > 0 ? (
            <button className="btn btn--ghost" onClick={() => setStep((s) => s - 1)}>
              ← Back
            </button>
          ) : (
            <button
              className="btn btn--ghost"
              onClick={() => go({ name: 'detail', licenseNumber: license.number })}
            >
              Cancel
            </button>
          )}
          {step < 2 ? (
            <button className="btn btn--primary" onClick={next}>
              {step === 0 ? 'Yes, continue →' : 'Continue →'}
            </button>
          ) : (
            <button className="btn btn--primary btn--lg" onClick={pay}>
              Pay ${total} & renew
            </button>
          )}
        </div>
      </section>

      {licenseStatus(license) === 'Expired' && step < 2 && (
        <p className="muted center">A $50 late penalty is included because this license is expired.</p>
      )}
    </main>
  );
}

function Field({
  label,
  required,
  error,
  errorText,
  children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  errorText?: string;
  children: ReactNode;
}) {
  return (
    <label className={'field' + (error ? ' field--error' : '')}>
      <span className="field__label">
        {label} {required && <span className="req">*</span>}
        {error && <em className="field__errtext"> — {errorText ?? 'required'}</em>}
      </span>
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="review__row">
      <dt>{k}</dt>
      <dd>{v || '—'}</dd>
    </div>
  );
}
