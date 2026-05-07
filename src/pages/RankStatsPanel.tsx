/**
 * 模型使用排行面板 — C4
 * 按调用次数排名，支持本周/本月/全部时间切换
 * 当前使用 mock 数据，后续接真实 store
 */
import { useMemo, useState } from "react";
import { Trophy, Medal, TrendingUp, Clock, Zap } from "lucide-react";
import { useProviderStore } from "@web/stores/provider-store";
import type { Model } from "@web/types";

interface ModelRank {
  modelId: string;
  count: number;
  totalTokens: number;
  avgLatency: number; // ms
  trend: "up" | "down" | "stable";
  trendPct: number;
}

const mockRanks: ModelRank[] = [
  { modelId: "deepseek-v4", count: 156, totalTokens: 404000, avgLatency: 850, trend: "up", trendPct: 12 },
  { modelId: "gpt-4o", count: 67, totalTokens: 153000, avgLatency: 1200, trend: "down", trendPct: 5 },
  { modelId: "claude-3.5-sonnet", count: 42, totalTokens: 96000, avgLatency: 1500, trend: "up", trendPct: 8 },
  { modelId: "gemini-2.5-pro", count: 18, totalTokens: 30000, avgLatency: 2000, trend: "stable", trendPct: 0 },
  { modelId: "qwen-plus", count: 12, totalTokens: 19000, avgLatency: 600, trend: "up", trendPct: 20 },
  { modelId: "local-llama3", count: 8, totalTokens: 12000, avgLatency: 3500, trend: "down", trendPct: 15 },
];

function findModel(modelId: string, models: Model[]): Model | undefined {
  return models.find((m) => m.modelId === modelId || m.id === modelId);
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

type TimeRange = "week" | "month" | "all";

export function RankStatsPanel() {
  const models = useProviderStore((s) => s.models);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const sorted = useMemo(() => [...mockRanks].sort((a, b) => b.count - a.count), []);
  const maxCount = sorted[0]?.count || 1;
  const rankColors = [
    "from-amber-400 to-yellow-500",
    "from-gray-400 to-gray-500",
    "from-amber-600 to-amber-700",
  ];
  const rankIcons = [
    <Trophy key="1" className="h-4 w-4 text-amber-500" />,
    <Medal key="2" className="h-4 w-4 text-gray-400" />,
    <Medal key="3" className="h-4 w-4 text-amber-700" />,
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 时间切换 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">调用排行榜</h3>
        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          {([
            { id: "week" as TimeRange, label: "本周" },
            { id: "month" as TimeRange, label: "本月" },
            { id: "all" as TimeRange, label: "全部" },
          ]).map((r) => (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                timeRange === r.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* TOP 3 领奖台 */}
      <div className="grid grid-cols-3 gap-3">
        {sorted.slice(0, 3).map((rank, i) => {
          const model = findModel(rank.modelId, models);
          const isFirst = i === 0;
          return (
            <div
              key={rank.modelId}
              className={`flex flex-col items-center rounded-xl border border-border bg-card p-4 ${
                isFirst ? "ring-2 ring-amber-200 dark:ring-amber-800" : ""
              }`}
            >
              <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${rankColors[i]}`}>
                <span className="text-sm font-bold text-white">{i + 1}</span>
              </div>
              <p className="text-sm font-semibold truncate w-full text-center">
                {model?.displayName || rank.modelId}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {rankIcons[i]}
                <span className="text-muted-foreground text-xs">{rank.count} 次</span>
              </div>
              <div className={`mt-1 flex items-center gap-1 text-xs ${
                rank.trend === "up" ? "text-green-500" : rank.trend === "down" ? "text-red-500" : "text-muted-foreground"
              }`}>
                <TrendingUp className={`h-3 w-3 ${rank.trend === "down" ? "rotate-180" : ""}`} />
                {rank.trendPct > 0 ? `${rank.trendPct}%` : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* 完整排行列表 */}
      <div>
        <h3 className="mb-3 text-sm font-medium">完整排行</h3>
        <div className="rounded-xl border border-border bg-card">
          {/* 表头 */}
          <div className="border-border grid grid-cols-4 gap-2 border-b px-4 py-2.5 text-muted-foreground text-xs">
            <span>模型</span>
            <span className="text-center">调用次数</span>
            <span className="text-center">Token</span>
            <span className="text-right">平均延迟</span>
          </div>

          {sorted.map((rank, i) => {
            const model = findModel(rank.modelId, models);
            const barPct = (rank.count / maxCount) * 100;
            return (
              <div
                key={rank.modelId}
                className="border-border grid grid-cols-4 gap-2 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground w-5 text-xs font-medium">{i + 1}</span>
                  <span className="font-medium truncate">{model?.displayName || rank.modelId}</span>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <span className="text-sm font-semibold">{rank.count}</span>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${barPct}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span className="text-sm">{formatNumber(rank.totalTokens)}</span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">{formatLatency(rank.avgLatency)}</span>
                </div>
              </div>
            );
          })}

          {sorted.length === 0 && (
            <div className="text-muted-foreground py-12 text-center text-sm">暂无排行数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
