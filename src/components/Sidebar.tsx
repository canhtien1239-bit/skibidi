import { useState, type FormEvent } from 'react';
import {
  Bookmark,
  Folder,
  FolderPlus,
  Link2,
  LogOut,
  Pin,
  Trash2,
  X,
} from 'lucide-react';
import {
  DEFAULT_FOLDER,
  type ActiveView,
  type FolderItem,
} from '../utils/linkLogic';
import type { UserProfile } from '../types';

interface SidebarProps {
  user: UserProfile;
  folders: FolderItem[];
  counts: {
    total: number;
    pinned: number;
    byFolder: Record<string, number>;
  };
  activeView: ActiveView;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectView: (view: ActiveView) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (folder: FolderItem) => void;
  onLogout: () => Promise<void>;
}

export function Sidebar({
  user,
  folders,
  counts,
  activeView,
  mobileOpen,
  onCloseMobile,
  onSelectView,
  onCreateFolder,
  onDeleteFolder,
  onLogout,
}: SidebarProps) {
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);
  const [savingFolder, setSavingFolder] = useState(false);

  const handleFolderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = newFolderName.trim();
    if (!clean) {
      setFolderError('Nhập tên thư mục.');
      return;
    }
    setFolderError(null);
    setSavingFolder(true);
    try {
      await onCreateFolder(clean);
      setNewFolderName('');
      setAddingFolder(false);
    } catch (err) {
      setFolderError(
        err instanceof Error ? err.message : 'Không thể tạo thư mục.'
      );
    } finally {
      setSavingFolder(false);
    }
  };

  const selectAndClose = (view: ActiveView) => {
    onSelectView(view);
    onCloseMobile();
  };

  const navContent = (
    <div className="h-full flex flex-col bg-slate-50 border-r border-slate-200 w-[260px]">
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center">
            <Link2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">
            Sổ Link
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Đóng thanh điều hướng"
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <nav
        aria-label="Danh mục liên kết"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-6"
      >
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => selectAndClose({ type: 'all' })}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeView.type === 'all'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Bookmark className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Tất cả liên kết</span>
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {counts.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectAndClose({ type: 'pinned' })}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeView.type === 'pinned'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Pin className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Đã ghim</span>
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {counts.pinned}
            </span>
          </button>
        </div>

        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Thư mục
            </span>
            <button
              type="button"
              onClick={() => {
                setAddingFolder((v) => !v);
                setFolderError(null);
              }}
              aria-label="Tạo thư mục mới"
              className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {addingFolder && (
            <form onSubmit={handleFolderSubmit} className="px-2 mb-3 space-y-1.5">
              <label htmlFor="new-folder-name" className="sr-only">
                Tên thư mục mới
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="new-folder-name"
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Tên thư mục..."
                  maxLength={48}
                  autoFocus
                  className="flex-1 min-w-0 h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <button
                  type="submit"
                  disabled={savingFolder}
                  className="h-8 px-2.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
              {folderError && (
                <p className="text-xs text-red-600 px-1">{folderError}</p>
              )}
            </form>
          )}

          <div className="space-y-0.5">
            {folders.map((folder) => {
              const isActive =
                activeView.type === 'folder' &&
                activeView.folder === folder.name;
              const isDefault = folder.name === DEFAULT_FOLDER;
              const count = counts.byFolder[folder.name] ?? 0;

              return (
                <div
                  key={folder.id}
                  className={`group flex items-center justify-between rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      selectAndClose({ type: 'folder', folder: folder.name })
                    }
                    className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-left cursor-pointer"
                  >
                    <Folder className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{folder.name}</span>
                  </button>

                  <div className="flex items-center gap-1 pr-2 shrink-0">
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => onDeleteFolder(folder)}
                        aria-label={`Xóa thư mục '${folder.name}'`}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <span className="text-xs font-mono tabular-nums text-slate-500 min-w-[1.25rem] text-right">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {user.displayName}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
}
