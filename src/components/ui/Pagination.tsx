'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 20 }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{ fontSize: 13 }}
      >
        Previous
      </button>
      {pages.map((page, i) =>
        typeof page === 'string' ? (
          <span key={`dots-${i}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: 13 }}>
            {page}
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: 'none',
              fontSize: 13,
              fontWeight: currentPage === page ? 600 : 400,
              background: currentPage === page ? '#2563eb' : 'transparent',
              color: currentPage === page ? 'white' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {page}
          </button>
        )
      )}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{ fontSize: 13 }}
      >
        Next
      </button>
    </div>
  );
}
