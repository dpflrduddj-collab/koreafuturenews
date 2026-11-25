import React from 'react';
import { Article } from '../types';
import { Bookmark, Clock, Eye, MessageSquare, Share2, Sparkles, ExternalLink } from 'lucide-react';

interface TopStoriesSectionProps {
  leadArticle: Article;
  subLeadArticles: Article[];
  liveTimelineArticles: Article[];
  onSelectArticle: (article: Article) => void;
  isBookmarked: (articleId: string) => boolean;
  onToggleBookmark: (article: Article, e: React.MouseEvent) => void;
}

export const TopStoriesSection: React.FC<TopStoriesSectionProps> = ({
  leadArticle,
  subLeadArticles,
  liveTimelineArticles,
  onSelectArticle,
  isBookmarked,
  onToggleBookmark,
}) => {
  return (
    <section id="top-stories-section" className="mb-10">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            주요 뉴스
          </h2>
          <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">TOP STORIES</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          실시간 갱신 중
        </div>
      </div>

      {/* Grid: 3 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 1. Main Lead Story (Col 1 to 6) with Sleek Gradient Overlay */}
        <div
          id="lead-story-card"
          onClick={() => onSelectArticle(leadArticle)}
          className="lg:col-span-6 relative min-h-[380px] sm:min-h-[420px] rounded-2xl overflow-hidden shadow-lg group cursor-pointer flex flex-col justify-end bg-slate-900"
        >
          {/* Background image & gradient overlay */}
          <img
            src={leadArticle.imageUrl}
            alt={leadArticle.title}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent z-10" />

          {/* Top badges & scrap button */}
          <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm tracking-wider uppercase">
              TOP STORY
            </span>
            {(leadArticle.isAiGenerated || leadArticle.aiDraft) && (
              <span className="bg-violet-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI 데스크
              </span>
            )}
            {leadArticle.isExternal ? (
              <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm tracking-wider flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> {leadArticle.externalSource} 연계
              </span>
            ) : (
              <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm tracking-wider">
                본지 자체 보도
              </span>
            )}
            {leadArticle.isExclusive && (
              <span className="bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm tracking-wider">
                단독
              </span>
            )}
            {leadArticle.isBreaking && (
              <span className="bg-amber-400 text-slate-950 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                속보
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => onToggleBookmark(leadArticle, e)}
            className={`absolute top-4 right-4 z-20 p-2.5 rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer ${
              isBookmarked(leadArticle.id)
                ? 'bg-blue-600 text-white'
                : 'bg-white/30 hover:bg-white text-white hover:text-slate-900'
            }`}
            title={isBookmarked(leadArticle.id) ? '스크랩 취소' : '스크랩하기'}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>

          {/* Text Content Overlay */}
          <div className="relative p-6 sm:p-8 z-20 w-full">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-2">
              {leadArticle.categoryName}
            </span>
            <h3
              onClick={(e) => {
                if (leadArticle.isExternal && leadArticle.externalUrl) {
                  e.stopPropagation();
                  window.open(leadArticle.externalUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2 group-hover:text-blue-200 transition-colors"
            >
              {leadArticle.title}
              {leadArticle.isExternal && (
                <ExternalLink className="inline-block w-4 h-4 ml-2 text-indigo-300" />
              )}
            </h3>
            {leadArticle.subtitle && (
              <p className="text-sm font-medium text-slate-300 mb-3 line-clamp-1">
                {leadArticle.subtitle}
              </p>
            )}
            <p className="text-slate-300 text-sm sm:text-base line-clamp-2 max-w-2xl leading-relaxed mb-4">
              {leadArticle.summary}
            </p>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-300">
                  {leadArticle.isExternal ? leadArticle.externalSource : `${leadArticle.reporter.name} 기자`}
                </span>
                <span>•</span>
                <span className="font-mono">{leadArticle.timeAgo}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {leadArticle.viewCount.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {leadArticle.commentCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Sub-Lead Stories (Col 7 to 9) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {subLeadArticles.map((art, idx) => (
            <div
              key={`${art.id}-${idx}`}
              onClick={() => onSelectArticle(art)}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      {art.categoryName}
                    </span>
                    {(art.isAiGenerated || art.aiDraft) && (
                      <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                    {art.isExternal ? (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <ExternalLink className="w-2.5 h-2.5" /> {art.externalSource}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        자체보도
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => onToggleBookmark(art, e)}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      isBookmarked(art.id)
                        ? 'text-blue-600'
                        : 'text-slate-300 hover:text-slate-600'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>

                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-100 mb-3">
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                  />
                </div>

                <h4
                  onClick={(e) => {
                    if (art.isExternal && art.externalUrl) {
                      e.stopPropagation();
                      window.open(art.externalUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2 mb-2"
                >
                  {art.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {art.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-600">
                  {art.isExternal ? art.externalSource : `${art.reporter.name} 기자`}
                </span>
                <span className="font-mono">{art.timeAgo}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 3. Live News Feed Timeline (Col 10 to 12) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center shrink-0">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              실시간 속보 타임라인
            </h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
              LIVE
            </span>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3.5 overflow-y-auto max-h-[440px]">
            {liveTimelineArticles.map((art, idx) => (
              <div
                key={`${art.id}-${idx}`}
                onClick={() => {
                  if (art.isExternal && art.externalUrl) {
                    window.open(art.externalUrl, '_blank', 'noopener,noreferrer');
                  } else {
                    onSelectArticle(art);
                  }
                }}
                className="flex gap-3 group cursor-pointer p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                title={art.isExternal ? '클릭 시 원문 기사로 이동' : undefined}
              >
                <span className="text-xs font-bold text-blue-600 shrink-0 font-mono mt-0.5">
                  {art.timeAgo}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-slate-700 font-medium group-hover:text-blue-600 leading-snug line-clamp-2 transition-colors">
                    {art.title}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {art.categoryName} • {art.isExternal ? art.externalSource : art.reporter.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/40 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              15분 주기 자동 실시간 동기화 (오류 백오프 관리)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
