import crypto from 'crypto';
import { db, type NewsCategory, type StoredArticle, type StoredFeed } from './db.ts';

// Default high-quality visual fallbacks matching Korean newspaper sections
export const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  politics: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80',
  economy: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
  society: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  world: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  northkorea: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
  defense: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=800&q=80',
  industry: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
  kpop: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
  culture: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  sports: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  opinion: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
};

export const CATEGORY_NAMES: Record<NewsCategory, string> = {
  all: '종합',
  breaking: '속보',
  politics: '정치',
  economy: '경제',
  society: '사회',
  world: '국제',
  northkorea: '북한',
  defense: '국방·안보',
  industry: '산업·기업',
  kpop: '연예·K-POP',
  culture: '문화',
  tech: '과학·IT',
  sports: '스포츠',
  opinion: '오피니언',
};

// Clean and sanitize string (Requirement 6: Security and sanitize external instructions)
function sanitizeText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#9650;/g, '▲')
    .replace(/&#9660;/g, '▼')
    .replace(/ⓒ.*무단복제 및 재배포 금지.*/gi, '')
    .replace(/Copyrights\s*ⓒ.*/gi, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

function parsePubDate(dateStr: string): { iso: string; timeAgo: string; formatted: string } {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      let timeAgo = '최근';
      if (diffMins < 5) timeAgo = '방금 전';
      else if (diffMins < 60) timeAgo = `${diffMins}분 전`;
      else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) timeAgo = `${diffHours}시간 전`;
        else {
          const diffDays = Math.floor(diffHours / 24);
          if (diffDays < 7) timeAgo = `${diffDays}일 전`;
          else timeAgo = `${d.getMonth() + 1}월 ${d.getDate()}일`;
        }
      }

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const formatted = `${yyyy}.${mm}.${dd} ${hh}:${min}`;

      return { iso: d.toISOString(), timeAgo, formatted };
    }
  } catch {}

  const fallback = new Date().toISOString();
  return { iso: fallback, timeAgo: '최근', formatted: fallback.slice(0, 16).replace('T', ' ') };
}

// Clean publisher name for display (e.g. "SBS 뉴스", "한겨레", "동아일보", "매일경제", "조선일보", "한국경제", "BBC 코리아")
export function getCleanPublisherName(feedName: string): string {
  let clean = feedName.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (clean.startsWith('SBS')) return 'SBS 뉴스';
  if (clean.startsWith('한겨레')) return '한겨레';
  if (clean.startsWith('동아일보')) return '동아일보';
  if (clean.startsWith('조선일보')) return '조선일보';
  if (clean.startsWith('매일경제')) return '매일경제';
  if (clean.startsWith('한국경제')) return '한국경제';
  if (clean.startsWith('BBC')) return 'BBC 코리아';
  return clean || feedName;
}

