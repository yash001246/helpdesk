export default function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;
  return (
    <div className="pager">
      <span>{total} results</span>
      <div>
        <button className="btn ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
        <span className="pager-pos">Page {page} of {pages}</span>
        <button className="btn ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}
