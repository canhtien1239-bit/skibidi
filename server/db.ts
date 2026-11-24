import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  DEFAULT_FOLDER,
  STARTER_FOLDERS,
  type FolderItem,
  type WorkLink,
} from '../src/utils/linkLogic.ts';
import { hashPassword } from './auth.ts';

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

interface DbUserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
}

interface DbLinkRow {
  id: string;
  user_id: string;
  title: string;
  url: string;
  domain: string;
  folder: string;
  notes: string;
  tags_json: string;
  is_pinned: number;
  visit_count: number;
  created_at: string;
  updated_at: string;
}

interface DbFolderRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'worklinks.db');

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      domain TEXT NOT NULL,
      folder TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      visit_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
  `);

  seedInitialDemoUsers(db);
  dbInstance = db;
  return db;
}

function seedInitialDemoUsers(db: DatabaseSync): void {
  const countRow = db
    .prepare('SELECT COUNT(*) AS count FROM users')
    .get() as { count: number };
  if (countRow.count > 0) return;

  const now = new Date().toISOString();

  // Demo account 1: Minh Nguyễn
  const minhId = crypto.randomUUID();
  const minhCreds = hashPassword('WorkLink@2026');
  db.prepare(
    `INSERT INTO users (id, email, display_name, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    minhId,
    'minh.nguyen@work.vn',
    'Minh Nguyễn',
    minhCreds.hash,
    minhCreds.salt,
    now
  );

  for (const folderName of [...STARTER_FOLDERS, 'Thiết kế']) {
    db.prepare(
      `INSERT INTO folders (id, user_id, name, created_at) VALUES (?, ?, ?, ?)`
    ).run(crypto.randomUUID(), minhId, folderName, now);
  }

  const minhLinks = [
    {
      title: 'Bảng điều phối Sprint Q4',
      url: 'https://linear.app/team/sprint-q4',
      domain: 'linear.app',
      folder: 'Dự án',
      notes: 'Theo dõi tiến độ các đầu việc kỹ thuật và phát hành tuần này.',
      tags: ['sprint', 'kỹ thuật'],
      isPinned: 1,
      visitCount: 18,
    },
    {
      title: 'Hệ thống thiết kế & UI Kit',
      url: 'https://www.figma.com/community',
      domain: 'figma.com',
      folder: 'Thiết kế',
      notes: 'Thư viện thành phần giao diện dùng chung cho sản phẩm web.',
      tags: ['figma', 'ui-kit'],
      isPinned: 1,
      visitCount: 12,
    },
    {
      title: 'Tài liệu đặc tả API v2',
      url: 'https://swagger.io/specification/',
      domain: 'swagger.io',
      folder: 'Tài liệu',
      notes: 'Quy chuẩn endpoint và cấu trúc phản hồi REST API nội bộ.',
      tags: ['api', 'backend'],
      isPinned: 0,
      visitCount: 9,
    },
    {
      title: 'Kho lưu trữ mã nguồn chính',
      url: 'https://github.com/features',
      domain: 'github.com',
      folder: 'Công cụ',
      notes: 'Quản lý pull request và kiểm thử tự động CI/CD.',
      tags: ['git', 'ci-cd'],
      isPinned: 0,
      visitCount: 25,
    },
    {
      title: 'Bảng kế hoạch OKR Quý 4',
      url: 'https://docs.google.com/spreadsheets',
      domain: 'docs.google.com',
      folder: 'Công việc chung',
      notes: 'Cập nhật chỉ số hoàn thành mục tiêu hàng tuần vào thứ Sáu.',
      tags: ['okr', 'báo-cáo'],
      isPinned: 0,
      visitCount: 7,
    },
  ];

  const insertLink = db.prepare(
    `INSERT INTO links (
      id, user_id, title, url, domain, folder, notes, tags_json, is_pinned, visit_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (let i = 0; i < minhLinks.length; i += 1) {
    const item = minhLinks[i];
    const ts = new Date(Date.now() - i * 3600_000).toISOString();
    insertLink.run(
      crypto.randomUUID(),
      minhId,
      item.title,
      item.url,
      item.domain,
      item.folder,
      item.notes,
      JSON.stringify(item.tags),
      item.isPinned,
      item.visitCount,
      ts,
      ts
    );
  }

  // Demo account 2: Linh Trần (isolated separate workspace)
  const linhId = crypto.randomUUID();
  const linhCreds = hashPassword('WorkLink@2026');
  db.prepare(
    `INSERT INTO users (id, email, display_name, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    linhId,
    'linh.tran@design.vn',
    'Linh Trần',
    linhCreds.hash,
    linhCreds.salt,
    now
  );

  for (const folderName of [DEFAULT_FOLDER, 'Nghiên cứu UX', 'Tài nguyên']) {
    db.prepare(
      `INSERT INTO folders (id, user_id, name, created_at) VALUES (?, ?, ?, ?)`
    ).run(crypto.randomUUID(), linhId, folderName, now);
  }

  insertLink.run(
    crypto.randomUUID(),
    linhId,
    'Bộ quy tắc tương phản WCAG 2.2',
    'https://www.w3.org/WAI/standards-guidelines/wcag/',
    'w3.org',
    'Nghiên cứu UX',
    'Tra cứu tiêu chuẩn độ tương phản văn bản và khả năng truy cập.',
    JSON.stringify(['accessibility', 'ux']),
    1,
    6,
    now,
    now
  );
}

