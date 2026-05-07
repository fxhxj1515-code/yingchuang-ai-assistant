/**
 * 首页 HomePage — B8
 * 桌面端无会话时的欢迎页，展示套餐状态、快捷操作、功能入口
 */
import { useMemo, useState } from "react";
import {
  MessagesSquare,
  Box,
  Sparkles,
  Zap,
  Globe,
  BookOpen,
  MessageCircle,
  ArrowRight,
  Plus,
  LayoutTemplate,
  FlaskConical,
  FileText,
  Code,
  Lightbulb,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@web/components/ui/button";
import { PlanStatusBadge, type PlanStatus } from "@web/components/shared/PlanStatusBadge";
import { OverseasStatusBadge, type OverseasStatus } from "@web/components/shared/OverseasStatusBadge";
import { useChatStore, type ChatState } from "@web/stores/chat-store";
import { useProviderStore } from "@web/stores/provider-store";
import { useNavigate } from "react-router-dom";
import type { Model } from "@web/types";

interface HomePageProps {
  onNewChat: () => void;
  onCreateGroup: () => void;
  onNavigateToChat?: (convId: string) => void;
  onNavigateToStats?: () => void;
}

/**
 * 模拟状态 —— 接入真实 store 后替换
 * planStatus 来自 useSettingsStore 或 API
 * overseasStatus 来自 VPN service
 */
function useMockStatus() {
  const models = useProviderStore((s) => s.models);
  const hasOverseas = models.some(
    (m: Model) => m.id.includes("gpt") || m.id.includes("claude") || m.id.includes("gemini"),
  );
  const hasLocal = models.some((m: Model) => m.id.includes("local") || m.id.includes("ollama"));

  const planStatus: PlanStatus = useMemo(() => {
    if (hasOverseas && hasLocal) return { plan: "pro" };
    if (hasOverseas) return { plan: "standard" };
    return { plan: "free" };
  }, [hasOverseas, hasLocal]);

  const overseasStatus: OverseasStatus = hasOverseas ? "connected" : "locked";

  return { planStatus, overseasStatus };
}

const featureCards = [
  {
    id: "chat",
    icon: MessagesSquare,
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "experts",
    icon: Box,
    color: "from-purple-500 to-pink-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
  },
  {
    id: "discover",
    icon: Sparkles,
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    id: "knowledge",
    icon: BookOpen,
    color: "from-green-500 to-emerald-500",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
  },
  {
    id: "wechat",
    icon: MessageCircle,
    color: "from-sky-500 to-blue-500",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800",
  },
];

export function HomePage({ onNewChat, onCreateGroup, onNavigateToChat, onNavigateToStats }: HomePageProps) {
  const { t } = useTranslation();
  const { planStatus, overseasStatus } = useMockStatus();
  const navigate = useNavigate();
  const createConversation = useChatStore((s: ChatState) => s.createConversation);
  const models = useProviderStore((s) => s.models);
  const enabledModels = models.filter((m: Model) => m.enabled);

  const handleQuickStart = async (section: string) => {
    if (section === "chat") {
      onNewChat();
      return;
    }
    if (section === "experts") {
      // 直接创建第一个可用模型的会话
      if (enabledModels.length > 0) {
        const conv = await createConversation(enabledModels[0].id);
        if (onNavigateToChat) onNavigateToChat(conv.id);
        else navigate(`/chat/${conv.id}`);
      }
      return;
    }
    // 其他 section 通过 DesktopLayout 切换
    // 这里只处理快捷操作，切换由父组件负责
  };

  const cardLabels: Record<string, { title: string; desc: string }> = {
    chat: { title: t("tabs.chats"), desc: "与AI模型自由对话" },
    experts: { title: t("tabs.models"), desc: "选择或配置AI模型" },
    discover: { title: t("tabs.personas"), desc: "发现有趣的AI角色" },
    knowledge: { title: "知识库", desc: "管理个人知识库" },
    wechat: { title: "微信Bot", desc: "连接微信公众号" },
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-center overflow-y-auto px-6 py-12">
      {/* Logo + 标题 */}
      <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
        <MessagesSquare className="h-10 w-10 text-white" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Talkio</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        你的AI助手，支持多模型对话、智能体群聊、本地模型
      </p>

      {/* 状态栏 */}
      <div className="mt-6 flex items-center gap-3">
        <PlanStatusBadge status={planStatus} />
        <OverseasStatusBadge status={overseasStatus} />
      </div>

      {/* 快捷操作 */}
      <div className="mt-10 w-full">
        <h3 className="text-foreground mb-3 text-sm font-semibold">快速开始</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* 新建对话 */}
          <button
            onClick={onNewChat}
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium">新建对话</span>
          </button>

          {/* 群聊模板 */}
          <button
            onClick={onCreateGroup}
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <LayoutTemplate className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium">群聊模板</span>
          </button>

          {/* 发现角色 */}
          <button
            onClick={() => navigate("/discover")}
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium">发现角色</span>
          </button>
        </div>
      </div>

      {/* 功能卡片 */}
      <div className="mt-8 w-full">
        <h3 className="text-foreground mb-3 text-sm font-semibold">功能入口</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {featureCards.map(({ id, icon: Icon, color, bg, border }) => {
            const label = cardLabels[id];
            if (!label) return null;
            return (
              <button
                key={id}
                onClick={() => handleQuickStart(id)}
                className={`flex items-center gap-3 rounded-xl border ${bg} ${border} p-4 transition-all hover:shadow-md`}
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium">{label.title}</p>
                  <p className="text-muted-foreground text-xs">{label.desc}</p>
                </div>
                <ArrowRight className="text-muted-foreground ml-auto h-4 w-4 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 套餐提示（免费版时显示） */}
      {planStatus.plan === "free" && (
        <div className="mt-8 w-full rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">升级解锁更多功能</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                升级至标准版即可使用 ChatGPT、Claude、Gemini 等海外模型，专业版更支持本地模型和智能体群聊。
              </p>
              <Button size="sm" className="mt-3 gap-1" variant="default">
                查看套餐 <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 数据摘要区 C5 */}
      <div className="mt-8 w-full">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-foreground text-sm font-semibold">数据摘要</h3>
          {onNavigateToStats && (
            <button
              onClick={onNavigateToStats}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
            >
              查看完整数据 <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-muted-foreground mb-1 text-xs">今日对话</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold">--</span>
              <span className="text-muted-foreground text-xs">次</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500 text-xs">--</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-muted-foreground mb-1 text-xs">今日Token</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold">--</span>
              <span className="text-muted-foreground text-xs">K</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="text-muted-foreground text-xs">本月累计 | 查看</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-muted-foreground mb-1 text-xs">最常用模型</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold">--</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <MessagesSquare className="h-3 w-3 text-blue-500" />
              <span className="text-muted-foreground text-xs">-- 次调用</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1" />
      <p className="text-muted-foreground/50 mt-8 text-xs">Talkio v3 · 由映创科技提供</p>
    </div>
  );
}
