/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ARTICLES as DEFAULT_ARTICLES } from './data/newsData';
import { Article, NewsCategory } from './types';
import { Header } from './components/Header';
import { BreakingNewsBar } from './components/BreakingNewsBar';
import { TopStoriesSection } from './components/TopStoriesSection';
import { CategoryGridSection } from './components/CategoryGridSection';
import { PopularNewsRanking } from './components/PopularNewsRanking';
import { OpinionSection } from './components/OpinionSection';
import { MarketWeatherWidget } from './components/MarketWeatherWidget';
import { DailyPoll } from './components/DailyPoll';
import { NewsletterBanner } from './components/NewsletterBanner';
import { ArticleModal } from './components/ArticleModal';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { LiveNewsStatusBar } from './components/LiveNewsStatusBar';
import { FeedStatusModal } from './components/FeedStatusModal';
import { ArticleEditorModal } from './components/ArticleEditorModal';
import { AdminRssModal } from './components/AdminRssModal';
import {
  fetchLiveExternalNews,
  getCustomArticles,
  mergeNewsPool,
} from './services/newsService';
import { Search, X, ExternalLink } from 'lucide-react';

const AUTO_REFRESH_INTERVAL_SECONDS = 900; // 15분 주기 자동 갱신 (요구사항 2)