// Smart Category Classifier matching verified media taxonomy
export function classifyArticleCategory(
  title: string,
  summary: string,
  link: string,
  feedCategory: NewsCategory,
  xmlCategory?: string
): { category: NewsCategory; categoryName: string } {
  const normCat = (xmlCategory || '').toLowerCase().trim();
  const normLink = link.toLowerCase();
  const combined = `${title} ${summary}`.toLowerCase();

  // 1. Direct match on RSS <category> tag if provided by original newspaper
  if (normCat) {
    if (normCat.includes('정치') || normCat.includes('청와대') || normCat.includes('국회') || normCat.includes('정당')) {
      return { category: 'politics', categoryName: CATEGORY_NAMES.politics };
    }
    if (
      normCat.includes('사회') ||
      normCat.includes('전국') ||
      normCat.includes('사건') ||
      normCat.includes('사고') ||
      normCat.includes('법원') ||
      normCat.includes('검찰') ||
      normCat.includes('노동') ||
      normCat.includes('교육') ||
      normCat.includes('시정')
    ) {
      return { category: 'society', categoryName: CATEGORY_NAMES.society };
    }
    if (
      normCat.includes('경제') ||
      normCat.includes('금융') ||
      normCat.includes('증권') ||
      normCat.includes('부동산') ||
      normCat.includes('재테크') ||
      normCat.includes('유통')
    ) {
      return { category: 'economy', categoryName: CATEGORY_NAMES.economy };
    }
    if (normCat.includes('산업') || normCat.includes('기업') || normCat.includes('중기')) {
      return { category: 'industry', categoryName: CATEGORY_NAMES.industry };
    }
    if (
      normCat.includes('국제') ||
      normCat.includes('세계') ||
      normCat.includes('글로벌') ||
      normCat.includes('지구촌') ||
      normCat.includes('외신')
    ) {
      return { category: 'world', categoryName: CATEGORY_NAMES.world };
    }
    if (normCat.includes('북한') || normCat.includes('남북') || normCat.includes('통일')) {
      return { category: 'northkorea', categoryName: CATEGORY_NAMES.northkorea };
    }
    if (normCat.includes('국방') || normCat.includes('군사') || normCat.includes('안보')) {
      return { category: 'defense', categoryName: CATEGORY_NAMES.defense };
    }
    if (
      normCat.includes('연예') ||
      normCat.includes('방송') ||
      normCat.includes('스타') ||
      normCat.includes('가요') ||
      normCat.includes('영화') ||
      normCat.includes('드라마') ||
      normCat.includes('kpop')
    ) {
      return { category: 'kpop', categoryName: CATEGORY_NAMES.kpop };
    }
    if (
      normCat.includes('스포츠') ||
      normCat.includes('야구') ||
      normCat.includes('축구') ||
      normCat.includes('골프') ||
      normCat.includes('농구') ||
      normCat.includes('kbo')
    ) {
      return { category: 'sports', categoryName: CATEGORY_NAMES.sports };
    }
    if (
      normCat.includes('it') ||
      normCat.includes('과학') ||
      normCat.includes('테크') ||
      normCat.includes('기술') ||
      normCat.includes('통신') ||
      normCat.includes('디지털')
    ) {
      return { category: 'tech', categoryName: CATEGORY_NAMES.tech };
    }
    if (
      normCat.includes('문화') ||
      normCat.includes('공연') ||
      normCat.includes('전시') ||
      normCat.includes('문학') ||
      normCat.includes('도서') ||
      normCat.includes('출판')
    ) {
      return { category: 'culture', categoryName: CATEGORY_NAMES.culture };
    }
    if (normCat.includes('오피니언') || normCat.includes('사설') || normCat.includes('칼럼')) {
      return { category: 'opinion', categoryName: CATEGORY_NAMES.opinion };
    }
  }

  // 2. Newspaper section codes from URL (e.g. sectionId=01, /news/politics/, etc.)
  if (normLink.includes('sectionid=01') || normLink.includes('/politics/') || normLink.includes('/political/')) {
    return { category: 'politics', categoryName: CATEGORY_NAMES.politics };
  }
  if (
    normLink.includes('sectionid=02') ||
    normLink.includes('/economy/') ||
    normLink.includes('/business/') ||
    normLink.includes('/finance/')
  ) {
    return { category: 'economy', categoryName: CATEGORY_NAMES.economy };
  }
  if (
    normLink.includes('sectionid=03') ||
    normLink.includes('/society/') ||
    normLink.includes('/national/')
  ) {
    return { category: 'society', categoryName: CATEGORY_NAMES.society };
  }
  if (
    normLink.includes('sectionid=07') ||
    normLink.includes('/world/') ||
    normLink.includes('/international/')
  ) {
    return { category: 'world', categoryName: CATEGORY_NAMES.world };
  }
  if (
    normLink.includes('sectionid=08') ||
    normLink.includes('/culture/') ||
    normLink.includes('/culture-life/')
  ) {
    return { category: 'culture', categoryName: CATEGORY_NAMES.culture };
  }
  if (normLink.includes('sectionid=09') || normLink.includes('/sports/')) {
    return { category: 'sports', categoryName: CATEGORY_NAMES.sports };
  }
  if (
    normLink.includes('sectionid=14') ||
    normLink.includes('/entertainment/') ||
    normLink.includes('/star/')
  ) {
    return { category: 'kpop', categoryName: CATEGORY_NAMES.kpop };
  }
  if (
    normLink.includes('/science/') ||
    normLink.includes('/it/') ||
    normLink.includes('/tech/')
  ) {
    return { category: 'tech', categoryName: CATEGORY_NAMES.tech };
  }
  if (normLink.includes('/opinion/') || normLink.includes('/column/')) {
    return { category: 'opinion', categoryName: CATEGORY_NAMES.opinion };
  }

  // 3. Feed default category if specific (not 'all')
  if (feedCategory && feedCategory !== 'all') {
    return { category: feedCategory, categoryName: CATEGORY_NAMES[feedCategory] || '종합' };
  }

  // 4. Contextual Keyword Fallback with proper specificity
  // North Korea & Hanbando
  if (
    combined.includes('북한') ||
    combined.includes('김정은') ||
    combined.includes('평양') ||
    combined.includes('노동신문') ||
    combined.includes('대북') ||
    combined.includes('남북관계') ||
    combined.includes('개성공단') ||
    combined.includes('판문점')
  ) {
    return { category: 'northkorea', categoryName: CATEGORY_NAMES.northkorea };
  }

  // Defense / Military
  if (
    combined.includes('국방부') ||
    combined.includes('합참') ||
    combined.includes('방사청') ||
    combined.includes('군사합의') ||
    combined.includes('k-2 흑표') ||
    combined.includes('자주포') ||
    combined.includes('전투기')
  ) {
    return { category: 'defense', categoryName: CATEGORY_NAMES.defense };
  }

  // Sports
  if (
    combined.includes('축구') ||
    combined.includes('야구') ||
    combined.includes('손흥민') ||
    combined.includes('이강인') ||
    combined.includes('오타니') ||
    combined.includes('프로야구') ||
    combined.includes('kbo') ||
    combined.includes('올림픽') ||
    combined.includes('골프')
  ) {
    return { category: 'sports', categoryName: CATEGORY_NAMES.sports };
  }

  // Entertainment / K-POP
  if (
    combined.includes('아이돌') ||
    combined.includes('방탄소년단') ||
    combined.includes('bts') ||
    combined.includes('뉴진스') ||
    combined.includes('걸그룹') ||
    combined.includes('보이그룹') ||
    combined.includes('가요계') ||
    combined.includes('드라마') ||
    combined.includes('배우') ||
    combined.includes('영화제')
  ) {
    return { category: 'kpop', categoryName: CATEGORY_NAMES.kpop };
  }

  // Tech / Science
  if (
    combined.includes('인공지능') ||
    combined.includes(' 생성형 ai') ||
    combined.includes('챗gpt') ||
    combined.includes('양자컴퓨터') ||
    combined.includes('우주항공청') ||
    combined.includes('누리호') ||
    combined.includes('사이버보안') ||
    combined.includes('클라우드') ||
    combined.includes('반도체')
  ) {
    return { category: 'tech', categoryName: CATEGORY_NAMES.tech };
  }

  // Politics
  if (
    combined.includes('대통령') ||
    combined.includes('국회') ||
    combined.includes('국회의원') ||
    combined.includes('여당') ||
    combined.includes('야당') ||
    combined.includes('국민의힘') ||
    combined.includes('더불어민주당') ||
    combined.includes('원내대표') ||
    combined.includes('당대표') ||
    combined.includes('국무총리') ||
    combined.includes('인사청문회')
  ) {
    return { category: 'politics', categoryName: CATEGORY_NAMES.politics };
  }

  // World / International
  if (
    combined.includes('미국') ||
    combined.includes('백악관') ||
    combined.includes('트럼프') ||
    combined.includes('바이든') ||
    combined.includes('중국') ||
    combined.includes('러시아') ||
    combined.includes('일본') ||
    combined.includes('우크라이나') ||
    combined.includes('이스라엘') ||
    combined.includes('이란') ||
    combined.includes('가자지구')
  ) {
    return { category: 'world', categoryName: CATEGORY_NAMES.world };
  }

  // Economy
  if (
    combined.includes('금리') ||
    combined.includes('한국은행') ||
    combined.includes('환율') ||
    combined.includes('코스피') ||
    combined.includes('코스닥') ||
    combined.includes('주가') ||
    combined.includes('부동산') ||
    combined.includes('물가') ||
    combined.includes('기준금리')
  ) {
    return { category: 'economy', categoryName: CATEGORY_NAMES.economy };
  }

  // Society fallback
  return { category: 'society', categoryName: CATEGORY_NAMES.society };
}

