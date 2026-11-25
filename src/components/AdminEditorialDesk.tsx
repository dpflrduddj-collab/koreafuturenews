import React, { useState, useEffect, useCallback } from 'react';
import {
  Article,
  ArticleApprovalStatus,
  EditorialStats,
  NewsCategory,
} from '../types';
import {
  fetchAdminArticles,
  generateAdminAiDraft,
  applyAdminAiDraft,
  updateAdminArticleStatus,
  batchApproveAdminArticles,
  deleteAdminArticle,
} from '../services/newsService';
import { CATEGORIES } from '../data/newsData';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Filter,
  PauseCircle,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  FileText,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface AdminEditorialDeskProps {
  adminToken: string;
  onRefreshParent: () => void;
}

export const AdminEditorialDesk: React.FC<AdminEditorialDeskProps> = ({
  adminToken,
  onRefreshParent,
}) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [editorialStats, setEditorialStats] = useState<EditorialStats | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ArticleApprovalStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Modal State
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editContentText, setEditContentText] = useState('');
  const [editCategory, setEditCategory] = useState<NewsCategory>('politics');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    const res = await fetchAdminArticles(adminToken, {
      status: selectedStatus,
      category: selectedCategory,
      search: searchQuery,
      limit: 50,
      offset: 0,
    });

    if (res.success && res.articles) {
      setArticles(res.articles);
      if (res.stats) {
        setEditorialStats(res.stats);
      }
    } else {
      setActionMessage({ type: 'error', text: res.error || '기사 목록을 불러오지 못했습니다.' });
    }
    setIsLoading(false);
  }, [adminToken, selectedStatus, selectedCategory, searchQuery]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const showTempMessage = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // 1. Generate Gemini AI Draft
  const handleGenerateAi = async (article: Article) => {
    setGeneratingId(article.id);
    setActionMessage({
      type: 'success',
      text: `[${article.title.slice(0, 20)}...] Gemini 3.8 Flash가 기사 초안을 작성 중입니다...`,
    });

    const res = await generateAdminAiDraft(article.id, adminToken);
    setGeneratingId(null);

    if (res.success && res.article) {
      showTempMessage('success', 'Gemini AI 기사 초안이 성공적으로 생성되었습니다.');
      setArticles((prev) => prev.map((a) => (a.id === article.id ? res.article! : a)));
      onRefreshParent();
    } else {
      showTempMessage('error', res.error || 'AI 초안 생성에 실패했습니다.');
    }
  };

  // 2. Apply AI Draft as official article and publish
  const handleApplyAi = async (articleId: string) => {
    const res = await applyAdminAiDraft(articleId, adminToken);
    if (res.success && res.article) {
      showTempMessage('success', 'AI 초안이 공식 기사로 승인되어 메인 홈페이지에 즉시 게시되었습니다.');
      setArticles((prev) => prev.map((a) => (a.id === articleId ? res.article! : a)));
      onRefreshParent();
    } else {
      showTempMessage('error', res.error || '게시 승인에 실패했습니다.');
    }
  };

  // 3. Status Transition (Approve / Hold / Reject / Pending)
  const handleStatusChange = async (articleId: string, newStatus: ArticleApprovalStatus) => {
    const res = await updateAdminArticleStatus(articleId, newStatus, adminToken);
    if (res.success && res.article) {
      showTempMessage('success', res.message || '기사 상태가 변경되었습니다.');
      setArticles((prev) => prev.map((a) => (a.id === articleId ? res.article! : a)));
      onRefreshParent();
    } else {
      showTempMessage('error', res.error || '상태 변경에 실패했습니다.');
    }
  };

  // 4. Batch Approve
  const handleBatchApprove = async () => {
    if (!window.confirm('검토 대기 및 보류 상태인 모든 기사를 일괄 게시 승인하시겠습니까?')) return;
    setIsLoading(true);
    const res = await batchApproveAdminArticles(adminToken);
    setIsLoading(false);

    if (res.success) {
      showTempMessage('success', res.message || '일괄 승인되었습니다.');
      loadArticles();
      onRefreshParent();
    } else {
      showTempMessage('error', res.error || '일괄 승인에 실패했습니다.');
    }
  };

  // 5. Delete Article
  const handleDeleteArticle = async (articleId: string, title: string) => {
    if (!window.confirm(`'${title.slice(0, 30)}...' 기사를 영구 삭제하시겠습니까?`)) return;
    const res = await deleteAdminArticle(articleId, adminToken);
    if (res.success) {
      showTempMessage('success', '기사가 삭제되었습니다.');
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      onRefreshParent();
    } else {
      showTempMessage('error', res.error || '기사 삭제에 실패했습니다.');
    }
  };

  // 6. Open Inline Editor
  const handleOpenEdit = (article: Article) => {
    setEditingArticle(article);
    setEditTitle(article.title);
    setEditSummary(article.summary);
    setEditContentText(article.content.join('\n\n'));
    setEditCategory(article.category);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    setIsSubmittingEdit(true);

    const paragraphs = editContentText
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const res = await updateAdminArticleStatus(editingArticle.id, 'published', adminToken, {
      title: editTitle.trim(),
      summary: editSummary.trim(),
      content: paragraphs.length > 0 ? paragraphs : [editSummary.trim()],
      category: editCategory,
    });

    setIsSubmittingEdit(false);

    if (res.success && res.article) {
      showTempMessage('success', '기사 수정이 완료되었으며 게시 승인되었습니다.');
      setArticles((prev) => prev.map((a) => (a.id === editingArticle.id ? res.article! : a)));
      setEditingArticle(null);
      onRefreshParent();
    } else {
      showTempMessage('error', res.error || '기사 수정에 실패했습니다.');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-md animate-fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editorial Desk Header & Stats Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-violet-500/30 text-violet-200 text-[11px] font-bold border border-violet-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-violet-300" />
                Google Gemini 3.8 Flash 엔진 연계
              </span>
              <span className="text-xs text-slate-300">| 편집국 AI 데스크</span>
            </div>
            <h3 className="text-xl font-bold mt-1.5 flex items-center gap-2">
              <span>기사 수집·AI 요약·검토 및 게시 관리 파이프라인</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              수집된 RSS 기사를 검토하고, 사실 왜곡 없는 저널리즘 원칙에 따라 Gemini AI 초안을 생성한 뒤
              승인·수정·보류를 거쳐 홈페이지에 발행합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleBatchApprove}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              title="대기 기사를 일괄 승인합니다."
            >
              <Check className="w-4 h-4" />
              <span>대기 기사 일괄 승인</span>
            </button>
            <button
              type="button"
              onClick={loadArticles}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-white/10"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">새로고침</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        {editorialStats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5 pt-4 border-t border-white/10 text-center">
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[11px] text-slate-300 block">전체 수집 기사</span>
              <span className="text-lg font-bold font-mono text-white">{editorialStats.total}건</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[11px] text-emerald-300 block">게시 승인됨</span>
              <span className="text-lg font-bold font-mono text-emerald-400">{editorialStats.publishedCount}건</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[11px] text-amber-300 block">검토 대기중</span>
              <span className="text-lg font-bold font-mono text-amber-400">{editorialStats.pendingCount}건</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[11px] text-slate-400 block">보류·검토중</span>
              <span className="text-lg font-bold font-mono text-slate-300">{editorialStats.heldCount}건</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[11px] text-violet-300 block">AI 초안 작성됨</span>
              <span className="text-lg font-bold font-mono text-violet-300">{editorialStats.aiDraftCount}건</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedStatus === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            전체 보기
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('pending_review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              selectedStatus === 'pending_review'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>대기중</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('published')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              selectedStatus === 'published'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>게시됨</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('held')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              selectedStatus === 'held'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <PauseCircle className="w-3 h-3" />
            <span>보류</span>
          </button>
        </div>

        {/* Category & Search Input */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as NewsCategory)}
            aria-label="분야 선택"
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">전체 분야</option>
            {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목·언론사 검색..."
              className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Article List Cards */}
      <div className="space-y-4">
        {isLoading && articles.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm font-medium">기사 데이터를 불러오는 중입니다...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">해당 조건의 기사가 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">상단의 필터를 변경하거나 '즉시 수집'을 실행해 보세요.</p>
          </div>
        ) : (
          articles.map((article) => {
            const hasDraft = Boolean(article.aiDraft);
            const isGenerating = generatingId === article.id;
            const status = article.approvalStatus || 'published';

            return (
              <div
                key={article.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Header Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {article.categoryName}
                    </span>
                    <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      {article.externalSource}
                    </span>
                    <span className="text-slate-400 font-mono">{article.publishedAt}</span>

                    {/* Status Badge */}
                    {status === 'published' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 게시 승인됨
                      </span>
                    )}
                    {status === 'pending_review' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 검토 대기
                      </span>
                    )}
                    {status === 'held' && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold flex items-center gap-1">
                        <PauseCircle className="w-3 h-3" /> 보류됨
                      </span>
                    )}
                    {status === 'rejected' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-1">
                        <X className="w-3 h-3" /> 반려됨
                      </span>
                    )}

                    {article.isAiGenerated && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI 게시 기사
                      </span>
                    )}
                  </div>

                  {/* External Original Link */}
                  {article.externalUrl && (
                    <a
                      href={article.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1 transition"
                    >
                      <span>원문 보기</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Main Content Info */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {article.imageUrl && (
                    <div className="w-full sm:w-36 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60">
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {article.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>
                </div>

                {/* AI Draft Box (If Available) */}
                {hasDraft && article.aiDraft && (
                  <div className="bg-gradient-to-br from-violet-50/80 to-blue-50/40 rounded-xl p-4 border border-violet-200/80 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        <span>Google Gemini AI 작성 기사 초안</span>
                        <span className="text-slate-400 font-mono text-[11px] font-normal">
                          ({article.aiDraft.generatedAt.slice(11, 16)} 생성)
                        </span>
                      </div>
                      <span className="text-[11px] text-violet-600 font-medium">
                        저널리즘 팩트체크 완료
                      </span>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400 font-bold mb-0.5">추천 헤드라인:</div>
                      <div className="text-sm font-bold text-slate-900">
                        {article.aiDraft.headline}
                      </div>
                    </div>

                    {article.aiDraft.summaryBullets && article.aiDraft.summaryBullets.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-400 font-bold mb-1">핵심 3개 요약:</div>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {article.aiDraft.summaryBullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-violet-600 font-bold">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-2 border-t border-violet-100 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 italic">
                        {article.aiDraft.disclaimer}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyAi(article.id)}
                        className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>AI 초안 채택 및 즉시 게시</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Button Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Trigger Gemini AI Draft */}
                    <button
                      type="button"
                      onClick={() => handleGenerateAi(article)}
                      disabled={isGenerating}
                      className="px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Google Gemini API를 호출하여 기사 초안을 작성합니다."
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-violet-600' : 'text-violet-700'}`} />
                      <span>{isGenerating ? 'Gemini 작성 중...' : hasDraft ? 'AI 초안 재작성' : 'AI 기사 초안 작성'}</span>
                    </button>

                    {/* Inline Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(article)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>기사 수정</span>
                    </button>
                  </div>

                  {/* Editorial Decision Buttons */}
                  <div className="flex items-center gap-1.5">
                    {status !== 'published' ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(article.id, 'published')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>게시 승인</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(article.id, 'held')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="기사를 홈페이지에서 일시 보류합니다."
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>보류</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteArticle(article.id, article.title)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="기사 영구 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal Dialog */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center p-3 sm:p-6">
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">기사 편집 및 데스크 수정</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingArticle(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">기사 제목</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">카테고리</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as NewsCategory)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">원문 언론사</label>
                  <input
                    type="text"
                    disabled
                    value={editingArticle.externalSource}
                    className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">요약문</label>
                <textarea
                  rows={2}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  기사 본문 단락 (단락 간 빈 줄 2칸으로 구분)
                </label>
                <textarea
                  rows={8}
                  value={editContentText}
                  onChange={(e) => setEditContentText(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? '저장 중...' : '수정 사항 저장 및 게시'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
