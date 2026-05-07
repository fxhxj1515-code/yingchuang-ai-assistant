/**
 * 数据统计页面 — C1
 * 骨架 + Tab 导航，后续 C2-C4 填充各面板
 */
import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Zap,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@web/components/ui/button";
import { useProviderStore } from "@web/stores/provider-store";
import { TokenStatsPanel } from "./TokenStatsPanel";
import type { Model } from "@web/types";

type StatsTab = "overview" | "tokens" | "rank";

const tabs: { id: StatsTab; icon: typeof BarChart3; label: string }[] = [
  { id: "overview", icon: TrendingUp, label: "总览" },
  { id: "tokens", icon: Zap, label: "Token" },
  { id: "rank", icon: Trophy, label: "排行" },
];

export function StatsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const models = useProviderStore((s) => s.models);
  const enabledModels = models.filter((m: Model) => m.enabled);

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col overflow-y-auto px-6 py-8">
      {/* 标题 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">数据统计</h1>
          <p className="text-muted-foreground text-xs">对话量、Token消耗、模型使用排行</p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="mb-6 flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* 概览卡片（总览 + Token 共用） */}
      {activeTab !== "rank" && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={MessageSquare} label="总对话数" value="--" color="from-blue-500 to-cyan-500" />
          <StatCard icon={Zap} label="本月Token" value="--" color="from-amber-500 to-orange-500" />
          <StatCard icon={BarChart3} label="活跃模型" value={`${enabledModels.length}`} color="from-green-500 to-emerald-500" />
          <StatCard icon={TrendingUp} label="消息数" value="--" color="from-purple-500 to-pink-500" />
        </div>
      )}

      {/* 面板占位区 */}
      <div className="flex-1">
        {activeTab === "overview" && <OverviewPlaceholder />}
        {activeTab === "tokens" && <TokenStatsPanel />}
        {activeTab === "rank" && <RankPlaceholder models={enabledModels} />}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

/** 总览占位 —— C3 填充 */
function OverviewPlaceholder() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        对话趋势
      </div>
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
        <div className="text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground mt-2 text-sm">对话量趋势图</p>
          <p className="text-muted-foreground/60 mt-1 text-xs">接入数据后自动生成</p>
        </div>
      </div>
    </div>
  );
}

/** 排行占位 —— C4 填充 */
function RankPlaceholder({ models }: { models: Model[] }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Trophy className="h-4 w-4 text-muted-foreground" />
        模型使用排行
      </div>
      {models.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
          <div className="text-center">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground mt-2 text-sm">暂无模型数据</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <span className="text-muted-foreground w-6 text-center text-sm font-bold">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{m.displayName || m.id}</p>
                <p className="text-muted-foreground text-xs">{m.id}</p>
              </div>
              <span className="text-muted-foreground text-xs">-- 次</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
