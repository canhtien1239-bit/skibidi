import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Pencil,
  Pin,
  Trash2,
} from 'lucide-react';
import { formatShortDate, type WorkLink } from '../utils/linkLogic';

interface LinkRowProps {
  link: WorkLink;
  onTogglePin: (link: WorkLink) => void;
  onEdit: (link: WorkLink) => void;
  onDelete: (link: WorkLink) => void;
  onVisit: (link: WorkLink) => void;
}

export function LinkRow({
  link,
  onTogglePin,
  onEdit,
  onDelete,
  onVisit,
}: LinkRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const monogram = (link.domain[0] ?? 'L').toUpperCase();

  return (
    <article className="px-4 sm:px-8 py-4 border-b border-slate-200 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <div
          aria-hidden="true"
          className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-mono text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5"
        >
          {monogram}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onVisit(link)}
              className="text-sm sm:text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate inline-flex items-center gap-1.5"
            >
              <span className="truncate">{link.title}</span>
              <ExternalLink
                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                aria-hidden="true"
              />
            </a>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            <span className="font-mono text-slate-600 truncate max-w-[240px]">
              {link.domain}
            </span>
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span aria-hidden="true">·</span>
              <span>{link.folder}</span>
            </span>
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {formatShortDate(link.createdAt)}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{link.visitCount} lượt mở</span>
            </span>
            {link.isPinned && (
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span aria-hidden="true">·</span>
                <span className="font-medium text-blue-600">Đã ghim</span>
              </span>
            )}
          </div>

          {(link.notes || link.tags.length > 0) && (
            <div className="mt-1.5 space-y-1">
              {link.notes && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                  {link.notes}
                </p>
              )}
              {link.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
                  {link.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
        <button
          type="button"
          onClick={() => onTogglePin(link)}
          aria-label={
            link.isPinned
              ? `Bỏ ghim '${link.title}'`
              : `Ghim '${link.title}'`
          }
          title={link.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            link.isPinned
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Pin className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Sao chép đường dẫn '${link.title}'`}
          title="Sao chép đường dẫn"
          className="px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span className="text-emerald-700">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sao chép</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onEdit(link)}
          aria-label={`Chỉnh sửa '${link.title}'`}
          title="Chỉnh sửa"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(link)}
          aria-label={`Xóa '${link.title}'`}
          title="Xóa liên kết"
          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