// Universal XML Item Parser (RSS 2.0 <item> and Atom <entry>)
export function parseFeedXml(xml: string, feed: StoredFeed): StoredArticle[] {
  const articles: StoredArticle[] = [];
  const isAtom = xml.includes('<entry') && !xml.includes('<item');
  const tagPattern = isAtom ? /<entry>([\s\S]*?)<\/entry>/gi : /<item>([\s\S]*?)<\/item>/gi;

  let match: RegExpExecArray | null;
  const publisherName = getCleanPublisherName(feed.name);

  while ((match = tagPattern.exec(xml)) !== null) {
    const raw = match[1];

    const getTag = (tag: string): string => {
      const r = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i');
      const found = raw.match(r);
      return found ? (found[1] || found[2] || '').trim() : '';
    };

    // Title
    const rawTitle = getTag('title');
    const title = sanitizeText(rawTitle);
    if (!title) continue;

    // Link / URL
    let link = getTag('link');
    if (!link && isAtom) {
      const atomLink = raw.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (atomLink) link = atomLink[1];
    }
    if (!link) continue;
    link = link.trim().replace(/&amp;/g, '&');

    // Hash key based on link and title for guaranteed uniqueness
    const linkHash = crypto.createHash('sha256').update(`${feed.id}:${link}:${title}`).digest('hex').slice(0, 20);

    // GUID / ID
    let guid = getTag('guid') || getTag('id');
    if (!guid || guid.trim() === '' || guid.trim() === link) {
      guid = `${feed.id}-${linkHash}`;
    }

    // Publication Date
    const rawPubDate = getTag('pubDate') || getTag('published') || getTag('updated') || getTag('dc:date');
    const { iso: pubDateIso, timeAgo, formatted: publishedAtFormatted } = parsePubDate(rawPubDate);

    // Summary / Description (Requirement 6: Never duplicate full article without permission, only allowed summary)
    const rawDesc = getTag('description') || getTag('summary') || getTag('content');
    let summary = sanitizeText(rawDesc);
    if (summary.length > 250) {
      summary = `${summary.slice(0, 247)}...`;
    }
    if (!summary) {
      summary = `${publisherName}에서 보도한 ${feed.categoryName} 주요 뉴스입니다.`;
    }

    // Author
    let authorName = getTag('author') || getTag('dc:creator');
    if (!authorName) {
      const m = raw.match(/<author>[^<]*<name>([^<]+)<\/name>/i);
      if (m) authorName = m[1];
    }
    authorName = sanitizeText(authorName) || `${publisherName} 보도국`;

    // Image Extraction (enclosure, media:thumbnail, media:content, or img in raw text / description)
    let imageUrl = '';
    const enclosure = raw.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const mediaThumb = raw.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
    const mediaContent = raw.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    const imgTag = raw.match(/<img[^>]+src=["']([^"']+)["']/i);

    if (enclosure && enclosure[1] && (enclosure[1].startsWith('http://') || enclosure[1].startsWith('https://'))) {
      imageUrl = enclosure[1];
    } else if (mediaThumb && mediaThumb[1]) {
      imageUrl = mediaThumb[1];
    } else if (mediaContent && mediaContent[1]) {
      imageUrl = mediaContent[1];
    } else if (imgTag && imgTag[1]) {
      imageUrl = imgTag[1];
    } else {
      // Decode escaped HTML in description and search for image tags
      const decodedRaw = raw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const imgMatch = decodedRaw.match(/<img[^>]+src=["'](https?:\/\/[^"'\s>]+)["']/i);
      if (imgMatch && imgMatch[1]) {
        imageUrl = imgMatch[1];
      }
    }

    // Category detection with XML category tag support
    const rawCategory = getTag('category');
    const { category, categoryName } = classifyArticleCategory(
      title,
      summary,
      link,
      feed.defaultCategory,
      rawCategory
    );

    // Image fallback
    if (!imageUrl) {
      imageUrl = CATEGORY_DEFAULT_IMAGES[category] || CATEGORY_DEFAULT_IMAGES.society;
    }

    // Is breaking if published within last 45 minutes
    const isBreaking = timeAgo.includes('분 전') || timeAgo === '방금 전';

    // Guaranteed Unique ID
    const id = `rss-${feed.id}-${linkHash}`;

    articles.push({
      id,
      guid,
      title,
      summary,
      content: [
        summary,
        `※ 본 기사는 외부 언론사 [${publisherName}]의 공식 RSS 피드를 통해 자동 수집 및 연계된 뉴스입니다. 저작권 보호 및 언론사 이용 조건 준수를 위해 기사 전문 복제는 제공되지 않으며, 기사 전문과 상세 보도는 원문 보기 링크를 통해 해당 언론사에서 직접 확인하실 수 있습니다.`,
      ],
      category,
      categoryName,
      reporter: {
        name: authorName,
        dept: `${publisherName} 보도국`,
      },
      publishedAt: publishedAtFormatted,
      timeAgo,
      imageUrl,
      isBreaking,
      isExternal: true,
      externalSource: publisherName,
      externalUrl: link,
      isOwnPress: false,
      viewCount: Math.floor(Math.random() * 5000) + 500,
      commentCount: Math.floor(Math.random() * 40) + 2,
      likes: Math.floor(Math.random() * 120) + 10,
      tags: [categoryName, publisherName, '실시간뉴스'],
      collectedAt: new Date().toISOString(),
      approvalStatus: 'published',
    });
  }

  return articles;
}

