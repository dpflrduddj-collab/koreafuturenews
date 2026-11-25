import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type NewsCategory =
  | 'all'
  | 'breaking'
  | 'politics'
  | 'economy'
  | 'society'
  | 'world'
  | 'northkorea'
  | 'defense'
  | 'industry'
  | 'kpop'
  | 'culture'
  | 'tech'
  | 'sports'
  | 'opinion';

export type ArticleApprovalStatus = 'published' | 'pending_review' | 'held' | 'rejected';

export interface StoredArticle {
  id: string;
  guid: string;
  title: string;
  subtitle?: string;
  summary: string;
  content: string[];
  category: NewsCategory;
  categoryName: string;
  reporter: {
    name: string;
    dept: string;
    email?: string;
    photo?: string;
  };
  publishedAt: string;
  timeAgo: string;
  imageUrl: string;
  imageCaption?: string;
  isBreaking?: boolean;
  isTopStory?: boolean;
  isExclusive?: boolean;
  isEditorial?: boolean;
  isExternal: true;
  externalSource: string;
  externalUrl: string;
  isOwnPress: false;
  viewCount: number;
  commentCount: number;
  likes: number;
  tags: string[];
  collectedAt: string;
  approvalStatus: ArticleApprovalStatus;
  isAiGenerated?: boolean;
  aiDraft?: {
    headline: string;
    summaryBullets: string[];
    bodyParagraphs: string[];
    suggestedCategory?: string;
    generatedAt: string;
    isAiGenerated: true;
    disclaimer: string;
  };
}

export interface StoredFeed {
  id: string;
  name: string;
  url: string;
  defaultCategory: NewsCategory;
  categoryName: string;
  enabled: boolean;
  intervalMinutes: number; // default 15
  lastFetchedAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  consecutiveErrors: number;
  backoffMinutes: number; // dynamically increases on failure
  articleCount: number;
}

export interface StoredErrorLog {
  id: string;
  timestamp: string;
  feedId: string;
  feedName: string;
  url: string;
  message: string;
  httpStatus?: number;
}

export interface DatabaseSchema {
  version: number;
  settings: {
    defaultIntervalMinutes: number;
    lastCollectorRunAt: string;
    nextCollectorRunAt: string;
  };
  feeds: StoredFeed[];
  articles: StoredArticle[];
  errorLogs: StoredErrorLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'rss_news_database.json');

