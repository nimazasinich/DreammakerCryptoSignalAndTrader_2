/**
 * مثال استفاده از کامپوننت‌های Glass UI
 * این فایل نمونه‌هایی از استفاده از کامپوننت‌های جدید را نشان می‌دهد
 */

import React from 'react';
import { GlassCard, GlassCardWithHeader, StatCard } from './GlassCard';
import { GlassIcon, GlassIconButton } from './GlassIcon';
import { TrendingUp, DollarSign, Activity, Zap } from 'lucide-react';

export const GlassComponentsExample: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      {/* عنوان */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-purple-900 mb-3 flex items-center justify-center gap-3">
          <span className="animate-float">✨</span>
          Glass UI Components
          <span className="animate-float" style={{ animationDelay: '0.5s' }}>✨</span>
        </h1>
        <p className="text-purple-600 font-medium">
          کامپوننت‌های شیشه‌ای با افکت‌های بنفش و انیمیشن‌های جذاب
        </p>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Balance"
          value="$24,500"
          change="+12.5%"
          changeType="positive"
          icon={<DollarSign className="w-7 h-7" />}
        />
        <StatCard
          label="Active Trades"
          value="156"
          change="+8"
          changeType="positive"
          icon={<Activity className="w-7 h-7" />}
        />
        <StatCard
          label="Win Rate"
          value="68.5%"
          change="-2.3%"
          changeType="negative"
          icon={<TrendingUp className="w-7 h-7" />}
        />
        <StatCard
          label="Performance"
          value="A+"
          change="Stable"
          changeType="neutral"
          icon={<Zap className="w-7 h-7" />}
        />
      </div>

      {/* کارت‌های معمولی */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard hover glow>
          <h3 className="text-xl font-bold text-purple-900 mb-3 flex items-center gap-2">
            🎨 کارت شیشه‌ای ساده
          </h3>
          <p className="text-purple-700">
            این یک کارت شیشه‌ای با افکت hover و هاله بنفش است.
            وقتی موس را روی آن می‌برید، افکت‌های زیبایی را خواهید دید.
          </p>
        </GlassCard>

        <GlassCard hover gradient>
          <h3 className="text-xl font-bold text-purple-900 mb-3 flex items-center gap-2">
            🌈 کارت با گرادیانت
          </h3>
          <p className="text-purple-700">
            این کارت از پس‌زمینه گرادیانت بنفش استفاده می‌کند
            و افکت شیشه‌ای قوی‌تری دارد.
          </p>
        </GlassCard>
      </div>

      {/* کارت با هدر */}
      <GlassCardWithHeader
        title="Trading Dashboard"
        subtitle="Real-time market data and analytics"
        icon={<TrendingUp className="w-6 h-6" />}
        action={
          <button className="btn-primary">
            View Details
          </button>
        }
        hover
        glow
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl glass border border-purple-200/30">
            <span className="text-purple-700 font-semibold">BTC/USDT</span>
            <span className="text-green-600 font-bold">+5.2%</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl glass border border-purple-200/30">
            <span className="text-purple-700 font-semibold">ETH/USDT</span>
            <span className="text-green-600 font-bold">+3.8%</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl glass border border-purple-200/30">
            <span className="text-purple-700 font-semibold">SOL/USDT</span>
            <span className="text-red-600 font-bold">-1.5%</span>
          </div>
        </div>
      </GlassCardWithHeader>

      {/* آیکون‌ها */}
      <GlassCard hover glow>
        <h3 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-2">
          🎯 آیکون‌های شیشه‌ای
        </h3>
        <div className="flex flex-wrap gap-4">
          <GlassIconButton name="dashboard" active />
          <GlassIconButton name="chart" />
          <GlassIconButton name="market" />
          <GlassIconButton name="trading" />
          <GlassIconButton name="portfolio" />
          <GlassIconButton name="settings" />
        </div>
      </GlassCard>

      {/* دکمه‌ها */}
      <GlassCard hover>
        <h3 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-2">
          🔘 دکمه‌های زیبا
        </h3>
        <div className="flex flex-wrap gap-4">
          <button className="btn-primary">
            <Zap className="w-4 h-4" />
            Primary Button
          </button>
          <button className="btn-secondary">
            <Activity className="w-4 h-4" />
            Secondary Button
          </button>
        </div>
      </GlassCard>

      {/* فرم‌ها */}
      <GlassCard hover gradient>
        <h3 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-2">
          📝 فیلدهای ورودی
        </h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your email..."
            className="input-field w-full"
          />
          <input
            type="password"
            placeholder="Enter your password..."
            className="input-field w-full"
          />
          <button className="btn-primary w-full">
            Sign In
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default GlassComponentsExample;