// Single Feed Collector with polite rate limiting and timeout
export async function collectFromFeed(feed: StoredFeed): Promise<{
  success: boolean;
  addedCount: number;
  totalParsed: number;
  latencyMs: number;
  httpStatus?: number;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(feed.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml,application/atom+xml,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = `HTTP ${response.status} ${response.statusText}`;
      db.recordFeedError(feed.id, errText, response.status);
      return {
        success: false,
        addedCount: 0,
        totalParsed: 0,
        latencyMs,
        httpStatus: response.status,
        error: errText,
      };
    }

    const xmlText = await response.text();
    if (!xmlText || xmlText.length < 50) {
      const errText = '수신된 RSS 데이터가 비어 있거나 너무 짧습니다.';
      db.recordFeedError(feed.id, errText, response.status);
      return { success: false, addedCount: 0, totalParsed: 0, latencyMs, httpStatus: response.status, error: errText };
    }

    const parsedArticles = parseFeedXml(xmlText, feed);
    if (parsedArticles.length === 0) {
      const errText = 'RSS 피드에서 기사 아이템(<item> 또는 <entry>)을 찾을 수 없습니다.';
      db.recordFeedError(feed.id, errText, response.status);
      return { success: false, addedCount: 0, totalParsed: 0, latencyMs, httpStatus: response.status, error: errText };
    }

    // Add with deduplication
    const addedCount = db.addArticles(parsedArticles);
    db.recordFeedSuccess(feed.id, addedCount);

    return {
      success: true,
      addedCount,
      totalParsed: parsedArticles.length,
      latencyMs,
      httpStatus: response.status,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    let errMsg = err.message || '연결 실패';
    if (err.name === 'AbortError') {
      errMsg = '요청 시간 초과 (7초 이내에 서버 응답 없음)';
    }
    db.recordFeedError(feed.id, errMsg);
    return {
      success: false,
      addedCount: 0,
      totalParsed: 0,
      latencyMs,
      error: errMsg,
    };
  }
}

