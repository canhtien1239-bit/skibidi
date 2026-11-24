import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  clearSessionCookie,
  createSessionToken,
  extractSessionToken,
  hashPassword,
  hashSessionToken,
  isTrustedMutationRequest,
  setSessionCookie,
  verifyPassword,
} from './server/auth.ts';
import {
  createLinkForUser,
  createUserAccount,
  deleteFolderForUser,
  deleteLinkForUser,
  deleteSessionByTokenHash,
  ensureFolderForUser,
  findUserByEmail,
  getDb,
  getLinkForUser,
  getUserBySessionTokenHash,
  insertSession,
  listFoldersForUser,
  listLinksForUser,
  updateLinkForUser,
  type UserRecord,
} from './server/db.ts';
import { validateLinkInput } from './src/utils/linkLogic.ts';

interface AuthenticatedRequest extends Request {
  user?: UserRecord;
  sessionTokenHash?: string;
}

const PORT = Number(process.env.PORT) || 3000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function createApp() {
  // Initialize SQLite database & seed demo accounts once
  getDb();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  // CSRF / Origin protection for mutating API routes
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (
      req.method === 'POST' ||
      req.method === 'PUT' ||
      req.method === 'PATCH' ||
      req.method === 'DELETE'
    ) {
      if (!isTrustedMutationRequest(req)) {
        res.status(403).json({
          error: 'Yêu cầu không hợp lệ hoặc thiếu xác thực nguồn gốc.',
        });
        return;
      }
    }
    next();
  });

  function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    const rawToken = extractSessionToken(req);
    if (!rawToken) {
      res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
      return;
    }
    const tokenHash = hashSessionToken(rawToken);
    const user = getUserBySessionTokenHash(tokenHash);
    if (!user) {
      clearSessionCookie(res);
      res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn.' });
      return;
    }
    req.user = user;
    req.sessionTokenHash = tokenHash;
    next();
  }

  // Auth routes
  app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
    const rawToken = extractSessionToken(req);
    if (!rawToken) {
      res.json({ user: null });
      return;
    }
    const tokenHash = hashSessionToken(rawToken);
    const user = getUserBySessionTokenHash(tokenHash);
    if (!user) {
      clearSessionCookie(res);
      res.json({ user: null });
      return;
    }
    res.json({ user });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { displayName, email, password } = req.body ?? {};
    const cleanName = typeof displayName === 'string' ? displayName.trim() : '';
    const cleanEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (cleanName.length < 2 || cleanName.length > 60) {
      res.status(400).json({
        error: 'Tên hiển thị phải từ 2 đến 60 ký tự.',
      });
      return;
    }
    if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 120) {
      res.status(400).json({
        error: 'Địa chỉ email không hợp lệ.',
      });
      return;
    }
    if (rawPassword.length < 6 || rawPassword.length > 128) {
      res.status(400).json({
        error: 'Mật khẩu phải có ít nhất 6 ký tự.',
      });
      return;
    }

    const existing = findUserByEmail(cleanEmail);
    if (existing) {
      res.status(409).json({
        error: 'Email này đã được đăng ký. Vui lòng đăng nhập.',
      });
      return;
    }

    const { salt, hash } = hashPassword(rawPassword);
    const user = createUserAccount({
      email: cleanEmail,
      displayName: cleanName,
      passwordHash: hash,
      passwordSalt: salt,
    });

    const session = createSessionToken();
    insertSession(user.id, session.tokenHash, session.expiresAt);
    setSessionCookie(res, session.rawToken);

    res.status(201).json({ user });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    const cleanEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!EMAIL_RE.test(cleanEmail) || !rawPassword) {
      res.status(400).json({
        error: 'Vui lòng nhập đầy đủ email và mật khẩu.',
      });
      return;
    }

    const found = findUserByEmail(cleanEmail);
    if (
      !found ||
      !verifyPassword(rawPassword, found.passwordSalt, found.passwordHash)
    ) {
      res.status(401).json({
        error: 'Email hoặc mật khẩu không chính xác.',
      });
      return;
    }

    const session = createSessionToken();
    insertSession(found.id, session.tokenHash, session.expiresAt);
    setSessionCookie(res, session.rawToken);

    res.json({
      user: {
        id: found.id,
        email: found.email,
        displayName: found.displayName,
        createdAt: found.createdAt,
      },
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const rawToken = extractSessionToken(req);
    if (rawToken) {
      deleteSessionByTokenHash(hashSessionToken(rawToken));
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // Protected Workspace routes (strictly scoped to req.user.id)
  app.get(
    '/api/workspace',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const folders = listFoldersForUser(userId);
      const links = listLinksForUser(userId);
      res.json({ folders, links });
    }
  );

  app.post(
    '/api/links',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const validation = validateLinkInput(req.body ?? {});
      if (!validation.ok) {
        const firstError =
          Object.values(validation.fieldErrors)[0] ??
          'Dữ liệu liên kết không hợp lệ.';
        res.status(400).json({
          error: firstError,
          fieldErrors: validation.fieldErrors,
        });
        return;
      }

      const link = createLinkForUser(userId, validation.data);
      const folders = listFoldersForUser(userId);
      res.status(201).json({ link, folders });
    }
  );

  app.patch(
    '/api/links/:id',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const linkId = String(req.params.id ?? '');
      const existing = getLinkForUser(userId, linkId);
      if (!existing) {
        res.status(404).json({ error: 'Không tìm thấy liên kết này.' });
        return;
      }

      const body = req.body ?? {};
      if (body.incrementVisit === true && Object.keys(body).length === 1) {
        const updated = updateLinkForUser(userId, linkId, {
          incrementVisit: true,
        });
        res.json({ link: updated });
        return;
      }

      if (
        typeof body.isPinned === 'boolean' &&
        Object.keys(body).length === 1
      ) {
        const updated = updateLinkForUser(userId, linkId, {
          isPinned: body.isPinned,
        });
        res.json({ link: updated });
        return;
      }

      const validation = validateLinkInput({
        title: body.title ?? existing.title,
        url: body.url ?? existing.url,
        folder: body.folder ?? existing.folder,
        notes: body.notes ?? existing.notes,
        tags: body.tags ?? existing.tags,
        isPinned:
          body.isPinned !== undefined ? body.isPinned : existing.isPinned,
      });

      if (!validation.ok) {
        const firstError =
          Object.values(validation.fieldErrors)[0] ??
          'Dữ liệu cập nhật không hợp lệ.';
        res.status(400).json({
          error: firstError,
          fieldErrors: validation.fieldErrors,
        });
        return;
      }

      const updated = updateLinkForUser(userId, linkId, validation.data);
      const folders = listFoldersForUser(userId);
      res.json({ link: updated, folders });
    }
  );

  app.delete(
    '/api/links/:id',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const linkId = String(req.params.id ?? '');
      const deleted = deleteLinkForUser(userId, linkId);
      if (!deleted) {
        res.status(404).json({ error: 'Không tìm thấy liên kết để xóa.' });
        return;
      }
      res.json({ ok: true });
    }
  );

  app.post(
    '/api/folders',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (!rawName || rawName.length > 48) {
        res.status(400).json({
          error: 'Tên thư mục phải từ 1 đến 48 ký tự.',
        });
        return;
      }
      const folder = ensureFolderForUser(userId, rawName);
      const folders = listFoldersForUser(userId);
      res.status(201).json({ folder, folders });
    }
  );

  app.delete(
    '/api/folders/:id',
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const folderId = String(req.params.id ?? '');
      const result = deleteFolderForUser(userId, folderId);
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      const folders = listFoldersForUser(userId);
      const links = listLinksForUser(userId);
      res.json({ folders, links });
    }
  );

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*splat', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*splat', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        const template = fs.readFileSync(indexPath, 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        next(err);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

createApp();
