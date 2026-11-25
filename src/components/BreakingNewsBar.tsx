import React, { useState, useEffect } from 'react';
import { BREAKING_NEWS_LIST } from '../data/newsData';
import { ChevronLeft, ChevronRight, Pause, Play, Zap } from 'lucide-react';

interface BreakingNewsItem {
  id: string;
  title: string;
  time: string;
  externalUrl?: string;
}

interface BreakingNewsBarProps {
  items?: BreakingNewsItem[];
  onSelectArticleTitle?: (title: string, externalUrl?: string) => void;
}

export const BreakingNewsBar: React.FC<BreakingNewsBarProps> = ({ items, onSelectArticleTitle }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeList = items && items.length > 0 ? items : BREAKING_NEWS_LIST;

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeList.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, activeList.length]);

  const currentItem = activeList[currentIndex] || activeList[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? activeList.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeList.length);
  };

  return (
    <div
      id="breaking-news-bar"
      className="bg-[#0F172A] text-slate-100 text-sm border-b border-slate-800 shadow-2xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Left Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold tracking-wider uppercase">
            <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
            속보
          </span>
          <span className="hidden sm:inline text-xs text-slate-400 font-medium">
            LIVE UPDATES
          </span>
        </div>

        {/* Rolling Text */}
        <div
          className="flex-1 overflow-hidden cursor-pointer"
          onClick={() => {
            if (currentItem.externalUrl) {
              window.open(currentItem.externalUrl, '_blank', 'noopener,noreferrer');
            } else {
              onSelectArticleTitle?.(currentItem.title, currentItem.externalUrl);
            }
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          title={currentItem.externalUrl ? '클릭 시 해당 언론사 원문 속보로 이동' : '클릭하여 관련 기사 보기'}
        >
          <div className="flex items-center gap-3 truncate transition-all duration-300">
            <span className="text-xs text-blue-300 font-semibold bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800/50 font-mono">
              {currentItem.time}
            </span>
            <p className="truncate text-slate-200 hover:text-white transition-colors font-medium">
              {currentItem.title}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0 text-slate-400">
          <span className="text-xs font-mono hidden md:inline mr-2 text-slate-400">
            {currentIndex + 1} / {BREAKING_NEWS_LIST.length}
          </span>
          <button
            type="button"
            id="btn-breaking-prev"
            onClick={handlePrev}
            className="p-1.5 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="이전 속보"
            aria-label="이전 속보"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="btn-breaking-pause"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title={isPaused ? '자동재생' : '일시정지'}
            aria-label={isPaused ? '자동재생' : '일시정지'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            id="btn-breaking-next"
            onClick={handleNext}
            className="p-1.5 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="다음 속보"
            aria-label="다음 속보"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