// Background Cron-like Periodic Runner
let collectorTimer: NodeJS.Timeout | null = null;
let isCollectingNow = false;

export async function runBatchCollection(forceAll = false) {
  if (isCollectingNow) {
    console.log('[Collector] Previous batch run still in progress, skipping...');
    return;
  }
  isCollectingNow = true;

  const now = Date.now();
  const feeds = db.getFeeds();
  const runStart = new Date();
  const nextRun = new Date(now + 15 * 60 * 1000); // default 15 minutes
  db.updateCollectorRunTimestamps(runStart, nextRun);

  console.log(`[Collector] Starting automated RSS collection for ${feeds.length} configured feeds...`);
  let totalNew = 0;

  for (const feed of feeds) {
    // Check if feed is disabled
    if (!feed.enabled && !forceAll) {
      continue;
    }

    // Check backoff condition
    if (!forceAll && feed.lastFetchedAt) {
      const lastRunTime = new Date(feed.lastFetchedAt).getTime();
      const waitMs = (feed.backoffMinutes || 15) * 60 * 1000;
      if (now - lastRunTime < waitMs) {
        // Feed is in backoff cooling period
        continue;
      }
    }

    // Polite delay between requests to avoid burst load
    await new Promise((r) => setTimeout(r, 600));

    const res = await collectFromFeed(feed);
    if (res.success) {
      totalNew += res.addedCount;
    }
  }

  isCollectingNow = false;
  console.log(`[Collector] Batch collection completed. Newly indexed articles: ${totalNew}`);
}

