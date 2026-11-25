import React, { useState } from 'react';
import { Article, NewsCategory } from '../types';
import { Flame, TrendingDown, TrendingUp, ExternalLink } from 'lucide-react';

interface PopularNewsRankingProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

export const PopularNewsRanking: React.FC<PopularNewsRankingProps> = ({
  articles,
  onSelectArticle,
}) => {
  const [filterCat, setFilterCat] = useState<NewsCategory | 'all'>('all');

  const filteredArticles = (
    filterCat === 'all' ? articles : articles.filter((a) => a.category === filterCat)
  )
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

  // Mock rank changes for visual authenticity
  const rankChanges: Record<number, { type: 'up' | 'down' | 'same'; val?: number }> = {
    0: { type: 'same' },
    1: { type: 'up', val: 2 },
    2: { type: 'down', val: 1 },
    3: { type: 'up', val: 1 },
    4: { type: 'same' },
    5: { type: 'up', val: 3 },
    6: { type: 'down', val: 2 },
    7: { type: 'same' },
    8: { type: 'up', val: 1 },
    9: { type: 'down', val: 1 },
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-blue-600 fill-current" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            가장 많이 본 뉴스
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">1시간 집계</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-4 pb-2 border-b border-slate-100 overflow-x-auto no-scrollbar text-xs">
        {[
          { id: 'all', label: '전체' },
          { id: 'tech', label: 'IT·과학' },
          { id: 'economy', label: '경제' },
          { id: 'politics', label: '정치' },
          { id: 'society', label: '사회' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterCat(tab.id as any)}
            className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
              filterCat === tab.id
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ranked List */}
      <div className="space-y-2.5">
        {filteredArticles.map((art, idx) => {
          const change = rankChanges[idx] || { type: 'same' };
          const isTop3 = idx < 3;

          return (
            <div
              key={`${art.id}-${idx}`}
              onClick={() => onSelectArticle(art)}
              className="flex items-start gap-3 group cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors"
            >
              {/* Rank Number */}
              <div
                className={`w-6 h-6 flex-shrink-0 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                  isTop3
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {idx + 1}
              </div>

              {/* Title & info */}
              <div className="flex-1 min-w-0">
                {art.isExternal && art.externalUrl ? (
                  <a
                    href={art.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug block"
                    title="기사 제목 클릭 시 원문으로 이동"
                  >
                    {art.title}
                    <ExternalLink className="inline-block w-3 h-3 ml-1 text-slate-400 group-hover:text-blue-600" />
                  </a>
                ) : (
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
                    {art.title}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                  <span>{art.categoryName}</span>
                  {art.isExternal && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-600 font-medium">{art.externalSource}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>조회 {art.viewCount.toLocaleString()}</span>
                </div>
              </div>

              {/* Rank Change Indicator */}
              <div className="flex-shrink-0 text-[10px] font-mono flex items-center gap-0.5 pt-1">
                {change.type === 'up' && (
                  <span className="text-red-500 flex items-center font-bold">
                    <TrendingUp className="w-3 h-3" />
                    {change.val}
                  </span>
                )}
                {change.type === 'down' && (
                  <span className="text-blue-600 flex items-center font-bold">
                    <TrendingDown className="w-3 h-3" />
                    {change.val}
                  </span>
                )}
                {change.type === 'same' && (
                  <span className="text-slate-300 font-bold">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