// Default initial RSS feeds from verified domestic & international news sources
export const INITIAL_FEEDS: StoredFeed[] = [
  // SBS 뉴스
  {
    id: 'sbs-politics',
    name: 'SBS 뉴스 (정치)',
    url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01&plink=RSSREADER',
    defaultCategory: 'politics',
    categoryName: '정치',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'sbs-economy',
    name: 'SBS 뉴스 (경제)',
    url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=02&plink=RSSREADER',
    defaultCategory: 'economy',
    categoryName: '경제',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'sbs-society',
    name: 'SBS 뉴스 (사회)',
    url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=03&plink=RSSREADER',
    defaultCategory: 'society',
    categoryName: '사회',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'sbs-world',
    name: 'SBS 뉴스 (국제)',
    url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=07&plink=RSSREADER',
    defaultCategory: 'world',
    categoryName: '국제',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'sbs-culture',
    name: 'SBS 뉴스 (문화)',
    url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=08&plink=RSSREADER',
    defaultCategory: 'culture',
    categoryName: '문화',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'sbs-sports',
    name: 'SBS 뉴스 (스포츠)',
    url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=09&plink=RSSREADER',
    defaultCategory: 'sports',
    categoryName: '스포츠',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'sbs-entertainment',
    name: 'SBS 뉴스 (연예)',
    url: 'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=14&plink=RSSREADER',
    defaultCategory: 'kpop',
    categoryName: '연예·K-POP',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  // 한겨레
  {
    id: 'hani-politics',
    name: '한겨레 (정치)',
    url: 'https://www.hani.co.kr/rss/politics/',
    defaultCategory: 'politics',
    categoryName: '정치',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'hani-economy',
    name: '한겨레 (경제/산업)',
    url: 'https://www.hani.co.kr/rss/economy/',
    defaultCategory: 'economy',
    categoryName: '경제',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'hani-society',
    name: '한겨레 (사회)',
    url: 'https://www.hani.co.kr/rss/society/',
    defaultCategory: 'society',
    categoryName: '사회',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'hani-international',
    name: '한겨레 (국제)',
    url: 'https://www.hani.co.kr/rss/international/',
    defaultCategory: 'world',
    categoryName: '국제',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'hani-culture',
    name: '한겨레 (문화)',
    url: 'https://www.hani.co.kr/rss/culture/',
    defaultCategory: 'culture',
    categoryName: '문화',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'hani-science',
    name: '한겨레 (미래&과학·IT)',
    url: 'https://www.hani.co.kr/rss/science/',
    defaultCategory: 'tech',
    categoryName: '과학·IT',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'hani-sports',
    name: '한겨레 (스포츠)',
    url: 'https://www.hani.co.kr/rss/sports/',
    defaultCategory: 'sports',
    categoryName: '스포츠',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  // 동아일보
  {
    id: 'donga-total',
    name: '동아일보 (종합)',
    url: 'https://rss.donga.com/total.xml',
    defaultCategory: 'all',
    categoryName: '종합',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'donga-politics',
    name: '동아일보 (정치)',
    url: 'https://rss.donga.com/politics.xml',
    defaultCategory: 'politics',
    categoryName: '정치',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'donga-economy',
    name: '동아일보 (경제)',
    url: 'https://rss.donga.com/economy.xml',
    defaultCategory: 'economy',
    categoryName: '경제',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'donga-national',
    name: '동아일보 (사회)',
    url: 'https://rss.donga.com/national.xml',
    defaultCategory: 'society',
    categoryName: '사회',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  // 한국경제
  {
    id: 'hankyung-all',
    name: '한국경제 (종합·경제)',
    url: 'https://www.hankyung.com/feed/all-news',
    defaultCategory: 'economy',
    categoryName: '경제',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  // 해외/글로벌 및 북한/한반도 전문
  {
    id: 'bbc-korea',
    name: 'BBC 코리아 (국제·심층)',
    url: 'https://feeds.bbci.co.uk/korean/rss.xml',
    defaultCategory: 'world',
    categoryName: '국제',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'chosun-top',
    name: '조선일보 (주요뉴스)',
    url: 'https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml',
    defaultCategory: 'politics',
    categoryName: '정치',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
  {
    id: 'mk-economy',
    name: '매일경제 (종합·경제)',
    url: 'https://www.mk.co.kr/rss/30000001/',
    defaultCategory: 'economy',
    categoryName: '경제',
    enabled: true,
    intervalMinutes: 15,
    consecutiveErrors: 0,
    backoffMinutes: 15,
    articleCount: 0,
  },
];

class RssDatabase {
  private data: DatabaseSchema;
  private knownUrls: Set<string> = new Set();
  private knownGuids: Set<string> = new Set();
  private knownTitleDateHashes: Set<string> = new Set();
  private isSaving = false;

  constructor() {
    this.data = this.loadDatabase();
    this.rebuildIndex();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.feeds) && Array.isArray(parsed.articles)) {
          const seenIds = new Set<string>();
          const sanitizedArticles: StoredArticle[] = [];
          for (const art of parsed.articles) {
            let id = art.id;
            if (!id || id.includes('aHR0cHM6') || seenIds.has(id)) {
              const hash = crypto
                .createHash('sha256')
                .update(`${art.externalUrl || art.guid || art.title}:${art.publishedAt || ''}:${sanitizedArticles.length}`)
                .digest('hex')
                .slice(0, 16);
              id = `rss-${art.category || 'news'}-${hash}`;
            }
            seenIds.add(id);
            sanitizedArticles.push({
              ...art,
              id,
              approvalStatus: (art.approvalStatus as ArticleApprovalStatus) || 'published',
            });
          }

          // Merge any newly introduced default feeds that aren't in persistent DB yet
          const existingFeedIds = new Set(parsed.feeds.map((f: StoredFeed) => f.id));
          const mergedFeeds = [...parsed.feeds];
          for (const initFeed of INITIAL_FEEDS) {
            if (!existingFeedIds.has(initFeed.id)) {
              mergedFeeds.push(initFeed);
            }
          }

          console.log(`[DB] Loaded ${sanitizedArticles.length} articles and ${mergedFeeds.length} feeds from persistent storage.`);
          return {
            version: 1,
            settings: parsed.settings || {
              defaultIntervalMinutes: 15,
              lastCollectorRunAt: new Date().toISOString(),
              nextCollectorRunAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            },
            feeds: mergedFeeds,
            articles: sanitizedArticles,
            errorLogs: Array.isArray(parsed.errorLogs) ? parsed.errorLogs.slice(-200) : [],
          };
        }
      }
    } catch (err) {
      console.error('[DB] Failed to load existing database, initializing fresh:', err);
    }

    // Default initialization
    const initial: DatabaseSchema = {
      version: 1,
      settings: {
        defaultIntervalMinutes: 15,
        lastCollectorRunAt: new Date().toISOString(),
        nextCollectorRunAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      feeds: INITIAL_FEEDS,
      articles: [],
      errorLogs: [],
    };
    this.persistSync(initial);
    return initial;
  }

  private rebuildIndex() {
    this.knownUrls.clear();
    this.knownGuids.clear();
    this.knownTitleDateHashes.clear();

    for (const art of this.data.articles) {
      if (art.externalUrl) this.knownUrls.add(this.normalizeUrl(art.externalUrl));
      if (art.guid) this.knownGuids.add(art.guid);
      const hash = this.createTitleDateHash(art.title, art.publishedAt);
      this.knownTitleDateHashes.add(hash);
    }
  }

  public normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      // Remove only tracking / marketing parameters, preserving critical article IDs (news_id, idxno, aid, oid, articleId, etc.)
      const trackingParams = new Set([
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'plink',
        'cooper',
        'ref',
        'fbclid',
        'gclid',
        '_ga',
        'src',
        'dable',
      ]);
      const params = new URLSearchParams(u.search);
      for (const key of Array.from(params.keys())) {
        if (trackingParams.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
          params.delete(key);
        }
      }
      params.sort();
      const sortedQuery = params.toString() ? `?${params.toString()}` : '';
      return `${u.origin}${u.pathname}${sortedQuery}`.toLowerCase();
    } catch {
      return url.split('#')[0].trim().toLowerCase();
    }
  }

  private createTitleDateHash(title: string, dateStr: string): string {
    const cleanTitle = title.replace(/\s+/g, '').slice(0, 40).toLowerCase();
    const cleanDate = dateStr.slice(0, 10);
    return `${cleanTitle}|${cleanDate}`;
  }

  private persistSync(dataToSave: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Error persisting database to disk:', err);
    }
  }

  public save() {
    if (this.isSaving) return;
    this.isSaving = true;
    setTimeout(() => {
      this.persistSync(this.data);
      this.isSaving = false;
    }, 100);
  }

  // Deduplication check: GUID, URL, or Title+Date
  public isDuplicate(item: { guid?: string; externalUrl: string; title: string; publishedAt: string }): boolean {
    if (item.guid && this.knownGuids.has(item.guid)) return true;
    if (item.externalUrl && this.knownUrls.has(this.normalizeUrl(item.externalUrl))) return true;
    const hash = this.createTitleDateHash(item.title, item.publishedAt);
    if (this.knownTitleDateHashes.has(hash)) return true;
    return false;
  }

  // Add new articles (batch, deduplicated)
  public addArticles(newArticles: StoredArticle[]): number {
    const toInsert: StoredArticle[] = [];

    for (const art of newArticles) {
      if (!this.isDuplicate({
        guid: art.guid,
        externalUrl: art.externalUrl,
        title: art.title,
        publishedAt: art.publishedAt,
      })) {
        toInsert.push(art);
        if (art.externalUrl) this.knownUrls.add(this.normalizeUrl(art.externalUrl));
        if (art.guid) this.knownGuids.add(art.guid);
        const hash = this.createTitleDateHash(art.title, art.publishedAt);
        this.knownTitleDateHashes.add(hash);
      }
    }

    if (toInsert.length > 0) {
      // Prepend newest
      this.data.articles = [...toInsert, ...this.data.articles];
      // Keep up to 1000 most recent articles to maintain high performance
      if (this.data.articles.length > 1000) {
        this.data.articles = this.data.articles.slice(0, 1000);
      }
      this.save();
    }

    return toInsert.length;
  }

  // Get articles by query (with approval status support)
  public getArticles(options: {
    category?: NewsCategory;
    isBreaking?: boolean;
    searchQuery?: string;
    limit?: number;
    offset?: number;
    status?: ArticleApprovalStatus | 'all';
  }): { articles: StoredArticle[]; total: number } {
    let list = this.data.articles;

    // Filter by approval status:
    // If status is 'all', do not filter by status.
    // If status is specific ('published', 'pending_review', 'held', 'rejected'), match exactly.
    // If status is not provided, default to public view: published articles (or legacy articles without status).
    if (options.status) {
      if (options.status !== 'all') {
        list = list.filter((a) => a.approvalStatus === options.status);
      }
    } else {
      list = list.filter((a) => a.approvalStatus === 'published' || !a.approvalStatus);
    }

    if (options.category && options.category !== 'all') {
      if (options.category === 'breaking') {
        list = list.filter((a) => a.isBreaking);
      } else {
        list = list.filter((a) => a.category === options.category);
      }
    }

    if (options.isBreaking) {
      list = list.filter((a) => a.isBreaking);
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.externalSource.toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const offset = options.offset || 0;
    const limit = options.limit || 60;
    const paginated = list.slice(offset, offset + limit);

    return { articles: paginated, total };
  }

  // ---------------------------------------------------------------------------
  // EDITORIAL DESK & ARTICLE MANAGEMENT
  // ---------------------------------------------------------------------------
  public getArticleById(id: string): StoredArticle | undefined {
    return this.data.articles.find((a) => a.id === id);
  }

  public updateArticleStatus(
    id: string,
    status: ArticleApprovalStatus,
    edits?: {
      title?: string;
      subtitle?: string;
      summary?: string;
      content?: string[];
      category?: NewsCategory;
      categoryName?: string;
    }
  ): StoredArticle | null {
    const art = this.getArticleById(id);
    if (!art) return null;

    art.approvalStatus = status;
    if (edits) {
      if (edits.title) art.title = edits.title.trim();
      if (edits.subtitle !== undefined) art.subtitle = edits.subtitle.trim();
      if (edits.summary) art.summary = edits.summary.trim();
      if (edits.content && edits.content.length > 0) art.content = edits.content;
      if (edits.category) art.category = edits.category;
      if (edits.categoryName) art.categoryName = edits.categoryName;
    }
    this.save();
    return art;
  }

  public setArticleAiDraft(
    id: string,
    draft: {
      headline: string;
      summaryBullets: string[];
      bodyParagraphs: string[];
      suggestedCategory?: string;
      generatedAt: string;
      isAiGenerated: true;
      disclaimer: string;
    }
  ): StoredArticle | null {
    const art = this.getArticleById(id);
    if (!art) return null;

    art.aiDraft = draft;
    this.save();
    return art;
  }

  public applyAiDraftToArticle(
    id: string,
    providedDraft?: {
      headline: string;
      summaryBullets: string[];
      bodyParagraphs: string[];
      suggestedCategory?: string;
      generatedAt: string;
      isAiGenerated: true;
      disclaimer: string;
    }
  ): StoredArticle | null {
    const art = this.getArticleById(id);
    if (!art) return null;

    const draft = providedDraft || art.aiDraft;
    if (!draft) return null;

    art.title = draft.headline;
    art.summary = draft.summaryBullets.join(' ');
    art.content = draft.bodyParagraphs;
    art.isAiGenerated = true;
    art.approvalStatus = 'published';
    art.aiDraft = draft;
    this.save();
    return art;
  }

  public deleteArticle(id: string): boolean {
    const initLen = this.data.articles.length;
    this.data.articles = this.data.articles.filter((a) => a.id !== id);
    if (this.data.articles.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }

  public batchApproveArticles(ids?: string[]): number {
    let count = 0;
    if (ids && ids.length > 0) {
      const set = new Set(ids);
      for (const a of this.data.articles) {
        if (set.has(a.id) && a.approvalStatus !== 'published') {
          a.approvalStatus = 'published';
          count++;
        }
      }
    } else {
      // Approve all pending
      for (const a of this.data.articles) {
        if (a.approvalStatus === 'pending_review' || a.approvalStatus === 'held') {
          a.approvalStatus = 'published';
          count++;
        }
      }
    }
    if (count > 0) this.save();
    return count;
  }

  public getEditorialStats() {
    let pendingCount = 0;
    let publishedCount = 0;
    let heldCount = 0;
    let rejectedCount = 0;
    let aiDraftCount = 0;

    for (const a of this.data.articles) {
      if (a.approvalStatus === 'pending_review') pendingCount++;
      else if (a.approvalStatus === 'held') heldCount++;
      else if (a.approvalStatus === 'rejected') rejectedCount++;
      else publishedCount++;

      if (a.aiDraft || a.isAiGenerated) aiDraftCount++;
    }

    return {
      total: this.data.articles.length,
      pendingCount,
      publishedCount,
      heldCount,
      rejectedCount,
      aiDraftCount,
    };
  }

  // Feed Management
  public getFeeds(): StoredFeed[] {
    return this.data.feeds;
  }

  public getFeedById(id: string): StoredFeed | undefined {
    return this.data.feeds.find((f) => f.id === id);
  }

  public addFeed(feed: Omit<StoredFeed, 'consecutiveErrors' | 'backoffMinutes' | 'articleCount'>): StoredFeed {
    const fullFeed: StoredFeed = {
      ...feed,
      consecutiveErrors: 0,
      backoffMinutes: feed.intervalMinutes || 15,
      articleCount: 0,
    };
    this.data.feeds.push(fullFeed);
    this.save();
    return fullFeed;
  }

  public updateFeed(id: string, updates: Partial<StoredFeed>): StoredFeed | null {
    const idx = this.data.feeds.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.data.feeds[idx] = { ...this.data.feeds[idx], ...updates };
    this.save();
    return this.data.feeds[idx];
  }

  public toggleFeed(id: string, enabled?: boolean): StoredFeed | null {
    const feed = this.getFeedById(id);
    if (!feed) return null;
    const nextEnabled = enabled !== undefined ? enabled : !feed.enabled;
    return this.updateFeed(id, { enabled: nextEnabled });
  }

  public deleteFeed(id: string): boolean {
    const initialLen = this.data.feeds.length;
    this.data.feeds = this.data.feeds.filter((f) => f.id !== id);
    if (this.data.feeds.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Feed Status Updates after collection
  public recordFeedSuccess(feedId: string, newlyAddedCount: number) {
    const feed = this.getFeedById(feedId);
    if (!feed) return;
    const nowIso = new Date().toISOString();
    feed.lastFetchedAt = nowIso;
    feed.lastSuccessAt = nowIso;
    feed.consecutiveErrors = 0;
    feed.backoffMinutes = feed.intervalMinutes || 15; // Reset backoff
    feed.lastError = undefined;
    feed.articleCount += newlyAddedCount;
    this.save();
  }

  public recordFeedError(feedId: string, errorMsg: string, httpStatus?: number) {
    const feed = this.getFeedById(feedId);
    if (!feed) return;
    const nowIso = new Date().toISOString();
    feed.lastFetchedAt = nowIso;
    feed.lastError = errorMsg;
    feed.consecutiveErrors = (feed.consecutiveErrors || 0) + 1;

    // Exponential backoff: 15m -> 30m -> 60m -> 120m -> 240m (max 4 hours)
    const baseInterval = feed.intervalMinutes || 15;
    const multiplier = Math.min(Math.pow(2, feed.consecutiveErrors), 16);
    feed.backoffMinutes = baseInterval * multiplier;

    // Record error log
    this.logError({
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: nowIso,
      feedId: feed.id,
      feedName: feed.name,
      url: feed.url,
      message: errorMsg,
      httpStatus,
    });

    this.save();
  }

  // Error Logs
  public logError(log: StoredErrorLog) {
    this.data.errorLogs.unshift(log);
    if (this.data.errorLogs.length > 200) {
      this.data.errorLogs = this.data.errorLogs.slice(0, 200);
    }
    this.save();
  }

  public getErrorLogs(limit = 50): StoredErrorLog[] {
    return this.data.errorLogs.slice(0, limit);
  }

  public clearErrorLogs() {
    this.data.errorLogs = [];
    this.save();
  }

  // Settings & Status
  public updateCollectorRunTimestamps(lastRun: Date, nextRun: Date) {
    this.data.settings.lastCollectorRunAt = lastRun.toISOString();
    this.data.settings.nextCollectorRunAt = nextRun.toISOString();
    this.save();
  }

  public getStats() {
    let dbSize = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        dbSize = fs.statSync(DB_FILE).size;
      }
    } catch {}

    return {
      totalArticles: this.data.articles.length,
      uniqueUrls: this.knownUrls.size,
      totalFeeds: this.data.feeds.length,
      activeFeeds: this.data.feeds.filter((f) => f.enabled).length,
      lastUpdated: this.data.settings.lastCollectorRunAt,
      nextScheduledRun: this.data.settings.nextCollectorRunAt,
      errorCount: this.data.errorLogs.length,
      dbSizeBytes: dbSize,
    };
  }
}

export const db = new RssDatabase();
