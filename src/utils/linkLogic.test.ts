import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFolderCounts,
  filterAndSortLinks,
  normalizeAndValidateUrl,
  parseTagsInput,
  validateLinkInput,
  type FolderItem,
  type WorkLink,
} from './linkLogic';

test('normalizeAndValidateUrl normalizes schemeless domains and extracts domain', () => {
  const res = normalizeAndValidateUrl('www.figma.com/file/abc123');
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.url, 'https://www.figma.com/file/abc123');
    assert.equal(res.domain, 'figma.com');
  }
});

test('normalizeAndValidateUrl blocks javascript, data, and invalid URLs', () => {
  const jsRes = normalizeAndValidateUrl('javascript:alert(1)');
  assert.equal(jsRes.ok, false);

  const dataRes = normalizeAndValidateUrl('data:text/html,<script>alert(1)</script>');
  assert.equal(dataRes.ok, false);

  const emptyRes = normalizeAndValidateUrl('   ');
  assert.equal(emptyRes.ok, false);

  const invalidHost = normalizeAndValidateUrl('not-a-domain');
  assert.equal(invalidHost.ok, false);
});

test('validateLinkInput validates required title and URL while normalizing folder and tags', () => {
  const missing = validateLinkInput({ title: '', url: 'bad' });
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.ok(missing.fieldErrors.title);
    assert.ok(missing.fieldErrors.url);
  }

  const valid = validateLinkInput({
    title: '  Tài liệu API  ',
    url: 'docs.company.vn/api',
    folder: '',
    tags: 'backend, #api, API, auth',
    isPinned: true,
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.title, 'Tài liệu API');
    assert.equal(valid.data.url, 'https://docs.company.vn/api');
    assert.equal(valid.data.folder, 'Công việc chung');
    assert.deepEqual(valid.data.tags, ['backend', 'api', 'auth']);
    assert.equal(valid.data.isPinned, true);
  }
});

test('parseTagsInput deduplicates, strips hashes, and caps at 8 tags', () => {
  const tags = parseTagsInput('#design, Design, ui, ux, q1, q2, q3, q4, q5, q6');
  assert.equal(tags.length, 8);
  assert.deepEqual(tags, ['design', 'ui', 'ux', 'q1', 'q2', 'q3', 'q4', 'q5']);
});

const SAMPLE_LINKS: WorkLink[] = [
  {
    id: '1',
    userId: 'u1',
    title: 'Bảng Figma Q4',
    url: 'https://figma.com/file/q4',
    domain: 'figma.com',
    folder: 'Thiết kế',
    notes: 'File thiết kế trang chủ mới',
    tags: ['ui', 'q4'],
    isPinned: false,
    visitCount: 5,
    createdAt: '2026-11-20T09:00:00.000Z',
    updatedAt: '2026-11-20T09:00:00.000Z',
  },
  {
    id: '2',
    userId: 'u1',
    title: 'Bảng lương & KPI',
    url: 'https://docs.google.com/spreadsheets/d/1',
    domain: 'docs.google.com',
    folder: 'Tài liệu',
    notes: 'Theo dõi KPI tháng 11',
    tags: ['kpi'],
    isPinned: true,
    visitCount: 14,
    createdAt: '2026-11-21T09:00:00.000Z',
    updatedAt: '2026-11-21T09:00:00.000Z',
  },
  {
    id: '3',
    userId: 'u1',
    title: 'Linear Sprint Board',
    url: 'https://linear.app/team/sprint',
    domain: 'linear.app',
    folder: 'Dự án',
    notes: 'Theo dõi bug production',
    tags: ['sprint', 'dev'],
    isPinned: false,
    visitCount: 22,
    createdAt: '2026-11-22T09:00:00.000Z',
    updatedAt: '2026-11-22T09:00:00.000Z',
  },
];

test('filterAndSortLinks filters by view and search query and sorts correctly', () => {
  const pinnedOnly = filterAndSortLinks(SAMPLE_LINKS, {
    query: '',
    activeView: { type: 'pinned' },
    sortBy: 'newest',
  });
  assert.equal(pinnedOnly.length, 1);
  assert.equal(pinnedOnly[0].id, '2');

  const searchRes = filterAndSortLinks(SAMPLE_LINKS, {
    query: 'figma',
    activeView: { type: 'all' },
    sortBy: 'newest',
  });
  assert.equal(searchRes.length, 1);
  assert.equal(searchRes[0].id, '1');

  const pinnedFirst = filterAndSortLinks(SAMPLE_LINKS, {
    query: '',
    activeView: { type: 'all' },
    sortBy: 'pinned_first',
  });
  assert.equal(pinnedFirst[0].id, '2');

  const mostVisited = filterAndSortLinks(SAMPLE_LINKS, {
    query: '',
    activeView: { type: 'all' },
    sortBy: 'most_visited',
  });
  assert.equal(mostVisited[0].id, '3');
});

test('computeFolderCounts counts total, pinned, and per-folder totals', () => {
  const folders: FolderItem[] = [
    { id: 'f1', name: 'Thiết kế', createdAt: '2026-11-20T00:00:00.000Z' },
    { id: 'f2', name: 'Tài liệu', createdAt: '2026-11-20T00:00:00.000Z' },
    { id: 'f3', name: 'Công cụ', createdAt: '2026-11-20T00:00:00.000Z' },
  ];
  const counts = computeFolderCounts(SAMPLE_LINKS, folders);
  assert.equal(counts.total, 3);
  assert.equal(counts.pinned, 1);
  assert.equal(counts.byFolder['Thiết kế'], 1);
  assert.equal(counts.byFolder['Tài liệu'], 1);
  assert.equal(counts.byFolder['Công cụ'], 0);
  assert.equal(counts.byFolder['Dự án'], 1);
});
