import React from 'react';
import { RefreshCw, Radio, Server, PenSquare, Filter, ExternalLink } from 'lucide-react';

interface LiveNewsStatusBarProps {
  lastUpdated: string;
  nextRefreshSeconds: number;
  isLoading: boolean;
  onRefreshNow: () => void;
  onOpenFeedStatus: () => void;
  onOpenAdminRss?: () => void;
  onOpenEditor: () => void;
  feedFilter: 'all' | 'inhouse' | 'external';
  onChangeFeedFilter: (filter: 'all' | 'inhouse' | 'external') => void;
  totalCount: number;
  inhouseCount: number;
  externalCount: number;
  isOnline: boolean;
  errorMessage?: string;
}

export const LiveNewsStatusBar: React.FC<LiveNewsStatusBarProps> = ({
  lastUpdated,
  nextRefreshSeconds,
  isLoading,
  onRefreshNow,
  onOpenFeedStatus,
  onOpenAdminRss,
  onOpenEditor,
  feedFilter,
  onChangeFeedFilter,
  totalCount,
  inhouseCount,
  externalCount,
  isOnline,
  errorMessage,
}) => {
  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}분 ${String(s).padStart(2, '0')}초`;
  };

  const formatLastUpdatedTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '방금 전';
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    } catch {
      return '방금 전';
    }
  };

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Top Banner Bar */}
      <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span>LIVE 연계</span>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="font-bold text-white">외부 언론사 뉴스 실시간 자동 연계</span>
            <span className="hidden md:inline text-slate-400">|</span>
            <span className="hidden md:inline text-slate-300 text-xs">
              조선일보 · 매일경제 · SBS 뉴스 · BBC 코리아 등 17개 언론사 피드 실시간 연계
            </span>
          </div>
        </div>

        {/* Right side controls: Timer & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 font-mono">
            <span>갱신: {formatLastUpdatedTime(lastUpdated)}</span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-300">다음 {formatSeconds(nextRefreshSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={onRefreshNow}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="외부 뉴스 즉시 새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>즉시 새로고침</span>
          </button>

          <button
            type="button"
            onClick={onOpenFeedStatus}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors cursor-pointer"
            title="실제 연계 피드 상태 확인"
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">피드 현황</span>
          </button>

          {onOpenAdminRss && (
            <button
              type="button"
              onClick={onOpenAdminRss}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors cursor-pointer"
              title="RSS 관리자 센터 (피드 추가/삭제/검증/로그)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>RSS 관리</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenEditor}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer"
            title="자체 기사 작성 및 송고"
          >
            <PenSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">기사 작성</span>
          </button>
        </div>
      </div>

      {/* Error / Warning Notice if any */}
      {errorMessage && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button
            onClick={onRefreshNow}
            className="font-semibold underline ml-2 hover:text-amber-950 cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Filter and Content Type Selector */}
      <div className="px-4 py-3 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">출처 분류:</span>

          <div className="inline-flex p-0.5 rounded-xl bg-slate-200/80 border border-slate-300/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => onChangeFeedFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                feedFilter === 'all'
                  ? 'bg-white text-blue-600 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              전체 기사 ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => onChangeFeedFilter('inhouse')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                feedFilter === 'inhouse'
                  ? 'bg-white text-blue-600 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              본지 자체 보도 ({inhouseCount})
            </button>
            <button
              type="button"
              onClick={() => onChangeFeedFilter('external')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                feedFilter === 'external'
                  ? 'bg-white text-blue-600 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              외부 연계 뉴스 ({externalCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
            본지 자체 기사 (전문 열람)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
            외부 연계 뉴스 (원문 직행)
          </span>
        </div>
      </div>
    </div>
  );
};
