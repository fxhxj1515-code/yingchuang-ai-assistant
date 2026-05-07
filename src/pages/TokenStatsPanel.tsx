/**
 * Token 用量统计面板 — C2
 * 展示总Token消耗、按模型分组、趋势图
 * 当前使用 mock 数据，后续接真实 store
 */
import { useMemo, useState } from "react";
import {
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Brain,
  Bot,
  Globe,
  Cpu,
} from "lucide-react";
import { useProviderStore } from "@web/stores/provider-store";
import type { Model } from "@web/types";

/** Mock 数据 — 后续替换为 real store */
interface TokenDay {
  date: string;
  input: number;
  output: number;
}

const mockDailyTokens: TokenDay[] = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    input: Math.round(2000 + Math.random() * 5000),
    output: Math.round(3000 + Math.random() * 8000),
  };
});

const mockModelTokens: { modelId: string; input: number; output: number; count: number }[] = [
  { modelId: "deepseek-v4", input: 124000, output: 280000, count: 156 },
  { modelId: "gpt-4o", input: 58000, output: 95000, count: 67 },
  { modelId: "claude-3.5-sonnet", input: 34000, output: 62000, count: 42 },
  { modelId: "gemini-2.5-pro", input: 12000, output: 18000, count: 18 },
  { modelId: "qwen-plus", input: 8000, output: 11000, count: 12 },
];

function findModelName(modelId: string, models: Model[]): string {
  const m = models.find((m) => m.modelId === modelId || m.id === modelId);
  return m?.displayName || modelId;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function TokenStatsPanel() {
  const models = useProviderStore((s) => s.models);
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d");

  const totals = useMemo(() => {
    const input = mockModelTokens.reduce((s, m) => s + m.input, 0);
    const output = mockModelTokens.reduce((s, m) => s + m.output, 0);
    return { input, output, total: input + output };
  }, []);

  const maxBar = Math.max(...mockDailyTokens.map((d) => d.input + d.output), 1);

  // 按用量排序
  const sortedModels = useMemo(
    () => [...mockModelTokens].sort((a, b) => (b.input + b.output) - (a.input + a.output)),
    [],
  );

  const modelColors = [
    "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-green-500", "bg-pink-500",
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 总计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-muted-foreground mb-1 text-xs">总 Token</div>
          <div className="text-2xl font-bold tracking-tight">{formatNumber(totals.total)}</div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-green-500">本月</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-muted-foreground mb-1 text-xs">输入 Token</div>
          <div className="text-2xl font-bold tracking-tight">{formatNumber(totals.input)}</div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
            <ArrowDownRight className="h-3 w-3 text-blue-500" />
            <span>{((totals.input / totals.total) * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-muted-foreground mb-1 text-xs">输出 Token</div>
          <div className="text-2xl font-bold tracking-tight">{formatNumber(totals.output)}</div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
            <ArrowUpRight className="h-3 w-3 text-green-500" />
            <span>{((totals.output / totals.total) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* 日趋势柱状图 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">日消耗趋势</h3>
          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            {(["7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  timeRange === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "7d" ? "7天" : "30天"}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          {/* Y 轴标注 */}
          <div className="mb-2 flex items-end justify-between text-muted-foreground text-[10px]">
            <span>{formatNumber(maxBar)}</span>
            <span>{formatNumber(Math.round(maxBar / 2))}</span>
            <span>0</span>
          </div>
          {/* 柱状图 */}
          <div className="flex items-end gap-2" style={{ height: "160px" }}>
            {mockDailyTokens.map((day) => {
              const total = day.input + day.output;
              const h = Math.max((total / maxBar) * 100, 2);
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-col justify-end" style={{ height: "140px" }}>
                    <div className="relative w-full" style={{ height: `${h}%` }}>
                      <div
                        className="absolute bottom-0 w-full rounded-t bg-blue-500/30"
                        style={{ height: `${(day.input / total) * 100}%` }}
                      />
                      <div
                        className="absolute top-0 w-full rounded-t bg-blue-500"
                        style={{ height: `${(day.output / total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-muted-foreground text-[10px]">{day.date}</span>
                </div>
              );
            })}
          </div>
          {/* 图例 */}
          <div className="text-muted-foreground mt-3 flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-blue-500/30" />
              输入
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-blue-500" />
              输出
            </div>
          </div>
        </div>
      </div>

      {/* 按模型分布 */}
      <div>
        <h3 className="mb-3 text-sm font-medium">模型用量分布</h3>
        <div className="rounded-xl border border-border bg-card p-4">
          {sortedModels.map((m, i) => {
            const total = m.input + m.output;
            const pct = Math.round((total / (totals.total || 1)) * 100);
            return (
              <div key={m.modelId} className="mb-3 last:mb-0">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{findModelName(m.modelId, models)}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatNumber(total)} · {pct}% · {m.count}次
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${modelColors[i % modelColors.length]} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          {sortedModels.length === 0 && (
            <div className="text-muted-foreground py-12 text-center text-sm">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
