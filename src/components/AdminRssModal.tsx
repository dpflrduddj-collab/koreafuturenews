import React, { useState, useEffect, useCallback } from 'react';
import {
  AdminFeedTestResult,
  FeedErrorLog,
  NewsCategory,
  RssDatabaseStats,
  RssFeedConfig,
} from '../types';
import {
  adminLogin,
  clearAdminErrors,
  clearAdminToken,
  deleteAdminFeed,
  fetchAdminErrors,
  fetchAdminFeeds,
  fetchAdminStats,
  getSavedAdminToken,
  testFeedUrl,
  toggleAdminFeed,
  triggerAdminCollectNow,
  addAdminFeed,
} from '../services/newsService';
import { CATEGORIES } from '../data/newsData';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Flame,
  Globe,
  Key,
  Layers,
  Lock,
  LogOut,
  Plus,
  Power,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { AdminEditorialDesk } from './AdminEditorialDesk';

interface AdminRssModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshParent: () => void;
}

export const AdminRssModal: React.FC<AdminRssModalProps> = ({
  isOpen,
  onClose,
  onRefreshParent,
}) => {
  const [adminToken, setAdminToken] = useState<string | null>(() => getSavedAdminToken());
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [activeTab, setActiveTab] = useState<'editorial' | 'feeds' | 'add' | 'logs' | 'db'>('editorial');
  const [feeds, setFeeds] = useState<RssFeedConfig[]>([]);
  const [stats, setStats] = useState<RssDatabaseStats | null>(null);
  const [errorLogs, setErrorLogs] = useState<FeedErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Feed Form State
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<NewsCategory>('politics');
  const [newInterval, setNewInterval] = useState<number>(15);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<AdminFeedTestResult | null>(null);
  const [isSubmittingFeed, setIsSubmittingFeed] = useState(false);

  // Trigger loading admin data
  const loadAdminData = useCallback(async (token: string) => {
    setIsLoading(true);
    const [feedsRes, statsRes, errRes] = await Promise.all([
      fetchAdminFeeds(token),
      fetchAdminStats(token),
      fetchAdminErrors(token),
    ]);

    if (feedsRes.success && feedsRes.feeds) {
      setFeeds(feedsRes.feeds);
    } else if (feedsRes.error?.includes('인증')) {
      clearAdminToken();
      setAdminToken(null);
      setAuthError('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
    }

    if (statsRes.success && statsRes.stats) {
      setStats(statsRes.stats);
    }
    if (errRes.success && errRes.errors) {
      setErrorLogs(errRes.errors);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && adminToken) {
      loadAdminData(adminToken);
    }
  }, [isOpen, adminToken, loadAdminData]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    setIsAuthenticating(true);
    setAuthError(null);

    const res = await adminLogin(inputKey.trim());
    setIsAuthenticating(false);

    if (res.success && res.token) {
      setAdminToken(res.token);
      setInputKey('');
      loadAdminData(res.token);
    } else {
      setAuthError(res.error || '인증에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    setAdminToken(null);
    setFeeds([]);
    setStats(null);
  };

  // Run URL connection test
  const handleTestUrl = async () => {
    if (!newUrl.trim()) return;
    setIsTestingUrl(true);
    setTestResult(null);

    const res = await testFeedUrl(newUrl.trim());
    setIsTestingUrl(false);
    setTestResult(res);

    if (res.success && res.title && !newName) {
      setNewName(res.title);
    }
  };

  // Add new feed
  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    if (!newUrl.trim() || !newName.trim()) {
      setActionMessage({ type: 'error', text: '피드 이름과 RSS URL을 입력해 주세요.' });
      return;
    }

    setIsSubmittingFeed(true);
    const res = await addAdminFeed(
      {
        name: newName.trim(),
        url: newUrl.trim(),
        defaultCategory: newCategory,
        intervalMinutes: newInterval,
      },
      adminToken
    );
    setIsSubmittingFeed(false);

    if (res.success) {
      setActionMessage({ type: 'success', text: `새 피드 [${newName}]가 등록되었습니다.` });
      setNewUrl('');
      setNewName('');
      setTestResult(null);
      loadAdminData(adminToken);
      onRefreshParent();
      setActiveTab('feeds');
    } else {
      setActionMessage({ type: 'error', text: res.error || '피드 등록에 실패했습니다.' });
    }
  };

  // Toggle Feed Enable / Disable
  const handleToggleFeed = async (feedId: string) => {
    if (!adminToken) return;
    const res = await toggleAdminFeed(feedId, adminToken);
    if (res.success) {
      setFeeds((prev) =>
        prev.map((f) => (f.id === feedId ? { ...f, enabled: res.enabled ?? !f.enabled } : f))
      );
      setActionMessage({
        type: 'success',
        text: `피드 상태가 ${res.enabled ? '활성화' : '비활성화'}되었습니다.`,
      });
      onRefreshParent();
    }
  };

  // Delete Feed
  const handleDeleteFeed = async (feedId: string, feedName: string) => {
    if (!adminToken) return;
    if (!window.confirm(`[${feedName}] 피드를 삭제하시겠습니까?`)) return;

    const res = await deleteAdminFeed(feedId, adminToken);
    if (res.success) {
      setFeeds((prev) => prev.filter((f) => f.id !== feedId));
      setActionMessage({ type: 'success', text: `피드가 삭제되었습니다.` });
      onRefreshParent();
    }
  };

  // Trigger Immediate Full Collection
  const handleTriggerCollect = async (feedId?: string) => {
    if (!adminToken) return;
    setIsLoading(true);
    setActionMessage({ type: 'success', text: '서버에서 실시간 RSS 수집 작업을 시작했습니다...' });
    const res = await triggerAdminCollectNow(adminToken, feedId);
    setIsLoading(false);

    if (res.success) {
      setActionMessage({ type: 'success', text: '수집 작업이 완료되었습니다! 기사 풀이 갱신되었습니다.' });
      loadAdminData(adminToken);
      onRefreshParent();
    } else {
      setActionMessage({ type: 'error', text: res.error || '수집 실행 중 오류가 발생했습니다.' });
    }
  };

  // Clear Error Logs
  const handleClearErrors = async () => {
    if (!adminToken) return;
    const res = await clearAdminErrors(adminToken);
    if (res.success) {
      setErrorLogs([]);
      setActionMessage({ type: 'success', text: '오류 내역 로그가 정리되었습니다.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">한국 미래 뉴스 RSS 자동 연계 통합 관리 센터</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                  SERVER AUTHORITATIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                국내외 언론사 공개 RSS 자동 수집, 중복 방지, 15분 주기 자동 갱신 및 백오프 관리
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {adminToken && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
                title="관리자 로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>로그아웃</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action notification banner */}
        {actionMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between transition-all ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-red-50 text-red-800 border-b border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="hover:underline opacity-80 cursor-pointer"
            >
              닫기
            </button>
          </div>
        )}

        {/* If Not Authenticated -> Login Form */}
        {!adminToken ? (
          <div className="p-8 sm:p-12 max-w-md mx-auto flex-1 flex flex-col justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center mb-5 shadow-sm">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">관리자 권한 확인</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              RSS 피드 추가, 수정, 비활성화 및 수집 엔진 제어는 서버 측 보안 정책에 따라 인증된 관리자만
              접근할 수 있습니다.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="관리자 인증 키를 입력하세요"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="text-xs text-red-600 font-medium flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 text-left">
                <span className="font-bold text-slate-800">💡 데모 관리자 키 안내:</span>
                <p className="mt-0.5">
                  테스트를 위한 기본 설정 키는 <code className="font-mono font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">admin2026</code> 입니다.
                </p>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating || !inputKey.trim()}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                {isAuthenticating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>관리자 콘솔 접속</span>
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Dashboard */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Top Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:px-6 bg-slate-50 border-b border-slate-200 text-slate-700 shrink-0">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">누적 저장 기사</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-bold text-blue-600 font-mono">
                    {stats?.totalArticles.toLocaleString() || feeds.reduce((acc, f) => acc + (f.articleCount || 0), 0)}
                  </span>
                  <span className="text-xs text-slate-400">건 (중복제거)</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">활성 RSS 피드</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-bold text-emerald-600 font-mono">
                    {feeds.filter((f) => f.enabled).length}
                  </span>
                  <span className="text-xs text-slate-400">/ {feeds.length}개</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">자동 수집 주기</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-bold text-indigo-600 font-mono">15</span>
                  <span className="text-xs text-slate-400">분 (백오프 가변)</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">오류 기록</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span
                      className={`text-xl font-bold font-mono ${
                        errorLogs.length > 0 ? 'text-amber-600' : 'text-slate-600'
                      }`}
                    >
                      {errorLogs.length}
                    </span>
                    <span className="text-xs text-slate-400">건</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTriggerCollect()}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="서버의 모든 활성 RSS를 지금 즉시 수집합니다."
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">즉시 수집</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center px-6 border-b border-slate-200 bg-white gap-2 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('editorial')}
                className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'editorial'
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span>기사 검토 & AI 데스크</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('feeds')}
                className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'feeds'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>등록된 피드 목록 ({feeds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('add')}
                className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'add'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>새 피드 추가 & 연결 테스트</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'logs'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>오류 및 재시도 로그 ({errorLogs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('db')}
                className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'db'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>데이터베이스 & 저작권</span>
              </button>
            </div>

            {/* Tab Contents (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
              {/* TAB 0: EDITORIAL DESK & AI DRAFTING */}
              {activeTab === 'editorial' && (
                <AdminEditorialDesk
                  adminToken={adminToken}
                  onRefreshParent={() => {
                    loadAdminData(adminToken);
                    onRefreshParent();
                  }}
                />
              )}

              {/* TAB 1: FEEDS LIST */}
              {activeTab === 'feeds' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      서버가 15분 주기로 백그라운드 수집을 수행하며, 오류 발생 시 백오프 알고리즘(15m→30m→60m→120m)에 따라
                      재시도 간격을 안전하게 조절합니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => loadAdminData(adminToken)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> 새로고침
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {feeds.map((feed, idx) => (
                      <div
                        key={`${feed.id}-${idx}`}
                        className={`p-4 rounded-xl border bg-white shadow-xs transition-all ${
                          !feed.enabled
                            ? 'border-slate-200 opacity-60 bg-slate-50/70'
                            : feed.lastError
                            ? 'border-red-200'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  !feed.enabled
                                    ? 'bg-slate-400'
                                    : feed.lastError
                                    ? 'bg-red-500'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <h4 className="font-bold text-slate-900 text-sm">{feed.name}</h4>
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                {feed.categoryName}
                              </span>
                            </div>
                            <a
                              href={feed.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-400 hover:text-blue-600 truncate block max-w-xs sm:max-w-md mt-0.5 font-mono"
                              title={feed.url}
                            >
                              {feed.url}
                            </a>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleFeed(feed.id)}
                              className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                                feed.enabled
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                              title={feed.enabled ? '피드 비활성화' : '피드 활성화'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTriggerCollect(feed.id)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer transition"
                              title="이 피드만 즉시 수집"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFeed(feed.id, feed.name)}
                              className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 cursor-pointer transition"
                              title="피드 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Status detail metrics */}
                        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-500">
                          <div>
                            <span className="text-[10px] text-slate-400 block">수집 주기 / 백오프</span>
                            <span className="font-semibold text-slate-800">
                              {feed.intervalMinutes}분
                              {feed.backoffMinutes > feed.intervalMinutes && (
                                <span className="text-amber-600 ml-1">({feed.backoffMinutes}분 대기중)</span>
                              )}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block">수집 성공 기사</span>
                            <span className="font-semibold text-slate-800 font-mono">
                              {(feed.articleCount || 0).toLocaleString()}건
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block">최근 수집 확인</span>
                            <span className="font-semibold text-slate-800">
                              {feed.lastFetchedAt
                                ? new Date(feed.lastFetchedAt).toLocaleTimeString('ko-KR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '대기 중'}
                            </span>
                          </div>
                        </div>

                        {feed.lastError && (
                          <div className="mt-2.5 p-2 rounded-lg bg-red-50 border border-red-100 text-[11px] text-red-700 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">수집 실패 ({feed.consecutiveErrors}회 연속):</span>{' '}
                              {feed.lastError}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: ADD FEED & URL TESTER (Requirements 7 & 8) */}
              {activeTab === 'add' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-blue-600" />
                        <span>새로운 국내외 언론사 RSS 피드 등록</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        공개된 언론사의 RSS/XML 주소를 입력하고 먼저 [연결 테스트]를 수행하여 유효성을 검증하세요.
                      </p>
                    </div>

                    {/* Step 1: URL input & Test */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        RSS 피드 주소 (URL) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={newUrl}
                          onChange={(e) => {
                            setNewUrl(e.target.value);
                            setTestResult(null);
                          }}
                          placeholder="https://news.example.com/rss/politics.xml"
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleTestUrl}
                          disabled={isTestingUrl || !newUrl.trim()}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          {isTestingUrl ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          <span>연결 테스트</span>
                        </button>
                      </div>
                    </div>

                    {/* Test Result Display (Requirement 8) */}
                    {testResult && (
                      <div
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          testResult.success
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-red-50 border-red-200 text-red-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold">
                            {testResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>
                              {testResult.success
                                ? `연결 성공 (HTTP ${testResult.status || 200}, 응답속도: ${testResult.latencyMs}ms)`
                                : `연결 실패 (오류 검출)`}
                            </span>
                          </div>
                        </div>

                        {!testResult.success && testResult.errorReason && (
                          <div className="p-3 rounded-lg bg-white/80 border border-red-300 text-red-800 font-medium">
                            <p className="font-bold mb-1">오류 원인:</p>
                            <p>{testResult.errorReason}</p>
                          </div>
                        )}

                        {testResult.success && (
                          <div className="space-y-1.5 pt-1">
                            <p className="font-semibold text-emerald-800">
                              감지된 피드 명칭: <span className="font-bold">{testResult.title}</span>
                            </p>
                            {testResult.sampleItems && testResult.sampleItems.length > 0 && (
                              <div>
                                <span className="text-[11px] text-emerald-700 block font-bold mb-1">
                                  추출된 최신 기사 미리보기 ({testResult.sampleItems.length}건):
                                </span>
                                <ul className="space-y-1 bg-white/70 p-2.5 rounded-lg border border-emerald-100 font-mono text-[11px]">
                                  {testResult.sampleItems.map((item, idx) => (
                                    <li key={idx} className="truncate">
                                      • {item.title}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 2: Feed Metadata form */}
                    <form onSubmit={handleAddFeed} className="space-y-4 pt-3 border-t border-slate-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            피드 명칭 / 언론사명 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="예: SBS 뉴스 (정치) 또는 연합뉴스"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            분류 카테고리 (11대 분야) <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value as NewsCategory)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {CATEGORIES.filter((c) => c.id !== 'all' && c.id !== 'breaking').map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            수집 주기 (분)
                          </label>
                          <select
                            value={newInterval}
                            onChange={(e) => setNewInterval(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={15}>15분 (기본 권장값)</option>
                            <option value={30}>30분</option>
                            <option value={60}>60분 (1시간)</option>
                            <option value={120}>120분 (2시간)</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="submit"
                            disabled={isSubmittingFeed || !newUrl.trim() || !newName.trim()}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {isSubmittingFeed ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                            <span>피드 공식 등록</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 3: ERROR LOGS (Requirements 2 & 7) */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">오류 발생 및 재시도 추적 내역</h3>
                      <p className="text-xs text-slate-500">
                        서버 수집 중 발생한 타임아웃, HTTP 오류, XML 파싱 실패 내역이 실시간 기록됩니다.
                      </p>
                    </div>

                    {errorLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearErrors}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs text-slate-600 font-semibold cursor-pointer transition"
                      >
                        로그 비우기
                      </button>
                    )}
                  </div>

                  {errorLogs.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <h4 className="font-bold text-slate-800 text-sm">기록된 오류가 없습니다.</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        모든 언론사 RSS 피드가 정상적으로 연결 및 수집되고 있습니다.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {errorLogs.map((log, idx) => (
                        <div
                          key={`${log.id}-${idx}`}
                          className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-slate-400 text-[11px]">
                            <span className="font-mono font-bold text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {log.feedName} {log.httpStatus ? `(HTTP ${log.httpStatus})` : ''}
                            </span>
                            <span>{new Date(log.timestamp).toLocaleString('ko-KR')}</span>
                          </div>
                          <p className="font-bold text-slate-800">{log.message}</p>
                          <p className="text-[11px] font-mono text-slate-400 truncate">{log.url}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DATABASE & STORAGE STATS (Requirements 5 & 6) */}
              {activeTab === 'db' && (
                <div className="max-w-2xl mx-auto space-y-5">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      <span>서버 영구 데이터베이스 (Persistent Storage)</span>
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      본 시스템은 브라우저 임시 저장소에만 의존하지 않고, 실제 서버 환경에서 영구 유지되는
                      원자적 JSON 데이터베이스(<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">data/rss_news_database.json</code>)에
                      기사 데이터와 피드 구성, 수집 이력을 안전하게 저장합니다.
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block font-bold text-[10px] uppercase">
                          중복 방지 URL 색인
                        </span>
                        <span className="text-lg font-bold text-slate-900 font-mono">
                          {stats?.uniqueUrls.toLocaleString() || 0}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-1">개 URL 등록됨</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block font-bold text-[10px] uppercase">
                          데이터베이스 파일 크기
                        </span>
                        <span className="text-lg font-bold text-slate-900 font-mono">
                          {stats?.dbSizeBytes ? Math.round(stats.dbSizeBytes / 1024) : 0}
                        </span>
                        <span className="text-slate-400 text-[11px] ml-1">KB</span>
                      </div>
                    </div>
                  </div>

                  {/* Copyright & Security Policies */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs text-slate-600">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span>보안 및 저작권 준수 정책 안내</span>
                    </h4>
                    <ul className="space-y-1.5 list-disc list-inside text-slate-600 leading-relaxed">
                      <li>
                        <strong>원문 출처 명시:</strong> 모든 외부 연계 뉴스는 출처 언론사명과 원문 바로가기 링크를
                        명확히 노출합니다.
                      </li>
                      <li>
                        <strong>전문 복제 금지:</strong> 저작권 보호를 위해 기사 전문은 수집하거나 복제하지 않으며,
                        RSS에 허용된 요약문 및 메타데이터만을 제공합니다.
                      </li>
                      <li>
                        <strong>보안 필터링 (XSS 방지):</strong> 외부 RSS에 악의적인 스크립트나 명령문이 포함되어도
                        서버 및 클라이언트 단에서 정규식 태그 제거와 텍스트 이스케이프를 수행하여 안전한 순수 텍스트로만 처리합니다.
                      </li>
                      <li>
                        <strong>서버 부하 방지:</strong> 피드별 최소 15분 주기 수집, 정중한 봇 헤더 식별자, 순차적 딜레이 요청을 준수합니다.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
