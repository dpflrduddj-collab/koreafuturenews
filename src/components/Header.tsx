import React, { useState } from 'react';
import { CATEGORIES, HOT_TOPICS, MARKET_INDICES, WEATHER_DATA } from '../data/newsData';
import { NewsCategory } from '../types';
import {
  Bookmark,
  Calendar,
  CloudSun,
  Search,
  SlidersHorizontal,
  TrendingUp,
  X,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  currentCategory: NewsCategory;
  onSelectCategory: (cat: NewsCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectTopicTag: (tag: string) => void;
  bookmarkCount: number;
  onOpenBookmarks: () => void;
  textSize: 'normal' | 'large';
  onToggleTextSize: () => void;
  onOpenEditor?: () => void;
  onOpenFeedStatus?: () => void;
  onOpenAdminRss?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSelectTopicTag,
  bookmarkCount,
  onOpenBookmarks,
  textSize,
  onToggleTextSize,
  onOpenEditor,
  onOpenFeedStatus,
  onOpenAdminRss,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Formatted date
  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[today.getDay()];
  const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${dayName}요일`;

  return (
    <header id="main-header" className="bg-white border-b border-slate-200 shadow-xs">
      {/* 1. Top Utility Bar */}
      <div className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xs py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Date & Weather */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">{dateString}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-600 pl-3 border-l border-slate-200">
              <CloudSun className="w-3.5 h-3.5 text-amber-500" />
              <span>서울 {WEATHER_DATA[0].temp}°C {WEATHER_DATA[0].condition}</span>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full">
                미세 {WEATHER_DATA[0].dust}
              </span>
            </div>
          </div>

          {/* Center: Mini Market Ticker (Desktop) */}
          <div className="hidden lg:flex items-center gap-4 text-[11px]">
            {MARKET_INDICES.slice(0, 3).map((idx) => (
              <div key={idx.name} className="flex items-center gap-1">
                <span className="text-slate-400 font-medium">{idx.name}</span>
                <span className="font-semibold text-slate-800 font-mono">{idx.value}</span>
                <span
                  className={`font-semibold ${
                    idx.isUp ? 'text-red-500' : 'text-blue-600'
                  }`}
                >
                  {idx.changePercent}
                </span>
              </div>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 ml-auto sm:ml-0">
            {/* RSS & AI Editorial Desk Admin Console Button */}
            {onOpenAdminRss && (
              <button
                type="button"
                onClick={onOpenAdminRss}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-700 to-violet-700 hover:from-blue-800 hover:to-violet-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="기사 검토, Gemini AI 요약 초안 작성 및 RSS 피드 관리"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>AI 데스크·관리</span>
              </button>
            )}

            {/* Feed Status Monitor */}
            {onOpenFeedStatus && (
              <button
                type="button"
                onClick={onOpenFeedStatus}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                title="외부 언론사 피드 연계 상태 확인"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>피드 현황</span>
              </button>
            )}

            {/* In-house Article Writer */}
            {onOpenEditor && (
              <button
                type="button"
                onClick={onOpenEditor}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                title="본지 자체 기사 작성 및 송고"
              >
                <span>✏️ 기사 작성</span>
              </button>
            )}

            {/* Font Size Toggle */}
            <button
              type="button"
              id="btn-toggle-font-size"
              onClick={onToggleTextSize}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-medium transition-colors shadow-2xs"
              title="글자 크기 변경"
            >
              <span className="font-serif-kr text-[11px]">가</span>
              <span className="text-[10px] text-slate-400">
                {textSize === 'large' ? '큰글씨' : '보통'}
              </span>
            </button>

            {/* Bookmarks */}
            <button
              type="button"
              id="btn-open-bookmarks"
              onClick={onOpenBookmarks}
              className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 font-medium transition-colors relative text-xs"
            >
              <Bookmark className="w-3.5 h-3.5 text-slate-500" />
              <span>스크랩함</span>
              {bookmarkCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                  {bookmarkCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Brand / Masthead Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-4">
          {/* Mobile menu trigger */}
          <button
            type="button"
            id="btn-mobile-menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl"
            aria-label="메뉴 열기"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Masthead Logo */}
          <div className="text-center md:text-left flex-1 md:flex-none">
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="inline-flex flex-col items-center md:items-start group text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 group-hover:text-blue-700 transition-colors">
                  한국 미래 뉴스
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 tracking-wider">
                  미래창조신문
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5 hidden sm:block">
                스마트하고 신속한 실시간 대한민국 미래 종합 저널
              </span>
            </button>
          </div>

          {/* Search Box with Sleek Pill Design */}
          <div className="relative hidden md:block w-72 lg:w-96">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                id="input-news-search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="검색어를 입력하세요..."
                className="w-full pl-10 pr-9 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 border border-transparent focus:border-blue-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right badges */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="text-right pr-3 border-r border-slate-200">
              <div className="text-[11px] text-slate-400 font-medium">LIVE NEWSROOM</div>
              <div className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                실시간 24시 가동
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTopicTag('#인공지능기본법')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200/60 hover:border-blue-200 transition-colors shadow-2xs"
            >
              오늘의 쟁점
            </button>
          </div>

          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setShowSearchInput(!showSearchInput)}
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl"
            aria-label="검색 열기"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile search bar dropdown */}
        {showSearchInput && (
          <div className="mt-3 md:hidden">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="검색어를 입력하세요..."
                className="w-full pl-10 pr-9 py-2 bg-slate-100 text-sm border border-transparent focus:border-blue-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Category Navigation Bar (Sticky) */}
      <nav
        id="category-nav"
        className="border-t border-slate-200 bg-white sticky top-0 z-20 shadow-xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
              {CATEGORIES.map((cat) => {
                const isActive = currentCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    id={`nav-cat-${cat.id}`}
                    onClick={() => {
                      onSelectCategory(cat.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`whitespace-nowrap px-3.5 py-3.5 text-sm font-semibold transition-all relative ${
                      isActive
                        ? 'text-blue-600 font-bold'
                        : 'text-slate-600 hover:text-blue-600'
                    }`}
                  >
                    {cat.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* 4. Trending Topics Sub-bar */}
      <div className="bg-slate-50/60 border-t border-b border-slate-200/80 py-2.5 px-4 sm:px-6 lg:px-8 text-xs">
        <div className="max-w-7xl mx-auto flex items-center gap-3 overflow-x-auto no-scrollbar">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            실시간 이슈
          </span>
          <div className="flex items-center gap-2 flex-nowrap">
            {HOT_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => onSelectTopicTag(topic.replace('#', ''))}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 font-medium transition-all shadow-2xs"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
