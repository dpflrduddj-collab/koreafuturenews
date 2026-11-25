import {
  AdminFeedTestResult,
  Article,
  ArticleApprovalStatus,
  AiDraftResult,
  EditorialStats,
  FeedErrorLog,
  FeedStatus,
  NewsCategory,
  RssDatabaseStats,
  RssFeedConfig,
} from '../types';
import { ARTICLES as DEFAULT_ARTICLES } from '../data/newsData';

const LOCAL_STORAGE_CUSTOM_ARTICLES_KEY = 'user_custom_news_articles';
const LOCAL_STORAGE_EXTERNAL_CACHE_KEY = 'cached_external_news_articles';
const LOCAL_STORAGE_ADMIN_TOKEN_KEY = 'admin_auth_token_key';

// Clean up any stale or corrupted legacy cache entries in browser
try {
  const cached = localStorage.getItem(LOCAL_STORAGE_EXTERNAL_CACHE_KEY);
  if (cached && (cached.includes('aHR0cHM6') || cached.includes('rss-chosun-top-aHR0cHM6'))) {
    localStorage.removeItem(LOCAL_STORAGE_EXTERNAL_CACHE_KEY);
  }
} catch {
  // ignore
}

export interface ExternalNewsResponse {
  success: boolean;
  lastUpdated: string;
  nextScheduledRun?: string;
  totalCount: number;
  articles: Article[];
}

export interface FeedStatusResponse {
  success: boolean;
  lastUpdated: string;
  nextScheduledRun?: string;
  totalFeeds: number;
  activeFeeds: number;
  onlineFeeds: number;
  feeds: FeedStatus[];
}

// -----------------------------------------------------------------------------
// IN-HOUSE ARTICLE MANAGEMENT (Stored in browser for editorial testing)
// -----------------------------------------------------------------------------
export function getCustomArticles(): Article[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_ARTICLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load custom articles from localStorage', e);
    return [];
  }
}

export function saveCustomArticle(article: Article): void {
  try {
    const existing = getCustomArticles();
    const updated = [article, ...existing.filter((a) => a.id !== article.id)];
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_ARTICLES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save custom article', e);
  }
}

export function deleteCustomArticle(id: string): void {
  try {
    const existing = getCustomArticles();
    const updated = existing.filter((a) => a.id !== id);
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_ARTICLES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete custom article', e);
  }
}

