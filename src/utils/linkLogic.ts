export interface WorkLink {
  id: string;
  userId: string;
  title: string;
  url: string;
  domain: string;
  folder: string;
  notes: string;
  tags: string[];
  isPinned: boolean;
  visitCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderItem {
  id: string;
  name: string;
  createdAt: string;
}

export type ActiveView =
  | { type: 'all' }
  | { type: 'pinned' }
  | { type: 'folder'; folder: string };

export type SortOption = 'pinned_first' | 'newest' | 'alpha' | 'most_visited';

export const DEFAULT_FOLDER = 'Công việc chung';

export const STARTER_FOLDERS = [
  DEFAULT_FOLDER,
  'Tài liệu',
  'Công cụ',
  'Dự án',
];

const DANGEROUS_SCHEME_RE = /^(javascript|data|vbscript|file|blob|about):/i;
const HAS_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function normalizeAndValidateUrl(
  rawUrl: string
): { ok: true; url: string; domain: string } | { ok: false; error: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false, error: 'Vui lòng nhập đường dẫn (URL).' };
  }
  if (trimmed.length > 2048) {
    return { ok: false, error: 'Đường dẫn quá dài (tối đa 2048 ký tự).' };
  }
  if (DANGEROUS_SCHEME_RE.test(trimmed)) {
    return {
      ok: false,
      error: 'Chỉ hỗ trợ đường dẫn bắt đầu bằng http:// hoặc https://.',
    };
  }

  let candidate = trimmed;
  if (!HAS_SCHEME_RE.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: 'Đường dẫn không đúng định dạng URL hợp lệ.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      error: 'Chỉ hỗ trợ đường dẫn bắt đầu bằng http:// hoặc https://.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || (!host.includes('.') && host !== 'localhost')) {
    return {
      ok: false,
      error: 'Tên miền trong đường dẫn không hợp lệ (ví dụ: docs.google.com).',
    };
  }

  const domain = host.replace(/^www\./, '');
  return { ok: true, url: parsed.toString(), domain };
}

export function parseTagsInput(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(',')) {
    const clean = part.trim().replace(/^#/, '').slice(0, 24);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= 8) break;
  }
  return result;
}

export interface LinkInputPayload {
  title: string;
  url: string;
  folder?: string;
  notes?: string;
  tags?: string[] | string;
  isPinned?: boolean;
}

export interface ValidatedLinkPayload {
  title: string;
  url: string;
  domain: string;
  folder: string;
  notes: string;
  tags: string[];
  isPinned: boolean;
}

export function validateLinkInput(
  input: LinkInputPayload
):
  | { ok: true; data: ValidatedLinkPayload }
  | { ok: false; fieldErrors: Partial<Record<'title' | 'url' | 'folder' | 'notes', string>> } {
  const fieldErrors: Partial<Record<'title' | 'url' | 'folder' | 'notes', string>> = {};

  const title = (input.title ?? '').trim();
  if (!title) {
    fieldErrors.title = 'Vui lòng nhập tiêu đề cho liên kết.';
  } else if (title.length > 160) {
    fieldErrors.title = 'Tiêu đề tối đa 160 ký tự.';
  }

  const urlResult = normalizeAndValidateUrl(input.url ?? '');
  if (!urlResult.ok) {
    fieldErrors.url = urlResult.error;
  }

  const folder = (input.folder ?? '').trim() || DEFAULT_FOLDER;
  if (folder.length > 48) {
    fieldErrors.folder = 'Tên thư mục tối đa 48 ký tự.';
  }

  const notes = (input.notes ?? '').trim();
  if (notes.length > 1000) {
    fieldErrors.notes = 'Ghi chú tối đa 1000 ký tự.';
  }

  if (Object.keys(fieldErrors).length > 0 || !urlResult.ok) {
    return { ok: false, fieldErrors };
  }

  const tags = Array.isArray(input.tags)
    ? input.tags
        .map((t) => String(t).trim().replace(/^#/, '').slice(0, 24))
        .filter(Boolean)
        .slice(0, 8)
    : parseTagsInput(input.tags ?? '');

  return {
    ok: true,
    data: {
      title,
      url: urlResult.url,
      domain: urlResult.domain,
      folder,
      notes,
      tags,
      isPinned: Boolean(input.isPinned),
    },
  };
}

export function filterAndSortLinks(
  links: WorkLink[],
  options: {
    query: string;
    activeView: ActiveView;
    sortBy: SortOption;
  }
): WorkLink[] {
  const q = options.query.trim().toLowerCase();

  const filtered = links.filter((link) => {
    if (options.activeView.type === 'pinned' && !link.isPinned) {
      return false;
    }
    if (
      options.activeView.type === 'folder' &&
      link.folder !== options.activeView.folder
    ) {
      return false;
    }

    if (!q) return true;

    const haystack = [
      link.title,
      link.domain,
      link.url,
      link.folder,
      link.notes,
      ...link.tags,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (options.sortBy === 'pinned_first') {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    }
    if (options.sortBy === 'alpha') {
      return a.title.localeCompare(b.title, 'vi');
    }
    if (options.sortBy === 'most_visited') {
      if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
      return b.updatedAt.localeCompare(a.updatedAt);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  return sorted;
}

export function computeFolderCounts(
  links: WorkLink[],
  folders: FolderItem[]
): {
  total: number;
  pinned: number;
  byFolder: Record<string, number>;
} {
  const byFolder: Record<string, number> = {};
  for (const f of folders) {
    byFolder[f.name] = 0;
  }
  let pinned = 0;
  for (const link of links) {
    if (link.isPinned) pinned += 1;
    byFolder[link.folder] = (byFolder[link.folder] ?? 0) + 1;
  }
  return {
    total: links.length,
    pinned,
    byFolder,
  };
}

export function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
