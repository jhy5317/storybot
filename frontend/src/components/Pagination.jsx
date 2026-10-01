export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  // 현재 페이지 주변 최대 5개 번호 표시
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  const pages = []
  for (let p = start; p <= end; p++) pages.push(p)

  return (
    <nav className="pagination" aria-label="페이지">
      <button className="page-btn" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="이전 페이지">
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`page-btn ${p === page ? 'active' : ''}`}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button
        className="page-btn"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="다음 페이지"
      >
        ›
      </button>
    </nav>
  )
}
