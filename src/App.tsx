import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { StatusBadge } from './components/StatusBadge';

type ViewMode = 'table' | 'card';

const STATUS_OPTIONS = ['All', 'Open', 'Closed', 'Pending', 'In Review'];
const TYPE_OPTIONS = ['All', 'Building', 'Planning', 'Enforcement', 'License'];

function TableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function App() {
  const [records, setRecords] = useState<Radish.AccelaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  const fetchRecords = useCallback(async (append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.customId = search;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (typeFilter !== 'All') params.type = typeFilter;
      params.offset = append ? String(records.length) : '0';
      params.limit = String(pageSize);

      const data = await radish.accela.getRecords(params);
      const results = Array.isArray(data) ? data : [];
      setHasMore(results.length >= pageSize);

      if (append) {
        setRecords((prev) => [...prev, ...results]);
      } else {
        setRecords(results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, statusFilter, typeFilter, records.length]);

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setRecords([]);
    setHasMore(true);
    fetchRecords();
  };

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setRecords([]);
    setHasMore(true);
    // Will refetch on next search
  };

  return (
    <div className="radish-app">
      <Header title="Records Dashboard" />

      <main className="radish-main">
        {/* Search & Filters */}
        <form onSubmit={handleSearch} className="radish-toolbar">
          <div className="radish-toolbar__group radish-toolbar__group--grow">
            <label className="radish-label">Search Records</label>
            <input
              type="text"
              className="radish-input"
              placeholder="Record ID or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="radish-toolbar__group">
            <label className="radish-label">Status</label>
            <select className="radish-select" value={statusFilter} onChange={handleFilterChange(setStatusFilter)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="radish-toolbar__group">
            <label className="radish-label">Type</label>
            <select className="radish-select" value={typeFilter} onChange={handleFilterChange(setTypeFilter)}>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button type="submit" className="radish-btn radish-btn--primary radish-btn--md" disabled={loading}>
            {loading ? (
              <><span className="radish-spinner" /> Searching...</>
            ) : (
              <><SearchIcon /> Search</>
            )}
          </button>
        </form>

        {/* Result bar */}
        <div className="radish-result-bar">
          <span className="radish-result-bar__count">
            {loading ? 'Loading...' : `${records.length} record${records.length !== 1 ? 's' : ''}`}
          </span>
          <div className="radish-view-toggle">
            <button
              className={`radish-view-toggle__btn ${viewMode === 'table' ? 'radish-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <TableIcon />
            </button>
            <button
              className={`radish-view-toggle__btn ${viewMode === 'card' ? 'radish-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('card')}
              title="Card view"
            >
              <GridIcon />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="radish-error">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && records.length > 0 && (
          <div className="radish-table-wrap">
            <table className="radish-table">
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Opened</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id}>
                    <td className="cell-mono">{rec.customId || rec.id}</td>
                    <td>{rec.type?.text ?? rec.module ?? '-'}</td>
                    <td><StatusBadge status={rec.status?.text ?? '-'} /></td>
                    <td className="cell-muted">{rec.openedDate ?? '-'}</td>
                    <td className="cell-muted cell-truncate">{rec.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Card View */}
        {viewMode === 'card' && records.length > 0 && (
          <div className="radish-card-grid">
            {records.map((rec) => (
              <div key={rec.id} className="radish-card radish-card--clickable">
                <div className="radish-card__header">
                  <span className="cell-mono">{rec.customId || rec.id}</span>
                  <StatusBadge status={rec.status?.text ?? '-'} />
                </div>
                <div className="card-type">{rec.type?.text ?? rec.module ?? 'Unknown type'}</div>
                <div className="card-desc">{rec.description || 'No description'}</div>
                {rec.openedDate && (
                  <div className="card-date">Opened {rec.openedDate}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && records.length === 0 && !error && (
          <div className="radish-empty">
            <div className="radish-empty__icon"><SearchIcon /></div>
            <div className="radish-empty__title">No records found</div>
            <div className="radish-empty__description">
              Try adjusting your search or filters to find what you're looking for.
            </div>
          </div>
        )}

        {/* Load More */}
        {records.length > 0 && hasMore && (
          <div className="radish-load-more">
            <button
              className="radish-btn radish-btn--secondary radish-btn--md"
              disabled={loadingMore}
              onClick={() => fetchRecords(true)}
            >
              {loadingMore ? (
                <><span className="radish-spinner" /> Loading...</>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
