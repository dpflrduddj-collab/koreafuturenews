import React from 'react';
import { Article } from '../types';
import { Feather, MessageCircle, Quote } from 'lucide-react';

interface OpinionSectionProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

export const OpinionSection: React.FC<OpinionSectionProps> = ({
  articles,
  onSelectArticle,
}) => {
  const opinionArticles = articles.filter((a) => a.category === 'opinion');

  return (
    <section id="opinion-section" className="mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 mb-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            오피니언 · 사설
          </h2>
          <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">OPINION & ESSAY</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {opinionArticles.map((art, idx) => (
          <div
            key={`${art.id}-${idx}`}
            onClick={() => onSelectArticle(art)}
            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              {/* Badge & Type */}
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                  {art.title.includes('[사설]') ? '사설' : '전문 칼럼'}
                </span>
                <span className="text-slate-400 font-mono">{art.timeAgo}</span>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-2 line-clamp-2">
                {art.title}
              </h3>

              {/* Excerpt */}
              <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed mb-4">
                "{art.summary}"
              </p>
            </div>

            {/* Author Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {art.reporter.photo ? (
                  <img
                    src={art.reporter.photo}
                    alt={art.reporter.name}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                    {art.reporter.name[0]}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-800">{art.reporter.name}</p>
                  <p className="text-[11px] text-slate-400">{art.reporter.dept}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-400">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{art.commentCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
