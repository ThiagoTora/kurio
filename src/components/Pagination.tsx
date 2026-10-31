interface Props {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const visible = Array.from({ length: Math.min(pages, 4) }, (_, i) => {
    const start = Math.min(Math.max(1, page - 1), Math.max(1, pages - 3));
    return start + i;
  });

  const base = "grid h-7 w-7 place-items-center rounded-sm text-xs";

  return (
    <nav aria-label="Paginação" className="mt-8 flex justify-end gap-2">
      {visible.map((p) => (
        <button
          type="button"
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? "page" : undefined}
          aria-label={`Página ${p}`}
          className={`${base} ${p === page ? "bg-accent text-bg" : "bg-surface text-muted hover:text-fg"}`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        aria-label="Próxima página"
        className={`${base} bg-surface text-muted disabled:opacity-40`}
      >
        ›
      </button>
    </nav>
  );
}
