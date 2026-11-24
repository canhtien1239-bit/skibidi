import type { FolderItem, UserProfile, WorkLink } from '../types';

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Requested-With', 'WorkLinksApp');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === 'string'
        ? payload.error
        : 'Đã xảy ra lỗi khi kết nối máy chủ.',
      response.status,
      payload.fieldErrors
    );
  }
  return payload as T;
}

export const api = {
  getMe: () => request<{ user: UserProfile | null }>('/api/auth/me'),

  login: (body: { email: string; password: string }) =>
    request<{ user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  register: (body: { displayName: string; email: string; password: string }) =>
    request<{ user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  getWorkspace: () =>
    request<{ folders: FolderItem[]; links: WorkLink[] }>('/api/workspace'),

  createLink: (body: {
    title: string;
    url: string;
    folder: string;
    notes: string;
    tags: string[];
    isPinned: boolean;
  }) =>
    request<{ link: WorkLink; folders: FolderItem[] }>('/api/links', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateLink: (
    id: string,
    body: {
      title?: string;
      url?: string;
      folder?: string;
      notes?: string;
      tags?: string[];
      isPinned?: boolean;
      incrementVisit?: boolean;
    }
  ) =>
    request<{ link: WorkLink; folders?: FolderItem[] }>(`/api/links/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteLink: (id: string) =>
    request<{ ok: boolean }>(`/api/links/${id}`, {
      method: 'DELETE',
    }),

  createFolder: (name: string) =>
    request<{ folder: FolderItem; folders: FolderItem[] }>('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  deleteFolder: (id: string) =>
    request<{ folders: FolderItem[]; links: WorkLink[] }>(
      `/api/folders/${id}`,
      {
        method: 'DELETE',
      }
    ),
};
