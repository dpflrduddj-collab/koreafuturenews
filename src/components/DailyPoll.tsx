import React, { useState } from 'react';
import { INITIAL_POLL } from '../data/newsData';
import { Poll } from '../types';
import { CheckCircle2, HelpCircle, Vote } from 'lucide-react';

export const DailyPoll: React.FC = () => {
  const [poll, setPoll] = useState<Poll>(() => {
    const saved = localStorage.getItem('daily_poll_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_POLL;
      }
    }
    return INITIAL_POLL;
  });

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(() => {
    return localStorage.getItem('daily_poll_voted') === 'true';
  });

  const handleVote = () => {
    if (!selectedOptionId || hasVoted) return;

    const updatedOptions = poll.options.map((opt) => {
      if (opt.id === selectedOptionId) {
        return { ...opt, votes: opt.votes + 1 };
      }
      return opt;
    });

    const updatedPoll: Poll = {
      ...poll,
      options: updatedOptions,
      totalVotes: poll.totalVotes + 1,
    };

    setPoll(updatedPoll);
    setHasVoted(true);
    localStorage.setItem('daily_poll_data', JSON.stringify(updatedPoll));
    localStorage.setItem('daily_poll_voted', 'true');
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm mb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            오늘의 여론 광장
          </h3>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-100">
            독자 투표
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono">마감: ~{poll.endDate}</span>
      </div>

      {/* Question */}
      <div className="mb-4">
        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
          Q. {poll.question}
        </h4>
      </div>

      {/* Options */}
      <div className="space-y-2.5 mb-5">
        {poll.options.map((opt) => {
          const percentage =
            poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
          const isSelected = selectedOptionId === opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => !hasVoted && setSelectedOptionId(opt.id)}
              className={`p-3.5 rounded-xl border transition-all relative overflow-hidden ${
                hasVoted
                  ? 'border-slate-200/80 bg-slate-50/70'
                  : isSelected
                  ? 'border-blue-600 bg-blue-50/40 cursor-pointer shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer'
              }`}
            >
              {/* Progress bar background if voted */}
              {hasVoted && (
                <div
                  className="absolute top-0 bottom-0 left-0 bg-blue-100/60 transition-all duration-700 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  {!hasVoted && (
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </div>
                  )}
                  {hasVoted && isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                  <span className={`font-medium ${isSelected ? 'text-blue-950 font-bold' : 'text-slate-800'}`}>
                    {opt.text}
                  </span>
                </div>

                {hasVoted && (
                  <div className="flex items-center gap-2 flex-shrink-0 font-mono text-xs font-bold text-slate-900">
                    <span>{percentage}%</span>
                    <span className="text-[11px] text-slate-400 font-normal font-sans">
                      ({opt.votes.toLocaleString()}표)
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Submit */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-500 font-medium">
          현재 총 참여: <strong className="text-slate-900 font-mono">{poll.totalVotes.toLocaleString()}명</strong>
        </span>

        {!hasVoted ? (
          <button
            type="button"
            onClick={handleVote}
            disabled={!selectedOptionId}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              selectedOptionId
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            투표하기
          </button>
        ) : (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            ✓ 투표 참여 완료
          </span>
        )}
      </div>
    </div>
  );
};
