import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, Menu, Plus, Search, X } from 'lucide-react';
import { api, ApiError } from '../api/client';
import type { UserProfile } from '../types';
import {
  computeFolderCounts,
  filterAndSortLinks,
  type ActiveView,
  type FolderItem,
  type SortOption,
  type WorkLink,
} from '../utils/linkLogic';
import { ConfirmDialog } from './ConfirmDialog';
import { LinkModal } from './LinkModal';
import { LinkRow } from './LinkRow';
import { Sidebar } from './Sidebar';

interface WorkspaceProps {
  user: UserProfile;
  onLoggedOut: () => void;
}

export function Workspace({ user, onLoggedOut }: WorkspaceProps) {
  const [links, setLinks] = useState<WorkLink[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<ActiveView>({ type: 'all' });
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('pinned_first');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<WorkLink | null>(null);

  const [deletingLink, setDeletingLink] = useState<WorkLink | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderItem | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getWorkspace();
      setFolders(data.folders);
      setLinks(data.links);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onLoggedOut();
        return;
      }
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách liên kết.'
      );
    } finally {
      setLoading(false);
    }
  }, [onLoggedOut]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const counts = useMemo(
    () => computeFolderCounts(links, folders),
    [links, folders]
  );

  const visibleLinks = useMemo(
    () => filterAndSortLinks(links, { query, activeView, sortBy }),
    [links, query, activeView, sortBy]
  );

  const activeTitle = useMemo(() => {
    if (activeView.type === 'pinned') return 'Liên kết đã ghim';
    if (activeView.type === 'folder') return activeView.folder;
    return 'Tất cả liên kết';
  }, [activeView]);

  const handleSaveLink = async (payload: {
    title: string;
    url: string;
    folder: string;
    notes: string;
    tags: string[];
    isPinned: boolean;
  }) => {
    if (editingLink) {
      const res = await api.updateLink(editingLink.id, payload);
      setLinks((prev) =>
        prev.map((item) => (item.id === res.link.id ? res.link : item))
      );
      if (res.folders) setFolders(res.folders);
      showNotice('Đã cập nhật liên kết.');
    } else {
      const res = await api.createLink(payload);
      setLinks((prev) => [res.link, ...prev]);
      setFolders(res.folders);
      showNotice('Đã lưu liên kết mới.');
    }
  };

  const handleTogglePin = async (link: WorkLink) => {
    const nextPinned = !link.isPinned;
    setLinks((prev) =>
      prev.map((item) =>
        item.id === link.id ? { ...item, isPinned: nextPinned } : item
      )
    );
    try {
      const res = await api.updateLink(link.id, { isPinned: nextPinned });
      setLinks((prev) =>
        prev.map((item) => (item.id === res.link.id ? res.link : item))
      );
    } catch {
      setLinks((prev) =>
        prev.map((item) => (item.id === link.id ? link : item))
      );
    }
  };

  const handleVisitLink = async (link: WorkLink) => {
    setLinks((prev) =>
      prev.map((item) =>
        item.id === link.id
          ? { ...item, visitCount: item.visitCount + 1 }
          : item
      )
    );
    try {
      await api.updateLink(link.id, { incrementVisit: true });
    } catch {
      // Non-blocking telemetry update
    }
  };

  const handleConfirmDeleteLink = async () => {
    if (!deletingLink) return;
    setDeletingBusy(true);
    try {
      await api.deleteLink(deletingLink.id);
      setLinks((prev) => prev.filter((item) => item.id !== deletingLink.id));
      setDeletingLink(null);
      showNotice('Đã xóa liên kết.');
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Không thể xóa liên kết.'
      );
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleCreateFolder = async (name: string) => {
    const res = await api.createFolder(name);
    setFolders(res.folders);
    setActiveView({ type: 'folder', folder: res.folder.name });
    showNotice(`Đã tạo thư mục "${res.folder.name}".`);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deletingFolder) return;
    setDeletingBusy(true);
    try {
      const res = await api.deleteFolder(deletingFolder.id);
      setFolders(res.folders);
      setLinks(res.links);
      if (
        activeView.type === 'folder' &&
        activeView.folder === deletingFolder.name
      ) {
        setActiveView({ type: 'all' });
      }
      setDeletingFolder(null);
      showNotice('Đã xóa thư mục và chuyển liên kết về Công việc chung.');
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Không thể xóa thư mục.'
      );
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    onLoggedOut();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex">
      <Sidebar
        user={user}
        folders={folders}
        counts={counts}
        activeView={activeView}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onSelectView={setActiveView}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={(folder) => setDeletingFolder(folder)}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-8 border-b border-slate-200 bg-white sticky top-0 z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở danh mục thư mục"
              className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2 min-w-0 text-sm">
              <span className="hidden sm:inline text-slate-400">Kho link</span>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {activeTitle}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingLink(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Thêm liên kết</span>
          </button>
        </header>

        <div className="px-4 sm:px-8 py-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="workspace-search" className="sr-only">
              Tìm kiếm liên kết
            </label>
            <input
              id="workspace-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề, URL, ghi chú hoặc #tag..."
              className="w-full h-9 pl-9 pr-8 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {visibleLinks.length} liên kết
            </span>
            <label htmlFor="workspace-sort" className="sr-only">
              Sắp xếp liên kết
            </label>
            <select
              id="workspace-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              <option value="pinned_first">Ưu tiên đã ghim</option>
              <option value="newest">Mới lưu gần đây</option>
              <option value="most_visited">Mở nhiều nhất</option>
              <option value="alpha">Tên A–Z</option>
            </select>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="mx-4 sm:mx-8 mt-4 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium flex items-center justify-between"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Đóng thông báo"
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {loadError && (
          <div
            role="alert"
            className="mx-4 sm:mx-8 mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-4"
          >
            <span>{loadError}</span>
            <button
              type="button"
              onClick={loadWorkspace}
              className="text-xs font-semibold underline cursor-pointer shrink-0"
            >
              Thử lại
            </button>
          </div>
        )}

        <main className="flex-1" data-testid="links-list">
          {loading ? (
            <div className="divide-y divide-slate-200">
              {[1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="px-4 sm:px-8 py-4 flex items-start gap-3.5 animate-pulse"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-56 bg-slate-100 rounded" />
                    <div className="h-3 w-72 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleLinks.length === 0 ? (
            <div className="px-4 py-16 text-center max-w-md mx-auto">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                {links.length === 0
                  ? 'Chưa có liên kết làm việc nào'
                  : 'Không tìm thấy liên kết phù hợp'}
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                {links.length === 0
                  ? 'Hãy lưu tài liệu, trang quản trị dự án hoặc công cụ làm việc đầu tiên cho tài khoản của bạn.'
                  : 'Thử thay đổi từ khóa tìm kiếm hoặc chuyển sang thư mục khác.'}
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                {links.length === 0 || activeView.type === 'folder' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLink(null);
                      setModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Thêm liên kết đầu tiên
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setActiveView({ type: 'all' });
                    }}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Xem tất cả liên kết
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              {visibleLinks.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  onTogglePin={handleTogglePin}
                  onEdit={(item) => {
                    setEditingLink(item);
                    setModalOpen(true);
                  }}
                  onDelete={(item) => setDeletingLink(item)}
                  onVisit={handleVisitLink}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <LinkModal
        open={modalOpen}
        editingLink={editingLink}
        folders={folders}
        defaultFolder={
          activeView.type === 'folder' ? activeView.folder : undefined
        }
        onClose={() => {
          setModalOpen(false);
          setEditingLink(null);
        }}
        onSave={handleSaveLink}
      />

      <ConfirmDialog
        open={Boolean(deletingLink)}
        title="Xóa liên kết này?"
        description={
          deletingLink
            ? `Liên kết "${deletingLink.title}" sẽ bị xóa khỏi tài khoản của bạn.`
            : ''
        }
        confirmLabel="Xóa liên kết"
        busy={deletingBusy}
        onCancel={() => setDeletingLink(null)}
        onConfirm={handleConfirmDeleteLink}
      />

      <ConfirmDialog
        open={Boolean(deletingFolder)}
        title="Xóa thư mục này?"
        description={
          deletingFolder
            ? `Thư mục "${deletingFolder.name}" sẽ bị xóa. Các liên kết bên trong sẽ được chuyển về mục Công việc chung.`
            : ''
        }
        confirmLabel="Xóa thư mục"
        busy={deletingBusy}
        onCancel={() => setDeletingFolder(null)}
        onConfirm={handleConfirmDeleteFolder}
      />
    </div>
  );
}
