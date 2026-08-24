const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  if (totalPages <= 1) return null;

  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination-wrapper flex-between my-4" style={{ padding: '12px 16px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
      <div className="pagination-info text-muted" style={{ fontSize: '0.85rem' }}>
        Showing <strong>{startItem}</strong> - <strong>{endItem}</strong> of <strong>{totalItems}</strong> records
      </div>
      <div className="pagination-controls flex-center" style={{ gap: '8px' }}>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          &larr; Previous
        </button>
        <span style={{ fontSize: '0.85rem', padding: '0 8px', color: 'var(--text-main)' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
