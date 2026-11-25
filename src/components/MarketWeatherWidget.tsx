import React, { useState } from 'react';
import { MARKET_INDICES, WEATHER_DATA } from '../data/newsData';
import { Cloud, CloudSun, DollarSign, Sun, Umbrella, TrendingUp, TrendingDown } from 'lucide-react';

export const MarketWeatherWidget: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState(WEATHER_DATA[0].city);

  const activeWeather = WEATHER_DATA.find((w) => w.city === selectedCity) || WEATHER_DATA[0];

  const getWeatherIcon = (iconType: string) => {
    switch (iconType) {
      case 'sun':
        return <Sun className="w-8 h-8 text-amber-500 animate-spin-slow" />;
      case 'cloud-sun':
        return <CloudSun className="w-8 h-8 text-amber-500" />;
      case 'rain':
        return <Umbrella className="w-8 h-8 text-blue-500" />;
      default:
        return <Cloud className="w-8 h-8 text-neutral-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      {/* 1. Market Indices Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              금융·증시 시세
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">MARKETS</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MARKET_INDICES.map((idx) => (
            <div
              key={idx.name}
              className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/80 hover:bg-white hover:border-slate-200 hover:shadow-2xs transition-all"
            >
              <span className="text-xs text-slate-500 font-medium block truncate">{idx.name}</span>
              <p className="text-sm sm:text-base font-bold text-slate-800 mt-0.5 font-mono">
                {idx.value}
              </p>
              <div
                className={`flex items-center gap-1 text-xs font-semibold mt-1 font-mono ${
                  idx.isUp ? 'text-red-500' : 'text-blue-600'
                }`}
              >
                {idx.isUp ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{idx.change}</span>
                <span className="text-[10px]">({idx.changePercent})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Weather Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              전국 날씨 및 대기 정보
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">WEATHER</span>
        </div>

        {/* City Switcher Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3">
          {WEATHER_DATA.map((w) => (
            <button
              key={w.city}
              type="button"
              onClick={() => setSelectedCity(w.city)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
                selectedCity === w.city
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {w.city}
            </button>
          ))}
        </div>

        {/* Selected City Detail */}
        <div className="flex items-center justify-between bg-blue-50/40 border border-blue-100/60 rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-xl shadow-2xs">
              {getWeatherIcon(activeWeather.icon)}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900">
                  {activeWeather.city}
                </span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {activeWeather.temp}°C
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                상태: {activeWeather.condition}
              </p>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs">
              <span className="text-slate-500">미세먼지: </span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                {activeWeather.dust}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">자외선 지수: 보통</div>
          </div>
        </div>
      </div>
    </div>
  );
};