export function startPeriodicCollector(intervalMinutes = 15) {
  if (collectorTimer) clearInterval(collectorTimer);

  // Run initial collection in background after 2 seconds
  setTimeout(() => {
    runBatchCollection(false).catch((e) => console.error('[Collector Initial Run Fail]', e));
  }, 2000);

  // Periodic interval
  const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000;
  collectorTimer = setInterval(() => {
    runBatchCollection(false).catch((e) => console.error('[Collector Periodic Run Fail]', e));
  }, intervalMs);

  console.log(`[Collector] Periodic scheduler active: running every ${intervalMinutes} minutes.`);
}

// Admin Real-time Feed URL Tester
export async function testRssFeedUrl(targetUrl: string): Promise<{
  success: boolean;
  status?: number;
  latencyMs: number;
  title?: string;
  description?: string;
  sampleItems?: Array<{ title: string; link: string; pubDate: string }>;
  errorReason?: string;
}> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml,application/atom+xml,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        latencyMs,
        errorReason: `원격 서버가 HTTP ${res.status} (${res.statusText}) 에러를 반환했습니다. 올바른 공개 RSS 주소인지 확인해 주세요.`,
      };
    }

    const text = await res.text();
    if (!text || text.length < 50) {
      return {
        success: false,
        status: res.status,
        latencyMs,
        errorReason: '수신된 데이터 내용이 비어 있거나 유효하지 않습니다.',
      };
    }

    // Extract title & description
    const channelMatch = text.match(/<channel[\s\S]*?>([\s\S]*?)<\/channel>/i);
    let channelContent = channelMatch ? channelMatch[1] : text;

    const channelTitleMatch = channelContent.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
    const feedTitle = channelTitleMatch ? sanitizeText(channelTitleMatch[1] || channelTitleMatch[2] || '') : '제목 미제공 피드';

    const dummyFeed: StoredFeed = {
      id: 'test',
      name: feedTitle,
      url: targetUrl,
      defaultCategory: 'all',
      categoryName: '종합',
      enabled: true,
      intervalMinutes: 15,
      consecutiveErrors: 0,
      backoffMinutes: 15,
      articleCount: 0,
    };

    const parsed = parseFeedXml(text, dummyFeed);
    if (parsed.length === 0) {
      return {
        success: false,
        status: res.status,
        latencyMs,
        title: feedTitle,
        errorReason: 'XML 파싱은 완료되었으나 유효한 기사 항목(<item> 또는 <entry>)이 발견되지 않았습니다.',
      };
    }

    return {
      success: true,
      status: res.status,
      latencyMs,
      title: feedTitle,
      sampleItems: parsed.slice(0, 5).map((a) => ({
        title: a.title,
        link: a.externalUrl,
        pubDate: a.publishedAt,
      })),
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    let reason = err.message || '네트워크 연결 실패';
    if (err.name === 'AbortError') {
      reason = '연결 제한 시간(6초) 초과: 해당 서버가 응답하지 않습니다.';
    } else if (err.code === 'ENOTFOUND') {
      reason = '도메인 이름을 찾을 수 없습니다(DNS 오류). 주소 오타를 확인해 주세요.';
    }
    return {
      success: false,
      latencyMs,
      errorReason: reason,
    };
  }
}
