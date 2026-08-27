import { View } from '../App';
import { Receipt, fmtDate, fmtDateTime } from '../data';

export function ReceiptView({ receipt, go }: { receipt: Receipt; go: (v: View) => void }) {
  return (
    <main className="container container--narrow">
      <div className="confirm">
        <div className="confirm__check" aria-hidden>✓</div>
        <h1>You're renewed!</h1>
        <p className="confirm__lede">
          <strong>{receipt.businessName}</strong> is licensed through{' '}
          <strong>{fmtDate(receipt.newExpiry)}</strong>. A copy of this receipt and your updated
          certificate were emailed to you.
        </p>

        <div className="receipt">
          <div className="receipt__head">
            <span className="receipt__seal" aria-hidden>◎</span>
            <div>
              <strong>City of Null Island</strong>
              <em>Business Licensing Division — Official Receipt</em>
            </div>
          </div>
          <dl className="receipt__meta">
            <div><dt>Confirmation</dt><dd>{receipt.confirmation}</dd></div>
            <div><dt>License</dt><dd>{receipt.licenseNumber}</dd></div>
            <div><dt>Paid</dt><dd>{fmtDateTime(receipt.paidAt)}</dd></div>
            <div><dt>Method</dt><dd>Card •••• 4242</dd></div>
          </dl>
          <div className="receipt__lines">
            {receipt.lines.map((l) => (
              <div className="feebox__line" key={l.label}>
                <span>{l.label}</span>
                <span>${l.amount}</span>
              </div>
            ))}
            <div className="feebox__line feebox__line--total">
              <span>Total paid</span>
              <span>${receipt.total}</span>
            </div>
          </div>
          <div className="receipt__foot">
            New expiration date: <strong>{fmtDate(receipt.newExpiry)}</strong>
          </div>
        </div>

        <div className="confirm__actions">
          <button className="btn btn--primary" onClick={() => window.print()}>
            Print receipt
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => go({ name: 'detail', licenseNumber: receipt.licenseNumber })}
          >
            Back to license
          </button>
          <button className="btn btn--ghost" onClick={() => go({ name: 'landing' })}>
            All licenses
          </button>
        </div>
      </div>
    </main>
  );
}
