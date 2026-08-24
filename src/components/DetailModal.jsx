import { useEffect } from 'react';
import StatusBadge from './StatusBadge';
import LoadingSpinner from './LoadingSpinner';

const DetailModal = ({
  isOpen,
  title = 'Record Details',
  data = null,
  isLoading = false,
  error = null,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format label for object key
  const formatLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase());
  };

  // Render detail values cleanly
  const renderValue = (key, val) => {
    if (val === null || val === undefined) return <span className="text-muted">N/A</span>;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (key.toLowerCase().includes('status')) return <StatusBadge status={String(val)} />;
    
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        if (val.length === 0) return <span className="text-muted">None</span>;
        if (typeof val[0] === 'object' && val[0] !== null) {
          return (
            <div className="nested-list" style={{ width: '100%', marginTop: '6px' }}>
              {val.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--bg-dark)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{item.name || 'Member'}</span>
                    <span className="badge-unit" style={{ marginLeft: '8px', fontSize: '0.75rem' }}>{item.relation || 'Family'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {item.age ? <span style={{ marginRight: '10px' }}>Age: <strong>{item.age}</strong></span> : null}
                    {item.phone ? <span>{item.phone}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          );
        }
        return val.join(', ');
      }
      return typeof val.name === 'string' ? val.name : JSON.stringify(val);
    }
    return String(val);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '94%' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="info-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <h3>{title}</h3>
          </div>
          <button className="icon-btn-close" onClick={onClose} title="Close">
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '20px 24px' }}>
          {isLoading ? (
            <div className="modal-loading-box flex-center p-8">
              <LoadingSpinner text="Fetching full details..." />
            </div>
          ) : error ? (
            <div className="alert alert-danger">
              <p>{error}</p>
            </div>
          ) : data ? (
            <div className="detail-grid">
              {Object.entries(data).map(([key, val]) => {
                // Skip internal keys, passwords, or guard fields if present in generic objects
                if (['_id', '__v', 'password', 'refreshToken', 'assignedGate', 'shiftTiming', 'onDuty', 'supervisorName', 'photoUrl', 'isFirstLogin'].includes(key) && title.toLowerCase().includes('resident')) {
                  return null;
                }
                if (['_id', '__v', 'password', 'refreshToken'].includes(key)) return null;

                const isFullRow = Array.isArray(val) && typeof val[0] === 'object';

                return (
                  <div key={key} className="detail-item" style={isFullRow ? { gridColumn: '1 / -1' } : {}}>
                    <span className="detail-label">{formatLabel(key)}</span>
                    <div className="detail-value">{renderValue(key, val)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted">No details available.</p>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
