import React from 'react';
import { Article } from '../types';
import { Bookmark, Trash2, X, ExternalLink } from 'lucide-react';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Article[];
  onSelectArticle: (article: Article) => void;
  onRemoveBookmark: (id: string) => void;
  onClearAll: () => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onSelectArticle,
  onRemoveBookmark,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600 fill-current" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              내 스크랩 기사 ({bookmarks.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
              <Bookmark className="w-12 h-12 stroke-1 mb-3 text-slate-300" />
              <p className="font-medium text-slate-600">스크랩한 기사가 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                기사 카드의 책갈피 아이콘을 눌러 나중에 읽고 싶은 기사를 보관해보세요.
              </p>
            </div>
          ) : (
            bookmarks.map((art, idx) => (
              <div
                key={`${art.id}-${idx}`}
                className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all group flex flex-col justify-between"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    onSelectArticle(art);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
                    <span className="text-blue-600 font-bold">{art.categoryName}</span>
                    <span>{art.publishedAt}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h4>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-slate-600">{art.reporter.name} 기자</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(art.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      title="스크랩 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectArticle(art);
                        onClose();
                      }}
                      className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5"
                    >
                      읽기 <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {bookmarks.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">브라우저 로컬 저장소 보관 중</span>
            <button
              type="button"
              onClick={onClearAll}
              className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
            >
              전체 비우기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
