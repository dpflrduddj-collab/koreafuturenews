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

export interface Reporter {
  name: string;
  dept: string;
  email?: string;
  photo?: string;
}

export type ArticleApprovalStatus = 'published' | 'pending_review' | 'held' | 'rejected';

export interface AiDraftResult {
  headline: string;
  summaryBullets: string[];
  bodyParagraphs: string[];
  suggestedCategory?: string;
  isAiGenerated: true;
  generatedAt: string;
  disclaimer: string;
}

export interface EditorialStats {
  total: number;
  pendingCount: number;
  publishedCount: number;
  heldCount: number;
  rejectedCount: number;
  aiDraftCount: number;
}

export interface Article {
  id: string;
  guid?: string;
  title: string;
  subtitle?: string;
  summary: string;
  content: string[];
  category: NewsCategory;
  categoryName: string;
  reporter: Reporter;
  publishedAt: string;
  timeAgo: string;
  imageUrl: string;
  imageCaption?: string;
  isBreaking?: boolean;
  isTopStory?: boolean;
  isExclusive?: boolean; // [단독]
  isEditorial?: boolean; // [사설 / 칼럼]
  isExternal?: boolean; // 외부 연계 기사 여부
  externalSource?: string; // 외부 언론사명 (예: SBS 뉴스, 한겨레, BBC 코리아 등)
  externalUrl?: string; // 외부 언론사 원문 링크
  isOwnPress?: boolean; // 본지 자체 작성 기사 여부
  viewCount: number;
  commentCount: number;
  likes: number;
  tags: string[];
  approvalStatus?: ArticleApprovalStatus;
  isAiGenerated?: boolean;
  aiDraft?: AiDraftResult;
}

export interface FeedStatus {
  id: string;
  name: string;
  category: string;
  url: string;
  status: 'online' | 'offline' | 'disabled';
  httpStatus?: number;
  latencyMs?: number;
  articleCount: number;
  lastChecked?: string;
  lastSuccess?: string;
  lastError?: string;
  consecutiveErrors?: number;
  backoffMinutes?: number;
  enabled?: boolean;
}

export interface RssFeedConfig {
  id: string;
  name: string;
  url: string;
  defaultCategory: NewsCategory;
  categoryName: string;
  enabled: boolean;
  intervalMinutes: number;
  lastFetchedAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  consecutiveErrors: number;
  backoffMinutes: number;
  articleCount: number;
}

export interface FeedErrorLog {
  id: string;
  timestamp: string;
  feedId: string;
  feedName: string;
  url: string;
  message: string;
  httpStatus?: number;
}

export interface AdminFeedTestResult {
  success: boolean;
  url: string;
  status?: number;
  latencyMs: number;
  title?: string;
  description?: string;
  sampleItems?: Array<{ title: string; link: string; pubDate: string }>;
  errorReason?: string;
}

export interface RssDatabaseStats {
  totalArticles: number;
  uniqueUrls: number;
  totalFeeds: number;
  activeFeeds: number;
  lastUpdated: string;
  errorCount: number;
  dbSizeBytes: number;
  nextScheduledRun: string;
}

export interface MarketIndex {
  name: string;
  value: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

export interface WeatherCity {
  city: string;
  temp: number;
  condition: string;
  icon: 'sun' | 'cloud' | 'rain' | 'cloud-sun';
  dust: '좋음' | '보통' | '나쁨';
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  category: string;
  options: PollOption[];
  totalVotes: number;
  endDate: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
}