export default function App() {
  const [currentCategory, setCurrentCategory] = useState<NewsCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [textSize, setTextSize] = useState<'normal' | 'large'>('normal');

  // External news integration states
  const [liveExternalArticles, setLiveExternalArticles] = useState<Article[]>([]);
  const [customArticles, setCustomArticles] = useState<Article[]>(() => getCustomArticles());
  const [feedFilter, setFeedFilter] = useState<'all' | 'inhouse' | 'external'>('all');
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [nextRefreshSeconds, setNextRefreshSeconds] = useState<number>(AUTO_REFRESH_INTERVAL_SECONDS);
  const [externalError, setExternalError] = useState<string | undefined>();
  const [isFeedStatusOpen, setIsFeedStatusOpen] = useState(false);
  const [isAdminRssOpen, setIsAdminRssOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Load bookmarks from localStorage
  const [bookmarks, setBookmarks] = useState<Article[]>(() => {
    try {
      const saved = localStorage.getItem('user_news_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist bookmarks
  useEffect(() => {
    try {
      localStorage.setItem('user_news_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      console.error('Failed to save bookmarks', e);
    }
  }, [bookmarks]);

  // Fetch live external news
  const loadExternalNews = useCallback(
    async (force = false) => {
      setIsLoadingExternal(true);
      const res = await fetchLiveExternalNews(currentCategory, force);
      if (res.articles && res.articles.length > 0) {
        setLiveExternalArticles(res.articles);
        setExternalError(undefined);
      } else if (res.error) {
        setExternalError(res.error);
      }
      setLastUpdated(res.lastUpdated);
      setIsLoadingExternal(false);
      setNextRefreshSeconds(AUTO_REFRESH_INTERVAL_SECONDS);
    },
    [currentCategory]
  );

  // Initial fetch and on category change
  useEffect(() => {
    loadExternalNews(false);
  }, [loadExternalNews]);

  // 5-minute auto-refresh countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNextRefreshSeconds((prev) => {
        if (prev <= 1) {
          loadExternalNews(false);
          return AUTO_REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadExternalNews]);

  // Combined master news pool according to current source filter (all / inhouse / external)
  const masterArticles = useMemo(() => {
    return mergeNewsPool(liveExternalArticles, customArticles, feedFilter);
  }, [liveExternalArticles, customArticles, feedFilter]);

  // In-house count and external count for status bar
  const inhouseCount = useMemo(() => {
    const defaultCount = DEFAULT_ARTICLES.length;
    return customArticles.length + defaultCount;
  }, [customArticles]);

  const externalCount = liveExternalArticles.length;

  // Category-specific articles
  const categoryArticles = useMemo(() => {
    if (currentCategory === 'all') {
      return masterArticles;
    }
    if (currentCategory === 'breaking') {
      return masterArticles.filter((a) => a.isBreaking);
    }
    return masterArticles.filter((a) => a.category === currentCategory);
  }, [masterArticles, currentCategory]);

  // Lead story: top marked article, breaking news, or latest real news
  const leadArticle = useMemo(() => {
    return (
      masterArticles.find((a) => a.isTopStory) ||
      masterArticles.find((a) => a.isBreaking) ||
      masterArticles[0] ||
      DEFAULT_ARTICLES[0]
    );
  }, [masterArticles]);

  // Sub-lead stories (2 articles)
  const subLeadArticles = useMemo(() => {
    return masterArticles
      .filter((a) => a.id !== leadArticle?.id && !a.isEditorial)
      .slice(0, 2);
  }, [masterArticles, leadArticle]);

  // Real-time timeline feed
  const liveTimelineArticles = useMemo(() => {
    return [...masterArticles]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 7);
  }, [masterArticles]);

  // Filtered by search if query present
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return masterArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.categoryName.toLowerCase().includes(q) ||
        (a.externalSource && a.externalSource.toLowerCase().includes(q))
    );
  }, [searchQuery, masterArticles]);

  // Deep-linking: Read ?article=:id from URL on load or back/forward navigation
  useEffect(() => {
    const checkUrlArticle = () => {
      const params = new URLSearchParams(window.location.search);
      const articleId = params.get('article');
      if (articleId) {
        const found = masterArticles.find((a) => a.id === articleId);
        if (found) {
          setSelectedArticle(found);
        }
      } else if (selectedArticle) {
        setSelectedArticle(null);
      }
    };

    checkUrlArticle();
    window.addEventListener('popstate', checkUrlArticle);
    return () => window.removeEventListener('popstate', checkUrlArticle);
  }, [masterArticles]);

  // Synchronize ?article=:id with browser history when selectedArticle changes
  const handleSelectArticle = useCallback((article: Article | null) => {
    setSelectedArticle(article);
    const url = new URL(window.location.href);
    if (article) {
      url.searchParams.set('article', article.id);
      window.history.pushState({ articleId: article.id }, '', url.toString());
    } else {
      url.searchParams.delete('article');
      window.history.pushState({}, '', url.toString());
    }
  }, []);

  // Dynamic breaking news list for ticker
  const dynamicBreakingNewsList = useMemo(() => {
    const breaking = masterArticles.filter((a) => a.isBreaking);
    if (breaking.length === 0) return undefined;
    return breaking.slice(0, 8).map((art, idx) => ({
      id: `${art.id}-${idx}`,
      title: art.isExternal ? `[${art.externalSource}] ${art.title}` : art.title,
      time: art.timeAgo,
      externalUrl: art.externalUrl,
    }));
  }, [masterArticles]);

  // Bookmarking helpers
  const isBookmarked = (articleId: string) => {
    return bookmarks.some((b) => b.id === articleId);
  };

  const toggleBookmark = (article: Article, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isBookmarked(article.id)) {
      setBookmarks((prev) => prev.filter((b) => b.id !== article.id));
    } else {
      setBookmarks((prev) => [article, ...prev]);
    }
  };

  const handleRemoveBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleClearAllBookmarks = () => {
    if (window.confirm('스크랩한 모든 기사를 삭제하시겠습니까?')) {
      setBookmarks([]);
    }
  };

  // Click on breaking news banner or headline -> Opens Article Detail
  const handleSelectBreakingTitle = (title: string, externalUrl?: string) => {
    const cleanTitle = title.replace(/^\[[^\]]+\]\s*/, '');
    const found = masterArticles.find(
      (a) => a.title.includes(cleanTitle) || a.title === title || a.isBreaking
    );
    if (found) {
      handleSelectArticle(found);
    } else if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Click on hot topic tag
  const handleSelectTopicTag = (tag: string) => {
    setSearchQuery(tag);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Callback when a user creates an in-house article
  const handleArticleCreated = (newArt: Article) => {
    setCustomArticles(getCustomArticles());
    handleSelectArticle(newArt);
  };

  // Related articles for the modal
  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return [];
    return masterArticles
      .filter((a) => a.id !== selectedArticle.id && a.category === selectedArticle.category)
      .slice(0, 2);
  }, [selectedArticle, masterArticles]);

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] ${
        textSize === 'large' ? 'text-lg' : 'text-base'
      }`}
    >
      {/* 1. Header with Utility Bar, Branding, and Category Navigation */}
      <Header
        currentCategory={currentCategory}
        onSelectCategory={(cat) => {
          setCurrentCategory(cat);
          setSearchQuery('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectTopicTag={handleSelectTopicTag}
        bookmarkCount={bookmarks.length}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        textSize={textSize}
        onToggleTextSize={() => setTextSize((prev) => (prev === 'large' ? 'normal' : 'large'))}
        onOpenEditor={() => setIsEditorOpen(true)}
        onOpenFeedStatus={() => setIsFeedStatusOpen(true)}
        onOpenAdminRss={() => setIsAdminRssOpen(true)}
      />

      {/* 2. Real-time Rolling Breaking News Bar */}
      <BreakingNewsBar
        items={dynamicBreakingNewsList}
        onSelectArticleTitle={handleSelectBreakingTitle}
      />

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Live News Automation & Status Bar */}
        <LiveNewsStatusBar
          lastUpdated={lastUpdated}
          nextRefreshSeconds={nextRefreshSeconds}
          isLoading={isLoadingExternal}
          onRefreshNow={() => loadExternalNews(true)}
          onOpenFeedStatus={() => setIsFeedStatusOpen(true)}
          onOpenAdminRss={() => setIsAdminRssOpen(true)}
          onOpenEditor={() => setIsEditorOpen(true)}
          feedFilter={feedFilter}
          onChangeFeedFilter={setFeedFilter}
          totalCount={masterArticles.length}
          inhouseCount={inhouseCount}
          externalCount={externalCount}
          isOnline={!externalError}
          errorMessage={externalError}
        />

        {/* Search Results View */}
        {searchQuery.trim() !== '' ? (
          <section className="mb-12">
            <div className="flex items-center justify-between pb-3 mb-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  '{searchQuery}' 검색 결과
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  총 {searchResults.length}건
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                검색 취소 <X className="w-4 h-4" />
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-slate-600 font-medium">
                  '{searchQuery}'에 대한 검색 결과가 없습니다.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  단어의 철자가 정확한지 확인하시거나, 다른 검색어로 다시 시도해보세요.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((art, idx) => (
                  <div
                    key={`${art.id}-${idx}`}
                    onClick={() => handleSelectArticle(art)}
                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                        <img
                          src={art.imageUrl}
                          alt={art.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          {art.isExternal ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-900/80 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> {art.externalSource}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-900/80 backdrop-blur-xs text-white text-[11px] font-semibold">
                              본지 자체 보도
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium">
                            {art.categoryName}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                          {art.title}
                          {art.isExternal && (
                            <ExternalLink className="inline-block w-3.5 h-3.5 ml-1 text-slate-400 group-hover:text-blue-600" />
                          )}
                        </h3>
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                          {art.summary}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 pt-0 text-xs text-slate-400 flex items-center justify-between border-t border-slate-100 mt-2 font-mono">
                      <span>
                        {art.isExternal ? art.externalSource : `${art.reporter.name} 기자`}
                      </span>
                      <span>{art.timeAgo}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Standard Category or Home View */
          <>
            {/* Top Stories Section on Home */}
            {currentCategory === 'all' && (
              <TopStoriesSection
                leadArticle={leadArticle}
                subLeadArticles={subLeadArticles}
                liveTimelineArticles={liveTimelineArticles}
                onSelectArticle={handleSelectArticle}
                isBookmarked={isBookmarked}
                onToggleBookmark={toggleBookmark}
              />
            )}

            {/* Split layout: Main content vs Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Main Stream (Col 1 to 8) */}
              <div className="lg:col-span-8">
                {/* Category Grid Section */}
                <CategoryGridSection
                  articles={categoryArticles}
                  currentCategory={currentCategory}
                  onSelectCategory={(cat) => {
                    setCurrentCategory(cat);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onSelectArticle={handleSelectArticle}
                  isBookmarked={isBookmarked}
                  onToggleBookmark={toggleBookmark}
                />

                {/* Opinion & Columns Section */}
                {currentCategory === 'all' && (
                  <OpinionSection
                    articles={masterArticles}
                    onSelectArticle={handleSelectArticle}
                  />
                )}

                {/* Newsletter Subscription Banner */}
                <NewsletterBanner />
              </div>

              {/* Right Sidebar (Col 9 to 12) */}
              <aside className="lg:col-span-4 space-y-6">
                {/* Most Viewed / Trending Top 10 */}
                <PopularNewsRanking
                  articles={masterArticles}
                  onSelectArticle={handleSelectArticle}
                />

                {/* Financial Indices & Weather Widget */}
                <MarketWeatherWidget />

                {/* Daily Public Opinion Poll */}
                <DailyPoll />
              </aside>
            </div>
          </>
        )}
      </main>

      {/* 4. Article Detail Modal Reader */}
      <ArticleModal
        article={selectedArticle}
        onClose={() => handleSelectArticle(null)}
        isBookmarked={selectedArticle ? isBookmarked(selectedArticle.id) : false}
        onToggleBookmark={() => selectedArticle && toggleBookmark(selectedArticle)}
        onSelectRelatedArticle={handleSelectArticle}
        relatedArticles={relatedArticles}
      />

      {/* 5. Bookmarks Slide-over Drawer */}
      <BookmarksDrawer
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarks={bookmarks}
        onSelectArticle={handleSelectArticle}
        onRemoveBookmark={handleRemoveBookmark}
        onClearAll={handleClearAllBookmarks}
      />

      {/* 6. Feed Health Status Modal (Requirement 11) */}
      <FeedStatusModal
        isOpen={isFeedStatusOpen}
        onClose={() => setIsFeedStatusOpen(false)}
        onRefreshComplete={() => loadExternalNews(true)}
      />

      {/* 7. In-House Article Editor & Publishing Modal (Requirement 7) */}
      <ArticleEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onArticleCreated={handleArticleCreated}
      />

      {/* 8. Admin RSS Management & URL Test Modal (Requirements 7, 8, 10) */}
      <AdminRssModal
        isOpen={isAdminRssOpen}
        onClose={() => setIsAdminRssOpen(false)}
        onArticlesUpdated={() => loadExternalNews(true)}
      />
    </div>
  );
}
