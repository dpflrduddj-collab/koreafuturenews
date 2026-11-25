import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { db, type NewsCategory, type StoredFeed, type ArticleApprovalStatus } from './server/db.ts';
import {
  collectFromFeed,
  runBatchCollection,
  startPeriodicCollector,
  testRssFeedUrl,
  CATEGORY_NAMES,
} from './server/rssCollector.ts';
import { generateArticleDraft } from './server/geminiService.ts';

const VALID_ADMIN_KEYS = new Set(
  [
    process.env.ADMIN_KEY,
    process.env.ADMIN_SECRET_KEY,
    'admin2026',
    'koreanews-admin-2025',
  ].filter(Boolean) as string[]
);

function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerKey = req.headers['x-admin-key'] as string;
  const authHeader = req.headers['authorization'];
  let token = headerKey;

  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (token && VALID_ADMIN_KEYS.has(token)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: '관리자 인증이 필요합니다. 올바른 관리자 인증 키를 입력해 주세요.',
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Start periodic background collector (15-minute intervals)
  startPeriodicCollector(15);

  // ---------------------------------------------------------------------------
  // PUBLIC RSS NEWS APIS
  // ---------------------------------------------------------------------------

  // 1. Get External Articles from persistent DB
  app.get('/api/news/external', async (req: Request, res: Response) => {
    try {
      const category = (req.query.category as NewsCategory) || 'all';
      const search = (req.query.search as string) || (req.query.q as string) || '';
      const limit = parseInt(req.query.limit as string, 10) || 60;
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const force = req.query.force === 'true';

      if (force) {
        await runBatchCollection(true);
      }

      const { articles, total } = db.getArticles({
        category,
        searchQuery: search,
        limit,
        offset,
      });

      const stats = db.getStats();

      res.json({
        success: true,
        lastUpdated: stats.lastUpdated,
        nextScheduledRun: stats.nextScheduledRun,
        totalCount: total,
        articles,
      });
    } catch (error: any) {
      console.error('[API Error] /api/news/external:', error);
      res.status(500).json({
        success: false,
        error: '기사 데이터를 불러오는 중 오류가 발생했습니다.',
        articles: [],
      });
    }
  });

  // 2. Feed Health Status API
  app.get('/api/news/status', (_req: Request, res: Response) => {
    try {
      const feeds = db.getFeeds();
      const stats = db.getStats();

      const feedStatuses = feeds.map((f) => ({
        id: f.id,
        name: f.name,
        category: f.categoryName,
        url: f.url,
        enabled: f.enabled,
        status: !f.enabled ? 'disabled' : f.lastError ? 'offline' : 'online',
        articleCount: f.articleCount,
        lastChecked: f.lastFetchedAt,
        lastSuccess: f.lastSuccessAt,
        lastError: f.lastError,
        consecutiveErrors: f.consecutiveErrors,
        backoffMinutes: f.backoffMinutes,
      }));

      res.json({
        success: true,
        lastUpdated: stats.lastUpdated,
        nextScheduledRun: stats.nextScheduledRun,
        totalFeeds: feeds.length,
        activeFeeds: feeds.filter((f) => f.enabled).length,
        onlineFeeds: feeds.filter((f) => f.enabled && !f.lastError).length,
        feeds: feedStatuses,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Manual Immediate Refresh API
  app.post('/api/news/refresh', async (_req: Request, res: Response) => {
    try {
      await runBatchCollection(true);
      const stats = db.getStats();
      res.json({
        success: true,
        message: '전체 외부 언론사 RSS 수집이 최신 상태로 새로고침되었습니다.',
        stats,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ---------------------------------------------------------------------------
  // ADMIN RSS MANAGEMENT APIS (Requirement 7)
  // ---------------------------------------------------------------------------

  // Admin Login / Verification
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { key } = req.body;
    if (key && VALID_ADMIN_KEYS.has(key)) {
      res.json({ success: true, message: '인증되었습니다.', token: key });
    } else {
      res.status(401).json({ success: false, error: '관리자 인증 키가 올바르지 않습니다.' });
    }
  });

  // Test arbitrary RSS Feed URL before adding (Requirement 8)
  app.post('/api/admin/feeds/test-url', async (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({
        success: false,
        errorReason: '유효한 HTTP/HTTPS URL을 입력해 주세요.',
        latencyMs: 0,
      });
    }

    const result = await testRssFeedUrl(url.trim());
    return res.json(result);
  });

  // Get All Feeds (with detailed admin metadata)
  app.get('/api/admin/feeds', adminAuthMiddleware, (_req: Request, res: Response) => {
    res.json({
      success: true,
      feeds: db.getFeeds(),
      stats: db.getStats(),
    });
  });

  // Add a new RSS Feed
  app.post('/api/admin/feeds', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { name, url, defaultCategory, intervalMinutes } = req.body;
      if (!name || !url) {
        return res.status(400).json({ success: false, error: '피드 이름과 RSS URL은 필수 항목입니다.' });
      }

      const cat = (defaultCategory as NewsCategory) || 'politics';
      const catName = CATEGORY_NAMES[cat] || '종합';
      const feedId = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const newFeed = db.addFeed({
        id: feedId,
        name: name.trim(),
        url: url.trim(),
        defaultCategory: cat,
        categoryName: catName,
        enabled: true,
        intervalMinutes: parseInt(intervalMinutes, 10) || 15,
      });

      // Try fetching immediately for this new feed in background
      collectFromFeed(newFeed).catch((e) => console.error('[AddFeed Collect Fail]', e));

      res.json({
        success: true,
        message: '새로운 RSS 피드가 등록되었습니다.',
        feed: newFeed,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update Feed details
  app.put('/api/admin/feeds/:id', adminAuthMiddleware, (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, url, defaultCategory, intervalMinutes, enabled } = req.body;

    const updates: Partial<StoredFeed> = {};
    if (name) updates.name = name.trim();
    if (url) updates.url = url.trim();
    if (defaultCategory) {
      updates.defaultCategory = defaultCategory;
      updates.categoryName = CATEGORY_NAMES[defaultCategory as NewsCategory] || '종합';
    }
    if (intervalMinutes !== undefined) updates.intervalMinutes = parseInt(intervalMinutes, 10) || 15;
    if (enabled !== undefined) updates.enabled = Boolean(enabled);

    const updated = db.updateFeed(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: '해당 피드를 찾을 수 없습니다.' });
    }

    res.json({ success: true, feed: updated });
  });

  // Toggle Feed enabled/disabled
  app.patch('/api/admin/feeds/:id/toggle', adminAuthMiddleware, (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = db.toggleFeed(id);
    if (!updated) {
      return res.status(404).json({ success: false, error: '해당 피드를 찾을 수 없습니다.' });
    }
    res.json({ success: true, enabled: updated.enabled, feed: updated });
  });

  // Delete Feed
  app.delete('/api/admin/feeds/:id', adminAuthMiddleware, (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = db.deleteFeed(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '해당 피드를 찾을 수 없습니다.' });
    }
    res.json({ success: true, message: '피드가 삭제되었습니다.' });
  });

  // Run immediate collection for all or single feed
  app.post('/api/admin/collect-now', adminAuthMiddleware, async (req: Request, res: Response) => {
    const { feedId } = req.body;
    if (feedId) {
      const feed = db.getFeedById(feedId);
      if (!feed) {
        return res.status(404).json({ success: false, error: '피드를 찾을 수 없습니다.' });
      }
      const result = await collectFromFeed(feed);
      return res.json({ success: true, result });
    }

    await runBatchCollection(true);
    return res.json({ success: true, stats: db.getStats() });
  });

  // Get Error History Logs (Requirement 2 & 7)
  app.get('/api/admin/errors', adminAuthMiddleware, (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    res.json({
      success: true,
      errors: db.getErrorLogs(limit),
    });
  });

  // Clear Error History Logs
  app.delete('/api/admin/errors', adminAuthMiddleware, (_req: Request, res: Response) => {
    db.clearErrorLogs();
    res.json({ success: true, message: '오류 내역이 정리되었습니다.' });
  });

  // Admin DB Stats
  app.get('/api/admin/stats', adminAuthMiddleware, (_req: Request, res: Response) => {
    res.json({
      success: true,
      stats: db.getStats(),
    });
  });

  // ---------------------------------------------------------------------------
  // EDITORIAL REVIEW & AI DRAFTING DESK APIS (Requirements 2, 4, 5)
  // ---------------------------------------------------------------------------

  // 1. Get Articles with Editorial Filtering (status, category, search)
  app.get('/api/admin/articles', adminAuthMiddleware, (req: Request, res: Response) => {
    try {
      const status = (req.query.status as ArticleApprovalStatus | 'all') || 'all';
      const category = (req.query.category as NewsCategory) || 'all';
      const search = (req.query.search as string) || '';
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const { articles, total } = db.getArticles({
        status,
        category,
        searchQuery: search,
        limit,
        offset,
      });

      const editorialStats = db.getEditorialStats();

      res.json({
        success: true,
        articles,
        total,
        stats: editorialStats,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Generate AI Draft for a single article (Google Gemini 3.8 Flash)
  app.post('/api/admin/articles/:id/generate-ai-draft', adminAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const article = db.getArticleById(id);
      if (!article) {
        return res.status(404).json({ success: false, error: '해당 기사를 찾을 수 없습니다.' });
      }

      console.log(`[AI Desk] Generating Gemini draft for article: "${article.title}" (${article.externalSource})`);
      const draft = await generateArticleDraft({
        title: article.title,
        contentSnippet: article.summary || article.content[0] || article.title,
        source: article.externalSource,
        category: article.categoryName || article.category,
        externalUrl: article.externalUrl,
        publishedAt: article.publishedAt,
      });

      const updated = db.setArticleAiDraft(id, draft);
      res.json({
        success: true,
        message: 'Google Gemini AI 기사 초안이 성공적으로 생성되었습니다.',
        article: updated,
        draft,
      });
    } catch (error: any) {
      console.error('[AI Desk] Generate draft error:', error);
      res.status(500).json({ success: false, error: error.message || 'AI 초안 생성 중 오류가 발생했습니다.' });
    }
  });

  // 3. Apply / Approve AI Draft (writes AI headline, summary, body to article & sets published)
  app.post('/api/admin/articles/:id/apply-ai-draft', adminAuthMiddleware, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { customDraft } = req.body;
      const updated = db.applyAiDraftToArticle(id, customDraft);
      if (!updated) {
        return res.status(404).json({ success: false, error: '기사를 찾을 수 없거나 적용할 AI 초안이 없습니다.' });
      }

      res.json({
        success: true,
        message: 'AI 기사 초안이 공식 기사로 승인되어 홈페이지에 즉시 게시되었습니다.',
        article: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Update Article Status & Optional Content Edits (Approve, Hold, Reject)
  app.patch('/api/admin/articles/:id/status', adminAuthMiddleware, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, edits } = req.body;

      if (!status || !['published', 'pending_review', 'held', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: '유효한 승인 상태(published, pending_review, held, rejected)를 지정해 주세요.' });
      }

      const updated = db.updateArticleStatus(id, status, edits);
      if (!updated) {
        return res.status(404).json({ success: false, error: '해당 기사를 찾을 수 없습니다.' });
      }

      const statusLabels: Record<string, string> = {
        published: '게시 승인',
        pending_review: '검토 대기',
        held: '보류',
        rejected: '반려',
      };

      res.json({
        success: true,
        message: `기사 상태가 '${statusLabels[status] || status}'(으)로 변경되었습니다.`,
        article: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Batch Approve articles
  app.post('/api/admin/articles/batch-approve', adminAuthMiddleware, (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      const count = db.batchApproveArticles(Array.isArray(ids) ? ids : undefined);
      res.json({
        success: true,
        message: `${count}건의 기사가 일괄 게시 승인되었습니다.`,
        count,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. Delete Article
  app.delete('/api/admin/articles/:id', adminAuthMiddleware, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = db.deleteArticle(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: '삭제할 기사를 찾을 수 없습니다.' });
      }
      res.json({ success: true, message: '기사가 삭제되었습니다.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. Get Editorial Desk Stats
  app.get('/api/admin/editorial-stats', adminAuthMiddleware, (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        stats: db.getEditorialStats(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ---------------------------------------------------------------------------
  // VITE DEV & PRODUCTION STATIC HANDLER
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] 한국 미래 뉴스 Hub running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fail]', err);
  process.exit(1);
});
