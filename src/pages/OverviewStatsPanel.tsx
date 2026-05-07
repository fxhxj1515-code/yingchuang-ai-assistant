/**
 * 对话量统计面板 — C3
 * 总对话数、消息数、日趋势、消息类型分布
 * 当前使用 mock 数据，后续接真实 store
 */
import { useMemo, useState } from "react";
import {
  MessageSquare,
  TrendingUp,
  MessagesSquare,
  FileText,
  Image,
  Code,
  Zap,
} from "lucide-react";
import { useProviderStore } from "@web/stores/provider-store";

/** Mock 数据 — 后续替换为 real store */
interface DailyStats {
  date: string;
  conversations: number;
  messages: number;
}

const mockDaily: DailyStats[] = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}`,
    conversations: Math.round(3 + Math.random() * 12),
    messages: Math.round(20 + Math.random() * 80),
  };
});

const mockTypeDistribution = [
  { type: "text", label: "文本", icon: MessageSquare, count: 487, color: "bg-blue-500" },
  { type: "code", label: "代码", icon: Code, count: 142, color: "bg-green-500" },
  { type: "file", label: "文件", icon: FileText, count: 68, color: "bg-amber-500" },
  { type: "image", label: "图片", icon: Image, count: 31, color: "bg-purple-500" },
];

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function OverviewStatsPanel() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d");
  const models = useProviderStore((s) => s.models);

  const totals = useMemo(() => {
    const convs = mockDaily.reduce((s, d) => s + d.conversations, 0);
    const msgs = mockDaily.reduce((s, d) => s + d.messages, 0);
    return { conversations: convs, messages: msgs };
  }, []);

  const maxMsg = Math.max(...mockDaily.map((d) => d.messages), 1);
  const totalTypes = mockTypeDistribution.reduce((s, t) => s + t.count, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* 日趋势 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">对话活跃趋势</h3>
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
          {/* 折线图 */}
          <div className="relative" style={{ height: "140px" }}>
            <svg viewBox="0 0 300 140" className="h-full w-full" preserveAspectRatio="none">
              {/* 网格线 */}
              <line x1="0" y1="140" x2="300" y2="140" stroke="var(--border)" strokeWidth="0.5" />
              <line x1="0" y1="70" x2="300" y2="70" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 2" />
              <line x1="0" y1="0" x2="300" y2="0" stroke="var(--border)" strokeWidth="0.5" />

              {/* 消息折线 */}
              <polyline
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={mockDaily
                  .map((d, i) => {
                    const x = (i / (mockDaily.length - 1)) * 280 + 10;
                    const y = 130 - (d.messages / maxMsg) * 120;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />

              {/* 对话折线 */}
              <polyline
                fill="none"
                stroke="var(--primary)"
                strokeOpacity="0.3"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 3"
                points={mockDaily
                  .map((d, i) => {
                    const x = (i / (mockDaily.length - 1)) * 280 + 10;
                    const y = 130 - (d.messages / maxMsg) * 120;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>

            {/* 日期标签 */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
              {mockDaily.map((d, i) => (
                <span key={d.date} className="text-muted-foreground text-[10px]">
                  {i % 2 === 0 ? d.date : ""}
                </span>
              ))}
            </div>
          </div>

          {/* 图例 */}
          <div className="text-muted-foreground mt-4 flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              消息数
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-primary/30" />
              对话数
            </div>
          </div>
        </div>
      </div>

      {/* 消息类型分布 */}
      <div>
        <h3 className="mb-3 text-sm font-medium">消息类型分布</h3>
        <div className="rounded-xl border border-border bg-card p-4">
          {mockTypeDistribution.map((t) => {
            const pct = Math.round((t.count / totalTypes) * 100);
            return (
              <div key={t.type} className="mb-3 last:mb-0">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <t.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{t.label}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatNumber(t.count)} · {pct}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${t.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
