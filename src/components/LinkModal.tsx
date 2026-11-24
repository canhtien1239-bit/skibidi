import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  DEFAULT_FOLDER,
  parseTagsInput,
  validateLinkInput,
  type FolderItem,
  type WorkLink,
} from '../utils/linkLogic';

interface LinkModalProps {
  open: boolean;
  editingLink: WorkLink | null;
  folders: FolderItem[];
  defaultFolder?: string;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    url: string;
    folder: string;
    notes: string;
    tags: string[];
    isPinned: boolean;
  }) => Promise<void>;
}

const CUSTOM_FOLDER_VALUE = '__custom__';

export function LinkModal({
  open,
  editingLink,
  folders,
  defaultFolder,
  onClose,
  onSave,
}: LinkModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [folderSelect, setFolderSelect] = useState(DEFAULT_FOLDER);
  const [customFolder, setCustomFolder] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [notes, setNotes] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingLink) {
      setTitle(editingLink.title);
      setUrl(editingLink.url);
      const hasFolder = folders.some((f) => f.name === editingLink.folder);
      setFolderSelect(hasFolder ? editingLink.folder : DEFAULT_FOLDER);
      setCustomFolder('');
      setTagsText(editingLink.tags.join(', '));
      setNotes(editingLink.notes);
      setIsPinned(editingLink.isPinned);
    } else {
      setTitle('');
      setUrl('');
      setFolderSelect(defaultFolder || DEFAULT_FOLDER);
      setCustomFolder('');
      setTagsText('');
      setNotes('');
      setIsPinned(false);
    }
    setFieldErrors({});
    setSubmitError(null);
  }, [open, editingLink, folders, defaultFolder]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const chosenFolder =
      folderSelect === CUSTOM_FOLDER_VALUE
        ? customFolder.trim() || DEFAULT_FOLDER
        : folderSelect;

    const validation = validateLinkInput({
      title,
      url,
      folder: chosenFolder,
      notes,
      tags: parseTagsInput(tagsText),
      isPinned,
    });

    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: validation.data.title,
        url: validation.data.url,
        folder: validation.data.folder,
        notes: validation.data.notes,
        tags: validation.data.tags,
        isPinned: validation.data.isPinned,
      });
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Không thể lưu liên kết.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2
            id="link-modal-title"
            className="text-base font-bold text-slate-900"
          >
            {editingLink ? 'Chỉnh sửa liên kết' : 'Thêm liên kết làm việc'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu mẫu liên kết"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          {submitError && (
            <div
              role="alert"
              className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            >
              {submitError}
            </div>
          )}

          <div>
            <label
              htmlFor="link-title"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Tiêu đề
            </label>
            <input
              id="link-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Bảng thiết kế Figma Q4"
              maxLength={160}
              autoFocus
              className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            {fieldErrors.title && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="link-url"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Đường dẫn (URL)
            </label>
            <input
              id="link-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://figma.com/file/..."
              maxLength={2048}
              className="w-full h-10 px-3 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            {fieldErrors.url && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.url}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="link-folder"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Thư mục
              </label>
              <select
                id="link-folder"
                value={folderSelect}
                onChange={(e) => setFolderSelect(e.target.value)}
                className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
                <option value={CUSTOM_FOLDER_VALUE}>+ Tạo thư mục mới...</option>
              </select>
              {folderSelect === CUSTOM_FOLDER_VALUE && (
                <input
                  type="text"
                  value={customFolder}
                  onChange={(e) => setCustomFolder(e.target.value)}
                  placeholder="Nhập tên thư mục mới..."
                  aria-label="Tên thư mục mới"
                  maxLength={48}
                  className="mt-2 w-full h-9 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              )}
              {fieldErrors.folder && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.folder}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="link-tags"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Từ khóa (cách nhau bằng dấu phẩy)
              </label>
              <input
                id="link-tags"
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="figma, sprint, nội-bộ"
                className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="link-notes"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Ghi chú ngắn
            </label>
            <textarea
              id="link-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mô tả nhanh mục đích hoặc thông tin cần nhớ..."
              maxLength={1000}
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none"
            />
            {fieldErrors.notes && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.notes}</p>
            )}
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
            <input
              id="link-pinned"
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            <span>Ghim liên kết này lên đầu danh sách</span>
          </label>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              {saving
                ? 'Đang lưu...'
                : editingLink
                  ? 'Cập nhật liên kết'
                  : 'Lưu liên kết'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
