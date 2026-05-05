import { useState } from "react";
import { Activity } from "lucide-react";
import { runAllChecks, type EnvCheckResult } from "../../services/env-check-service";
import { isDesktop } from "../../lib/platform";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";

// ── Component ──

export function EnvironmentCheck() {
  const [results, setResults] = useState<EnvCheckResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    setDialogOpen(true);

    // Show pending state immediately
    setResults([
      { name: "Ollama", status: "pending", detail: "⏳ 检测中...", hint: "" },
      { name: "桥梁服务 (Bridge)", status: "pending", detail: "⏳ 检测中...", hint: "" },
      { name: "Hermes Agent", status: "pending", detail: "⏳ 检测中...", hint: "" },
    ]);

    const items = await runAllChecks();
    setResults(items);
    setLoading(false);
  };

  const statusIcon = (status: EnvCheckResult["status"]) => {
    switch (status) {
      case "ok":
        return "✅";
      case "fail":
        return "❌";
      case "warn":
        return "⚠️";
      case "pending":
        return "⏳";
    }
  };

  const statusColor = (status: EnvCheckResult["status"]) => {
    switch (status) {
      case "ok":
        return "var(--success)";
      case "fail":
        return "var(--destructive)";
      case "warn":
        return "#f59e0b";
      case "pending":
        return "var(--muted-foreground)";
    }
  };

  const overallStatus =
    results && !loading
      ? results.every((r) => r.status === "ok")
        ? "✅ 所有服务正常运行"
        : results.some((r) => r.status === "fail")
          ? "⚠️ 部分服务未运行"
          : "⚠️ 部分服务异常"
      : "";

  return (
    <>
      {/* Settings Row: 环境检测 */}
      <div
        className="px-5 py-1.5"
        style={{ backgroundColor: "var(--secondary)" }}
      >
        <p className="text-muted-foreground text-[13px] font-semibold">
          本地环境检测
        </p>
      </div>
      <button
        onClick={runCheck}
        disabled={loading}
        className="flex w-full items-center gap-4 px-4 py-3 transition-colors active:bg-black/5"
        style={{ borderBottom: "none" }}
      >
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(34,197,94,0.1)" }}
        >
          <Activity size={18} color="#22c55e" />
        </div>
        <span className="text-foreground flex-1 text-left text-[16px] font-medium">
          检测本地环境
        </span>
        <span className="text-muted-foreground mr-1 text-xs">
          {loading ? "检测中..." : "一键检测"}
        </span>
      </button>

      {/* Results Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            backgroundColor: "var(--background)",
            border: "1px solid var(--border)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-foreground text-[18px]"
              style={{ color: "var(--foreground)" }}
            >
              {loading ? "⏳ 环境检测中..." : "🔍 环境检测结果"}
            </DialogTitle>
            {!loading && overallStatus && (
              <DialogDescription
                className="text-[14px]"
                style={{
                  color:
                    results?.every((r) => r.status === "ok")
                      ? "var(--success)"
                      : results?.some((r) => r.status === "fail")
                        ? "var(--destructive)"
                        : "#f59e0b",
                }}
              >
                {overallStatus}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Results List */}
          <div className="mt-2 space-y-2">
            {results?.map((item) => (
              <div
                key={item.name}
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{
                  backgroundColor:
                    item.status === "pending"
                      ? "color-mix(in srgb, var(--muted) 30%, transparent)"
                      : item.status === "ok"
                        ? "color-mix(in srgb, var(--success) 8%, transparent)"
                        : item.status === "fail"
                          ? "color-mix(in srgb, var(--destructive) 8%, transparent)"
                          : "color-mix(in srgb, #f59e0b 8%, transparent)",
                  border: "0.5px solid",
                  borderColor:
                    item.status === "pending"
                      ? "var(--border)"
                      : item.status === "ok"
                        ? "color-mix(in srgb, var(--success) 20%, transparent)"
                        : item.status === "fail"
                          ? "color-mix(in srgb, var(--destructive) 20%, transparent)"
                          : "color-mix(in srgb, #f59e0b 20%, transparent)",
                }}
              >
                <span className="pt-0.5 text-[18px]">{statusIcon(item.status)}</span>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-foreground block text-[14px] font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="mt-0.5 block text-[13px] leading-relaxed"
                    style={{ color: statusColor(item.status) }}
                  >
                    {item.detail}
                  </span>
                  {item.hint && (
                    <span
                      className="mt-1 block text-[11px] leading-relaxed opacity-70"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      💡 {item.hint}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Spinning indicator while loading */}
          {loading && (
            <div className="flex items-center justify-center py-2">
              <span
                className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
                style={{ color: "var(--primary)" }}
              />
            </div>
          )}

          {/* Action Buttons */}
          {!loading && results && (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {results.some((r) => r.status === "fail") && (
                <button
                  onClick={runCheck}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                  重新检测
                </button>
              )}
              <button
                onClick={() => setDialogOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--muted) 50%, transparent)",
                  color: "var(--foreground)",
                }}
              >
                关闭
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
