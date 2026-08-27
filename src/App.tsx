import { useCallback, useState } from 'react';
import { Landing } from './views/Landing';
import { Detail } from './views/Detail';
import { RenewWizard } from './views/RenewWizard';
import { ReceiptView } from './views/ReceiptView';
import { License, Receipt, loadLicenses } from './data';

export type View =
  | { name: 'landing' }
  | { name: 'detail'; licenseNumber: string }
  | { name: 'renew'; licenseNumber: string }
  | { name: 'receipt'; receipt: Receipt };

export default function App() {
  const [view, setView] = useState<View>({ name: 'landing' });
  const [licenses, setLicenses] = useState<License[]>(() => loadLicenses());

  const refresh = useCallback(() => setLicenses(loadLicenses()), []);

  const go = useCallback((v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
  }, []);

  const byNumber = (n: string) => licenses.find((l) => l.number === n) ?? licenses[0];

  return (
    <div className="portal">
      <nav className="topnav">
        <button className="topnav__brand" onClick={() => go({ name: 'landing' })}>
          <span className="topnav__seal" aria-hidden>◎</span>
          <span>
            <strong>City of Null Island</strong>
            <em>Business Licenses</em>
          </span>
        </button>
        <div className="topnav__links">
          <button
            className={view.name === 'landing' ? 'is-active' : ''}
            onClick={() => go({ name: 'landing' })}
          >
            Find a license
          </button>
        </div>
      </nav>

      {view.name === 'landing' && <Landing go={go} licenses={licenses} />}
      {view.name === 'detail' && <Detail license={byNumber(view.licenseNumber)} go={go} />}
      {view.name === 'renew' && (
        <RenewWizard license={byNumber(view.licenseNumber)} go={go} onRenewed={refresh} />
      )}
      {view.name === 'receipt' && <ReceiptView receipt={view.receipt} go={go} />}

      <footer className="footer">
        <div>
          <strong>City of Null Island</strong> · Business Licensing Division
        </div>
        <div className="footer__muted">
          0° 0′ N, 0° 0′ E · Open Mon–Fri, 8am–5pm · (555) 010-0088 · licenses@nullisland.gov
        </div>
      </footer>
    </div>
  );
}
