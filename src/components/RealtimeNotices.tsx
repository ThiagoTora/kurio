import { dismissNotice, useNotices } from "@/lib/realtime";

export function RealtimeNotices() {
  const notices = useNotices();
  return (
    // a região live fica sempre montada, para o leitor de tela anunciar os avisos
    <div
      role="status"
      aria-live="polite"
      className={
        notices.length ? "mx-auto max-w-[1000px] px-4 pt-3" : "sr-only"
      }
    >
      {notices.length > 0 && (
        <ul className="space-y-2">
          {notices.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-sm border border-accent bg-surface px-3 py-2 text-xs text-accent"
            >
              <span>{n.text}</span>
              <button
                onClick={() => dismissNotice(n.id)}
                aria-label="Dispensar aviso"
                className="text-muted hover:text-fg"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
