/**
 * 快捷键增强面板 — D2
 * 按 ? 呼出，展示所有全局快捷键，支持搜索
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Command, ArrowUp } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  label: string;
  category: string;
}

// 根据平台显示正确的修饰键符号
const modKey = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘" : "Ctrl";

const shortcuts: ShortcutItem[] = [
  // 对话
  { keys: [modKey, "N"], label: "新建对话", category: "对话" },
  { keys: [modKey, "W"], label: "关闭对话", category: "对话" },
  // 导航
  { keys: [modKey, "Shift", "S"], label: "打开设置", category: "导航" },
  { keys: [modKey, ","], label: "打开设置", category: "导航" },
  { keys: [modKey, "K"], label: "快速搜索", category: "导航" },
  // 快捷键面板
  { keys: ["?"], label: "显示快捷键", category: "通用" },
  { keys: ["Esc"], label: "关闭弹层", category: "通用" },
  // 编辑
  { keys: [modKey, "Enter"], label: "发送消息", category: "编辑" },
  { keys: ["Shift", "Enter"], label: "换行", category: "编辑" },
  { keys: [modKey, "B"], label: "加粗", category: "编辑" },
  { keys: [modKey, "I"], label: "斜体", category: "编辑" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyboardCheatsheet({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [handleEsc]);

  if (!open) return null;

  const filtered = query.trim()
    ? shortcuts.filter(
        (s) =>
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.keys.join(" ").toLowerCase().includes(query.toLowerCase()) ||
          s.category.includes(query),
      )
    : shortcuts;

  const categories = [...new Set(filtered.map((s) => s.category))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 遮罩 */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 面板 */}
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        {/* 搜索栏 */}
        <div className="border-border flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索快捷键..."
            className="text-foreground placeholder:text-muted-foreground/50 flex-1 bg-transparent text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-md p-1 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 快捷键列表 */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {categories.map((cat) => (
            <div key={cat} className="mb-1">
              <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium uppercase tracking-wide">
                {cat}
              </div>
              {filtered
                .filter((s) => s.category === cat)
                .map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50"
                  >
                    <span className="text-sm">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <span
                          key={i}
                          className="bg-muted text-muted-foreground inline-flex h-6 min-w-[22px] items-center justify-center rounded-md border border-border px-1.5 text-xs font-medium"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-muted-foreground py-8 text-center text-sm">无匹配快捷键</div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="border-border text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
          <div className="flex items-center gap-1">
            <ArrowUp className="h-3 w-3" />
            输入搜索
          </div>
          <div>Esc 关闭</div>
        </div>
      </div>
    </div>
  );
}
