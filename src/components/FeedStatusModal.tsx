import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Activity, ShieldCheck } from 'lucide-react';
import { FeedStatus } from '../types';
import { fetchFeedStatus, triggerManualRefresh } from '../services/newsService';

interface FeedStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshComplete?: () => void;
}

export const FeedStatusModal: React.FC<FeedStatusModalProps> = ({
  isOpen,
  onClose,
  onRefreshComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedData, setFeedData] = useState<{
    lastUpdated: string;
    totalFeeds: number;
    onlineFeeds: number;
    feeds: FeedStatus[];
  } | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    const data = await fetchFeedStatus();
    if (data) {
      setFeedData(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const handleManualRefreshAll = async () => {
    setRefreshing(true);
    await triggerManualRefresh();
    await loadStatus();
    setRefreshing(false);
    if (onRefreshComplete) onRefreshComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                실제 뉴스 연계 제공자 & 피드 상태 모니터
              </h3>
              <p className="text-xs text-slate-500">
                외부 언론사 RSS / API 실시간 연결 검증 및 데이터 수집 현황
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-white border-b border-slate-100 text-center">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-xs text-emerald-600 font-medium block">연결 정상 피드</span>
            <span className="text-xl font-black text-emerald-700">
              {feedData ? `${feedData.onlineFeeds} / ${feedData.totalFeeds}` : '-'}
            </span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-xs text-blue-600 font-medium block">자동 갱신 주기</span>
            <span className="text-xl font-black text-blue-700">15분</span>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
            <span className="text-xs text-purple-600 font-medium block">수집 준수 원칙</span>
            <span className="text-xs font-bold text-purple-800 flex items-center justify-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 원문 링크 직행
            </span>
          </div>
        </div>

        {/* Feed List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {loading && !feedData ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <span>피드 연결 상태를 실시간 확인하고 있습니다...</span>
            </div>
          ) : feedData && feedData.feeds && feedData.feeds.length > 0 ? (
            feedData.feeds.map((feed, idx) => (
              <div
                key={`${feed.id}-${idx}`}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{feed.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-semibold">
                      {feed.category}
                    </span>
                    {feed.status === 'online' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> 연결 정상
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        <AlertCircle className="w-3 h-3" /> 점검 중
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono truncate">
                    <span className="truncate">{feed.url}</span>
                    <a
                      href={feed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 shrink-0 inline-flex items-center"
                      title="원문 피드 열기"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-slate-700 block">
                    {feed.articleCount}개 기사 수집됨
                  </span>
                  {feed.latencyMs !== undefined && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      지연시간 {feed.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">
              확인된 외부 피드 데이터가 없습니다. 아래 버튼으로 새로고침해주세요.
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed mt-4">
            <p className="font-bold mb-0.5">※ 외부 뉴스 연계 정책 준수 안내</p>
            <p>
              • 외부 언론사 기사는 제목, 언론사명, 발행일시, 썸네일, 요약문만을 제공하며, 기사
              제목이나 카드를 클릭 시 해당 언론사의 공식 원문 페이지로 직접 연결됩니다.
            </p>
            <p className="mt-1">
              • 뉴스 제공자의 RSS 이용 약관 및 정책을 준수하여 5~10분 주기로 안전하게 캐싱되어 갱신됩니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleManualRefreshAll}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? '전체 피드 갱신 중...' : '전체 피드 즉시 재검증'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
