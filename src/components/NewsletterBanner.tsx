import React, { useState } from 'react';
import { Check, Mail } from 'lucide-react';

export const NewsletterBanner: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubscribed(true);
  };

  return (
    <div className="bg-blue-600 text-white rounded-2xl p-6 sm:p-8 mb-12 shadow-lg shadow-blue-200/40 relative overflow-hidden">
      {/* Subtle background decoration circle */}
      <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute right-32 -top-12 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-3 backdrop-blur-xs">
          <Mail className="w-3.5 h-3.5" />
          <span>프리미엄 뉴스레터 • 조간 브리핑</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold leading-snug">
          오늘 꼭 알아야 할 가장 중요한 5가지 소식을 매일 아침 전해드립니다
        </h3>
        <p className="text-xs sm:text-sm text-blue-100 mt-2">
          정치, 경제, 글로벌 테크 트렌드까지 편집국장이 엄선한 3분 브리핑을 무료로 받아보세요.
        </p>

        {subscribed ? (
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2.5 rounded-xl text-xs font-semibold">
            <Check className="w-4 h-4 text-emerald-300" />
            <span>구독 신청이 완료되었습니다. 내일 아침 첫 브리핑을 기대해 주세요!</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="mt-5 flex flex-col sm:flex-row gap-2 max-w-md bg-white/20 p-1.5 rounded-xl backdrop-blur-sm">
            <input
              type="email"
              placeholder="이메일 주소를 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-2 bg-transparent text-white placeholder-blue-100 text-xs sm:text-sm focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-white text-blue-600 hover:bg-blue-50 font-bold text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              구독하기
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