function mapLinkRow(row: DbLinkRow): WorkLink {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags_json);
    if (Array.isArray(parsed)) {
      tags = parsed.map(String);
    }
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    url: row.url,
    domain: row.domain,
    folder: row.folder,
    notes: row.notes,
    tags,
    isPinned: Boolean(row.is_pinned),
    visitCount: row.visit_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function findUserByEmail(
  email: string
): (UserRecord & { passwordHash: string; passwordSalt: string }) | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as DbUserRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at,
  };
}

export function createUserAccount(input: {
  email: string;
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
}): UserRecord {
  const db = getDb();
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();
  const normalizedEmail = input.email.trim().toLowerCase();

  db.prepare(
    `INSERT INTO users (id, email, display_name, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    normalizedEmail,
    input.displayName.trim(),
    input.passwordHash,
    input.passwordSalt,
    now
  );

  const insertFolder = db.prepare(
    `INSERT INTO folders (id, user_id, name, created_at) VALUES (?, ?, ?, ?)`
  );
  for (const name of STARTER_FOLDERS) {
    insertFolder.run(crypto.randomUUID(), userId, name, now);
  }

  return {
    id: userId,
    email: normalizedEmail,
    displayName: input.displayName.trim(),
    createdAt: now,
  };
}

export function insertSession(
  userId: string,
  tokenHash: string,
  expiresAt: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    new Date().toISOString()
  );
}

export function getUserBySessionTokenHash(
  tokenHash: string
): UserRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as
    | {
        id: string;
        email: string;
        display_name: string;
        created_at: string;
        expires_at: string;
      }
    | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

export function deleteSessionByTokenHash(tokenHash: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function listFoldersForUser(userId: string): FolderItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, user_id, name, created_at
       FROM folders
       WHERE user_id = ?
       ORDER BY CASE WHEN name = ? THEN 0 ELSE 1 END, created_at ASC`
    )
    .all(userId, DEFAULT_FOLDER) as unknown as DbFolderRow[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
  }));
}

export function ensureFolderForUser(userId: string, name: string): FolderItem {
  const db = getDb();
  const cleanName = name.trim() || DEFAULT_FOLDER;
  const existing = db
    .prepare('SELECT id, user_id, name, created_at FROM folders WHERE user_id = ? AND name = ?')
    .get(userId, cleanName) as DbFolderRow | undefined;
  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      createdAt: existing.created_at,
    };
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO folders (id, user_id, name, created_at) VALUES (?, ?, ?, ?)'
  ).run(id, userId, cleanName, now);
  return { id, name: cleanName, createdAt: now };
}