// -----------------------------------------------------------------------------
// PUBLIC RSS NEWS FETCHING (Server-backed with offline caching)
// -----------------------------------------------------------------------------
export async function fetchLiveExternalNews(
  category: NewsCategory = 'all',
  force = false,
  search?: string
): Promise<{
  articles: Article[];
  lastUpdated: string;
  nextScheduledRun?: string;
  isOnline: boolean;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (force) params.set('force', 'true');
    if (search && search.trim()) params.set('search', search.trim());
    params.set('limit', '80');

    const res = await fetch(`/api/news/external?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
    }

    const data: ExternalNewsResponse = await res.json();
    if (data.success && Array.isArray(data.articles)) {
      if (category === 'all' && !search) {
        try {
          localStorage.setItem(
            LOCAL_STORAGE_EXTERNAL_CACHE_KEY,
            JSON.stringify({ articles: data.articles, lastUpdated: data.lastUpdated })
          );
        } catch {
          // ignore localStorage quota limit
        }
      }

      return {
        articles: data.articles,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        nextScheduledRun: data.nextScheduledRun,
        isOnline: true,
      };
    }

    throw new Error('데이터 파싱 오류');
  } catch (err: any) {
    console.warn('[NewsService] Failed to fetch external news from server:', err);

    // Fallback to offline localStorage cache
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_EXTERNAL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        let list: Article[] = parsed.articles || [];
        if (category === 'breaking') {
          list = list.filter((a) => a.isBreaking);
        } else if (category !== 'all') {
          list = list.filter((a) => a.category === category);
        }
        return {
          articles: list,
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          isOnline: false,
          error: '서버와 통신할 수 없어 저장된 최신 캐시 뉴스를 표시합니다.',
        };
      }
    } catch {
      // ignore
    }

    return {
      articles: [],
      lastUpdated: new Date().toISOString(),
      isOnline: false,
      error: '외부 뉴스 피드 연결에 실패했습니다. (자체 기사는 정상 제공됩니다)',
    };
  }
}

// -----------------------------------------------------------------------------
// FEED STATUS FOR PUBLIC MONITOR
// -----------------------------------------------------------------------------
export async function fetchFeedStatus(): Promise<FeedStatusResponse | null> {
  try {
    const res = await fetch('/api/news/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function triggerManualRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/news/refresh', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// ADMIN AUTHENTICATION & FEED MANAGEMENT (Requirement 7)
// -----------------------------------------------------------------------------
export function getSavedAdminToken(): string | null {
  return localStorage.getItem(LOCAL_STORAGE_ADMIN_TOKEN_KEY);
}

export function saveAdminToken(token: string): void {
  localStorage.setItem(LOCAL_STORAGE_ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(LOCAL_STORAGE_ADMIN_TOKEN_KEY);
}

export async function adminLogin(key: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      saveAdminToken(data.token);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || '로그인 요청 실패' };
  }
}

export async function testFeedUrl(url: string): Promise<AdminFeedTestResult> {
  try {
    const res = await fetch('/api/admin/feeds/test-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      url,
      latencyMs: 0,
      errorReason: err.message || '네트워크 오류로 연결 테스트에 실패했습니다.',
    };
  }
}

export async function fetchAdminFeeds(token: string): Promise<{
  success: boolean;
  feeds?: RssFeedConfig[];
  stats?: RssDatabaseStats;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/feeds', {
      headers: { 'x-admin-key': token },
    });
    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error || '피드 목록 조회 실패' };
    }
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addAdminFeed(
  feed: { name: string; url: string; defaultCategory: NewsCategory; intervalMinutes: number },
  token: string
): Promise<{ success: boolean; message?: string; feed?: RssFeedConfig; error?: string }> {
  try {
    const res = await fetch('/api/admin/feeds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': token,
      },
      body: JSON.stringify(feed),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateAdminFeed(
  id: string,
  updates: Partial<RssFeedConfig>,
  token: string
): Promise<{ success: boolean; feed?: RssFeedConfig; error?: string }> {
  try {
    const res = await fetch(`/api/admin/feeds/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': token,
      },
      body: JSON.stringify(updates),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleAdminFeed(
  id: string,
  token: string
): Promise<{ success: boolean; enabled?: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/admin/feeds/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'x-admin-key': token },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteAdminFeed(
  id: string,
  token: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/admin/feeds/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': token },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function triggerAdminCollectNow(
  token: string,
  feedId?: string
): Promise<{ success: boolean; stats?: RssDatabaseStats; error?: string }> {
  try {
    const res = await fetch('/api/admin/collect-now', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': token,
      },
      body: JSON.stringify({ feedId }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function fetchAdminErrors(
  token: string
): Promise<{ success: boolean; errors?: FeedErrorLog[]; error?: string }> {
  try {
    const res = await fetch('/api/admin/errors', {
      headers: { 'x-admin-key': token },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function clearAdminErrors(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/errors', {
      method: 'DELETE',
      headers: { 'x-admin-key': token },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function fetchAdminStats(token: string): Promise<{
  success: boolean;
  stats?: RssDatabaseStats;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'x-admin-key': token },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// -----------------------------------------------------------------------------
// EDITORIAL DESK & AI DRAFTING ADMIN APIS
// -----------------------------------------------------------------------------

export async function fetchAdminArticles(
  token: string,
  options: {
    status?: ArticleApprovalStatus | 'all';
    category?: NewsCategory;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  success: boolean;
  articles?: Article[];
  total?: number;
  stats?: EditorialStats;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.category && options.category !== 'all') params.set('category', options.category);
    if (options.search && options.search.trim()) params.set('search', options.search.trim());
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));

    const res = await fetch(`/api/admin/articles?${params.toString()}`, {
      headers: { 'x-admin-key': token },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function generateAdminAiDraft(
  id: string,
  token: string
): Promise<{
  success: boolean;
  message?: string;
  article?: Article;
  draft?: AiDraftResult;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/admin/articles/${id}/generate-ai-draft`, {
      method: 'POST',
      headers: { 'x-admin-key': token },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function applyAdminAiDraft(
  id: string,
  token: string,
  customDraft?: Partial<AiDraftResult>
): Promise<{
  success: boolean;
  message?: string;
  article?: Article;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/admin/articles/${id}/apply-ai-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': token,
      },
      body: JSON.stringify({ customDraft }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateAdminArticleStatus(
  id: string,
  status: ArticleApprovalStatus,
  token: string,
  edits?: {
    title?: string;
    subtitle?: string;
    summary?: string;
    content?: string[];
    category?: NewsCategory;
  }
): Promise<{
  success: boolean;
  message?: string;
  article?: Article;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/admin/articles/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': token,
      },
      body: JSON.stringify({ status, edits }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function batchApproveAdminArticles(
  token: string,
  ids?: string[]
): Promise<{
  success: boolean;
  message?: string;
  count?: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/articles/batch-approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': token,
      },
      body: JSON.stringify({ ids }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteAdminArticle(
  id: string,
  token: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/admin/articles/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': token },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function fetchAdminEditorialStats(
  token: string
): Promise<{
  success: boolean;
  stats?: EditorialStats;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/editorial-stats', {
      headers: { 'x-admin-key': token },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// -----------------------------------------------------------------------------
// MERGE NEWS POOL (In-house + Live External)
// -----------------------------------------------------------------------------
export function mergeNewsPool(
  liveExternal: Article[],
  customArticles: Article[],
  sourceFilter: 'all' | 'inhouse' | 'external' = 'all'
): Article[] {
  // If user explicitly asks for in-house news, show custom articles + templates
  if (sourceFilter === 'inhouse') {
    return [...customArticles, ...DEFAULT_ARTICLES];
  }

  // If live external news is loaded, prioritize genuine live RSS news + custom articles
  // Only fallback to sample articles if external server is completely offline / empty
  const pool =
    sourceFilter === 'external'
      ? liveExternal
      : liveExternal.length > 0
      ? [...customArticles, ...liveExternal]
      : [...customArticles, ...DEFAULT_ARTICLES];

  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const merged: Article[] = [];

  const normalizeClientUrl = (url: string): string => {
    try {
      const u = new URL(url);
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
  };

  for (const art of pool) {
    if (!art.id || seenIds.has(art.id)) continue;
    const normUrl = art.externalUrl ? normalizeClientUrl(art.externalUrl) : null;
    if (normUrl && seenUrls.has(normUrl)) continue;

    if (normUrl) seenUrls.add(normUrl);
    seenIds.add(art.id);
    merged.push(art);
  }

  // Sort descending by recency
  merged.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return merged;
}
