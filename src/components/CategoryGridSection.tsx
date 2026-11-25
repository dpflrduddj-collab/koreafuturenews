import React, { useState } from 'react';
import { Article, NewsCategory } from '../types';
import { Bookmark, ChevronRight, Eye, LayoutGrid, List, MessageSquare, ExternalLink, Sparkles } from 'lucide-react';

interface CategoryGridSectionProps {
  articles: Article[];
  currentCategory: NewsCategory;
  onSelectCategory: (cat: NewsCategory) => void;
  onSelectArticle: (article: Article) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (art: Article, e: React.MouseEvent) => void;
}

export const CategoryGridSection: React.FC<CategoryGridSectionProps> = ({
  articles,
  currentCategory,
  onSelectCategory,
  onSelectArticle,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  // If a specific category is active (not 'all')
  if (currentCategory !== 'all') {
    const filtered = articles
      .filter((a) => (currentCategory === 'breaking' ? a.isBreaking : a.category === currentCategory))
      .sort((a, b) => {
        if (sortBy === 'popular') return b.viewCount - a.viewCount;
        return 0; // default order is already sorted by latest
      });

    return (
      <section className="mb-12">
        {/* Category Header & Controls */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {filtered[0]?.categoryName || '뉴스'}
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              총 {filtered.length}건의 기사
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Sort Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/60">
              <button
                type="button"
                onClick={() => setSortBy('latest')}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  sortBy === 'latest'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                최신순
              </button>
              <button
                type="button"
                onClick={() => setSortBy('popular')}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  sortBy === 'popular'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                인기순
              </button>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={`p-1.5 rounded-full cursor-pointer ${
                  viewLayout === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="카드형 보기"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('list')}
                className={`p-1.5 rounded-full cursor-pointer ${
                  viewLayout === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="목록형 보기"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400">
            해당 카테고리의 최신 뉴스를 수집 중이거나 준비 중입니다.
          </div>
        ) : viewLayout === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((art, idx) => (
              <div
                key={`${art.id}-${idx}`}
                onClick={() => onSelectArticle(art)}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between p-5"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100 mb-4">
                    <img
                      src={art.imageUrl}
                      alt={art.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                      {(art.isAiGenerated || art.aiDraft) && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                          <Sparkles className="w-2.5 h-2.5" /> AI 데스크
                        </span>
                      )}
                      {art.isExternal ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-900/80 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                          <ExternalLink className="w-2.5 h-2.5" /> {art.externalSource}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-900/80 backdrop-blur-xs text-white text-[10px] font-bold">
                          본지 자체 보도
                        </span>
                      )}
                      {art.isBreaking && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                          속보
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => onToggleBookmark(art, e)}
                      className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                        isBookmarked(art.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/80 hover:bg-white text-slate-700'
                      }`}
                      title="스크랩"
                    >
                      <Bookmark className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  <div>
                    {art.isExternal && art.externalUrl ? (
                      <a
                        href={art.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2 block"
                        title="기사 제목 클릭 시 원문으로 이동"
                      >
                        {art.title}
                        <ExternalLink className="inline-block w-3.5 h-3.5 ml-1 text-slate-400 group-hover:text-blue-600" />
                      </a>
                    ) : (
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                        {art.title}
                      </h3>
                    )}

                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {art.summary}
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 mt-4">
                  <span className="font-medium text-slate-600">
                    {art.isExternal ? `${art.externalSource} 연계` : `${art.reporter.name} 기자`}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span>{art.timeAgo}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Eye className="w-3 h-3" />
                      {art.viewCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100 shadow-xs overflow-hidden">
            {filtered.map((art, idx) => (
              <div
                key={`${art.id}-${idx}`}
                onClick={() => onSelectArticle(art)}
                className="p-5 flex flex-col sm:flex-row gap-5 items-start justify-between hover:bg-slate-50/70 cursor-pointer group transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400 font-mono">
                    {art.isExternal ? (
                      <span className="text-indigo-600 font-bold flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {art.externalSource}
                      </span>
                    ) : (
                      <span className="text-blue-600 font-bold">본지 자체 보도</span>
                    )}
                    <span>•</span>
                    <span className="text-slate-600 font-semibold">{art.categoryName}</span>
                    <span>•</span>
                    <span>{art.timeAgo}</span>
                  </div>

                  {art.isExternal && art.externalUrl ? (
                    <a
                      href={art.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors block"
                      title="기사 제목 클릭 시 원문으로 이동"
                    >
                      {art.title}
                      <ExternalLink className="inline-block w-3.5 h-3.5 ml-1 text-slate-400" />
                    </a>
                  ) : (
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {art.title}
                    </h3>
                  )}

                  <p className="text-xs sm:text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {art.summary}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-400 font-mono">
                    <span className="text-slate-600">
                      {art.isExternal ? art.externalSource : `${art.reporter.name} 기자`}
                    </span>
                    <span>조회 {art.viewCount.toLocaleString()}</span>
                    <span>댓글 {art.commentCount}</span>
                  </div>
                </div>

                <div className="w-full sm:w-44 aspect-[16/10] sm:aspect-[16/11] rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  // Home 'all' view: Multi-category Bento sections for the 11 user categories
  const politicsArticles = articles.filter((a) => a.category === 'politics');
  const economyArticles = articles.filter((a) => a.category === 'economy');
  const industryArticles = articles.filter((a) => a.category === 'industry');
  const societyArticles = articles.filter((a) => a.category === 'society');
  const worldArticles = articles.filter((a) => a.category === 'world');
  const northKoreaArticles = articles.filter((a) => a.category === 'northkorea');
  const defenseArticles = articles.filter((a) => a.category === 'defense');
  const kpopArticles = articles.filter((a) => a.category === 'kpop');
  const cultureArticles = articles.filter((a) => a.category === 'culture');
  const techArticles = articles.filter((a) => a.category === 'tech');
  const sportsArticles = articles.filter((a) => a.category === 'sports');

  const renderSectionCard = (
    title: string,
    categoryKey: NewsCategory,
    categoryList: Article[]
  ) => {
    if (categoryList.length === 0) return null;
    const [featured, ...others] = categoryList;

    return (
      <div key={categoryKey} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          {/* Section title */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
              {title}
            </h3>
            <button
              type="button"
              onClick={() => onSelectCategory(categoryKey)}
              className="text-xs text-slate-400 hover:text-blue-600 font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              더보기 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Featured article */}
          {featured && (
            <div
              onClick={() => onSelectArticle(featured)}
              className="cursor-pointer group mb-4 pb-4 border-b border-slate-100"
            >
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 mb-3">
                <img
                  src={featured.imageUrl}
                  alt={featured.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  {(featured.isAiGenerated || featured.aiDraft) && (
                    <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center gap-0.5 shadow-xs">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                  {featured.isExternal ? (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-900/80 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-0.5">
                      <ExternalLink className="w-2.5 h-2.5" /> {featured.externalSource}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-blue-900/80 backdrop-blur-xs text-white text-[9px] font-bold">
                      본지 자체 보도
                    </span>
                  )}
                </div>
              </div>

              <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                {featured.title}
              </h4>

              <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                {featured.summary}
              </p>
            </div>
          )}

          {/* Sub-articles list */}
          <div className="space-y-2.5">
            {others.slice(0, 3).map((art, idx) => (
              <div
                key={`${art.id}-${idx}`}
                onClick={() => onSelectArticle(art)}
                className="cursor-pointer group flex items-start justify-between gap-2.5 text-xs p-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-1 flex items-center gap-1">
                    <span>• {art.title}</span>
                    {(art.isAiGenerated || art.aiDraft) && (
                      <span className="text-[9px] text-violet-600 font-bold bg-violet-50 px-1 py-0.2 rounded-sm shrink-0">
                        AI
                      </span>
                    )}
                  </p>
                  {art.isExternal && (
                    <span className="text-[10px] text-indigo-500 font-mono ml-2">
                      [{art.externalSource}]
                    </span>
                  )}
                </div>
                <span className="text-slate-400 font-mono flex-shrink-0 text-[11px]">{art.timeAgo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="category-sections" className="mb-12">
      <div className="flex items-center justify-between pb-3 mb-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            분야별 주요 뉴스 (11대 카테고리)
          </h2>
          <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">CATEGORIES</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderSectionCard('정치', 'politics', politicsArticles)}
        {renderSectionCard('경제', 'economy', economyArticles)}
        {renderSectionCard('산업·기업', 'industry', industryArticles)}
        {renderSectionCard('사회', 'society', societyArticles)}
        {renderSectionCard('국제', 'world', worldArticles)}
        {renderSectionCard('북한', 'northkorea', northKoreaArticles)}
        {renderSectionCard('국방·안보', 'defense', defenseArticles)}
        {renderSectionCard('연예·K-POP', 'kpop', kpopArticles)}
        {renderSectionCard('문화', 'culture', cultureArticles)}
        {renderSectionCard('과학·IT', 'tech', techArticles)}
        {renderSectionCard('스포츠', 'sports', sportsArticles)}
      </div>
    </section>
  );
};