export function deleteFolderForUser(
  userId: string,
  folderId: string
): { ok: true; fallbackFolder: string } | { ok: false; error: string } {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, user_id, name, created_at FROM folders WHERE id = ? AND user_id = ?')
    .get(folderId, userId) as DbFolderRow | undefined;

  if (!existing) {
    return { ok: false, error: 'Không tìm thấy thư mục này.' };
  }
  if (existing.name === DEFAULT_FOLDER) {
    return {
      ok: false,
      error: `Không thể xóa thư mục mặc định "${DEFAULT_FOLDER}".`,
    };
  }

  ensureFolderForUser(userId, DEFAULT_FOLDER);
  db.prepare(
    'UPDATE links SET folder = ?, updated_at = ? WHERE user_id = ? AND folder = ?'
  ).run(DEFAULT_FOLDER, new Date().toISOString(), userId, existing.name);
  db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(
    folderId,
    userId
  );

  return { ok: true, fallbackFolder: DEFAULT_FOLDER };
}

export function listLinksForUser(userId: string): WorkLink[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM links WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC`
    )
    .all(userId) as unknown as DbLinkRow[];
  return rows.map(mapLinkRow);
}

export function createLinkForUser(
  userId: string,
  data: {
    title: string;
    url: string;
    domain: string;
    folder: string;
    notes: string;
    tags: string[];
    isPinned: boolean;
  }
): WorkLink {
  const db = getDb();
  ensureFolderForUser(userId, data.folder);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO links (
      id, user_id, title, url, domain, folder, notes, tags_json, is_pinned, visit_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(
    id,
    userId,
    data.title,
    data.url,
    data.domain,
    data.folder,
    data.notes,
    JSON.stringify(data.tags),
    data.isPinned ? 1 : 0,
    now,
    now
  );

  const row = db
    .prepare('SELECT * FROM links WHERE id = ? AND user_id = ?')
    .get(id, userId) as unknown as DbLinkRow;
  return mapLinkRow(row);
}

export function getLinkForUser(userId: string, linkId: string): WorkLink | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM links WHERE id = ? AND user_id = ?')
    .get(linkId, userId) as DbLinkRow | undefined;
  return row ? mapLinkRow(row) : null;
}

export function updateLinkForUser(
  userId: string,
  linkId: string,
  updates: {
    title?: string;
    url?: string;
    domain?: string;
    folder?: string;
    notes?: string;
    tags?: string[];
    isPinned?: boolean;
    incrementVisit?: boolean;
  }
): WorkLink | null {
  const db = getDb();
  const existing = getLinkForUser(userId, linkId);
  if (!existing) return null;

  const nextFolder = updates.folder ?? existing.folder;
  ensureFolderForUser(userId, nextFolder);

  const now = new Date().toISOString();
  const nextTitle = updates.title ?? existing.title;
  const nextUrl = updates.url ?? existing.url;
  const nextDomain = updates.domain ?? existing.domain;
  const nextNotes = updates.notes ?? existing.notes;
  const nextTags = updates.tags ?? existing.tags;
  const nextPinned =
    updates.isPinned !== undefined ? updates.isPinned : existing.isPinned;
  const nextVisitCount = updates.incrementVisit
    ? existing.visitCount + 1
    : existing.visitCount;

  db.prepare(
    `UPDATE links
     SET title = ?, url = ?, domain = ?, folder = ?, notes = ?, tags_json = ?, is_pinned = ?, visit_count = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    nextTitle,
    nextUrl,
    nextDomain,
    nextFolder,
    nextNotes,
    JSON.stringify(nextTags),
    nextPinned ? 1 : 0,
    nextVisitCount,
    updates.incrementVisit ? existing.updatedAt : now,
    linkId,
    userId
  );

  return getLinkForUser(userId, linkId);
}

export function deleteLinkForUser(userId: string, linkId: string): boolean {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM links WHERE id = ? AND user_id = ?')
    .run(linkId, userId);
  return Number(result.changes) > 0;
}
