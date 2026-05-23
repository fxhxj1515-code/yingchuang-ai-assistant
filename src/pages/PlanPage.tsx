import { useState, useEffect } from "react";
import { Zap, Sparkles, Check, Loader2, ExternalLink, Copy, Infinity, Coins, Key, Heart } from "lucide-react";
import { getUserPlan, createPlanOrder } from "../services/auth-service";
import { openUrl } from "@tauri-apps/plugin-opener";

type PlanId = "free" | "member";

interface PlanInfo {
  id: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  dailyLimit: string;
  features: string[];
  highlighted?: boolean;
  accent: string;
  accentBg: string;
  accentBorder: string;
}

interface TopupPack {
  tokens: number;
  price: number;
  label: string;
}

const API_BASE = "https://kpo.hwzs.club";

const DEFAULT_PLANS: PlanInfo[] = [
  {
    id: "free", name: "免费版", price: 0, priceLabel: "永久免费",
    description: "每日 20 万 token，DeepSeek+Qwen 够个人日常使用",
    dailyLimit: "每日 20 万 token",
    features: ["DeepSeek Chat 无限用", "千问 Qwen3", "自动选择最优模型", "全天候可用"],
    accent: "#6b7280", accentBg: "color-mix(in srgb, #6b7280 8%, transparent)", accentBorder: "color-mix(in srgb, #6b7280 15%, transparent)",
  },
  {
    id: "member", name: "会员版", price: 9.9, priceLabel: "¥9.9 / 月",
    description: "AI 不限量 + 服务器维护 + 持续功能更新",
    dailyLimit: "不限量",
    features: ["无限 AI 对话", "协作空间", "微信 Bot", "SSH 运维", "记忆系统", "服务器维护支持", "持续功能更新"],
    highlighted: true,
    accent: "#3b82f6", accentBg: "color-mix(in srgb, #3b82f6 10%, transparent)", accentBorder: "color-mix(in srgb, #3b82f6 25%, transparent)",
  },
];

const DEFAULT_TOPUP: TopupPack[] = [
  { tokens: 3000000, price: 9.9, label: "小补给包 · 300 万 token" },
  { tokens: 15000000, price: 29.9, label: "中补给包 · 1500 万 token" },
  { tokens: 40000000, price: 99, label: "大补给包 · 4000 万 token" },
];

export function PlanPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanInfo[]>(DEFAULT_PLANS);
  const [topups, setTopups] = useState<TopupPack[]>(DEFAULT_TOPUP);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingPlan, setPayingPlan] = useState<PlanInfo | null>(null);
  const [payingTopup, setPayingTopup] = useState<TopupPack | null>(null);
  const [payStatus, setPayStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [payError, setPayError] = useState("");
  const [payUrl, setPayUrl] = useState("");
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadPlan(); }, []);

  const loadPlan = async () => {
    const plan = await getUserPlan();
    if (plan) setCurrentPlan(plan.plan_type as PlanId);
    try {
      const resp = await fetch(API_BASE + "/api/ai/plans");
      const data = await resp.json();
      if (data.code === 200 && data.data) {
        const apiPlans = data.data;
        setPlans(DEFAULT_PLANS.map(p => {
          const ap = apiPlans.find((a: any) => a.id === p.id);
          if (ap) {
            return { ...p, price: ap.price, priceLabel: ap.price > 0 ? `¥${ap.price} / 月` : "永久免费" };
          }
          return p;
        }));
      }
    } catch { /* use defaults */ }
    try {
      const resp = await fetch(API_BASE + "/api/billing/pricing");
      const data = await resp.json();
      if (data.success && data.data?.subscription_plans?.topup_packs) {
        setTopups(data.data.subscription_plans.topup_packs);
      }
    } catch { /* use defaults */ }
    setLoading(false);
  };

  const handleUpgrade = (plan: PlanInfo) => {
    if (plan.id === currentPlan || plan.id === "free") return;
    setPayingPlan(plan);
    setPayingTopup(null);
    setPayStatus("idle");
    setPayError("");
    setPayUrl("");
    setShowPayModal(true);
  };

  const handleTopup = (pack: TopupPack) => {
    setPayingPlan(null);
    setPayingTopup(pack);
    setPayStatus("idle");
    setPayError("");
    setPayUrl("");
    setShowPayModal(true);
  };

  const handlePay = async () => {
    setPayStatus("loading");
    if (payingPlan) {
      const order = await createPlanOrder(payingPlan.id);
      if (order) {
        setPayUrl(order.code_url);
        setPayStatus("idle");
        const timer = setInterval(async () => {
          const plan = await getUserPlan();
          if (plan?.plan_type === payingPlan.id) {
            clearInterval(timer);
            setPayStatus("success");
            setCurrentPlan(plan.plan_type as PlanId);
            setTimeout(() => setShowPayModal(false), 2000);
          }
        }, 4000);
        setPollTimer(timer);
      } else {
        setPayError("创建订单失败");
        setPayStatus("error");
      }
    }
  };

  const closeModal = () => {
    if (pollTimer) clearInterval(pollTimer);
    setShowPayModal(false);
    setPayUrl("");
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
      <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
    </div>;
  }

  const formatTokens = (n: number) => n >= 10000 ? (n / 10000).toFixed(0) + " 万" : n.toLocaleString();

  return (
    <div className="h-full overflow-y-auto px-5 py-6" style={{ backgroundColor: "var(--background)" }}>
      <div className="mb-6 text-center">
        <h2 className="text-[22px] font-bold flex items-center justify-center gap-2" style={{ color: "var(--foreground)" }}>
          <Heart size={22} style={{ color: "#ef4444" }} /> 每月 ¥9.9，永不涨价
        </h2>
        <p className="mt-1.5 text-[14px]" style={{ color: "var(--muted-foreground)" }}>覆盖服务器维护成本和持续更新，AI 对话不限量</p>
      </div>

      {/* 两档对比 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div key={plan.id} className="relative rounded-2xl p-4 text-center transition-all"
              style={{ backgroundColor: plan.accentBg, border: `1.5px solid ${plan.highlighted ? plan.accent + "80" : plan.accentBorder}` }}>
              {isCurrent && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <span className="rounded-full px-3 py-0.5 text-[11px] font-medium" style={{ backgroundColor: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>当前</span>
                </div>
              )}
              {plan.highlighted && !isCurrent && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <span className="rounded-full px-3 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: plan.accent }}>推荐</span>
                </div>
              )}
              <div className="flex justify-center mt-1">{plan.id === "member" ? <Sparkles size={24} color={plan.accent} /> : <Zap size={24} color={plan.accent} />}</div>
              <h3 className="mt-2 text-[16px] font-bold" style={{ color: "var(--foreground)" }}>{plan.name}</h3>
              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span className="text-[28px] font-bold" style={{ color: plan.accent }}>{plan.price === 0 ? "免费" : `¥${plan.price}`}</span>
                <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>{plan.priceLabel}</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{plan.description}</p>
              <div className="mt-3 py-2 rounded-xl" style={{ backgroundColor: "var(--secondary)" }}>
                <p className="text-[14px] font-semibold" style={{ color: "var(--foreground)" }}>{plan.dailyLimit}</p>
              </div>
              <div className="mt-3 space-y-1.5 text-left">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]" style={{ color: "var(--foreground)" }}>
                    <Check size={12} style={{ color: plan.accent, flexShrink: 0 }} /><span>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => handleUpgrade(plan)} disabled={isCurrent}
                className="mt-4 w-full rounded-xl py-2.5 text-[14px] font-semibold transition-all active:scale-[0.98] disabled:cursor-default"
                style={{ backgroundColor: isCurrent ? "var(--secondary)" : plan.accent, color: isCurrent ? "var(--muted-foreground)" : "#fff", opacity: isCurrent ? 0.6 : 1 }}>
                {isCurrent ? "当前套餐" : plan.id === "free" ? "默认套餐" : `开通会员 · ¥${plan.price}/月`}
              </button>
            </div>
          );
        })}
      </div>

      {/* 加量包 */}
      <h3 className="mb-3 text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
        <Coins size={17} style={{ color: "#f59e0b" }} /> 加量包（永久有效 · 不用订阅）
      </h3>
      <p className="mb-3 text-[12px]" style={{ color: "var(--muted-foreground)" }}>一次性购买，永不过期。免费额度不够时自动扣除。</p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {topups.map((pack, i) => (
          <button key={i} onClick={() => handleTopup(pack)}
            className="rounded-xl p-3 text-center transition-all active:scale-[0.97] hover:opacity-90"
            style={{ backgroundColor: "var(--secondary)", border: "1.5px solid var(--border)" }}>
            <p className="text-[13px] font-bold" style={{ color: "var(--foreground)" }}>¥{pack.price}</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>{formatTokens(pack.tokens)} token</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#f59e0b" }}>永久有效</p>
          </button>
        ))}
      </div>

      {/* BYOK */}
      <h3 className="mb-2 text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
        <Key size={17} style={{ color: "#22c55e" }} /> 自带 API Key · 全功能免费
      </h3>
      <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: "color-mix(in srgb, #22c55e 6%, transparent)", border: "1px solid color-mix(in srgb, #22c55e 15%, transparent)" }}>
        <p className="text-[13px]" style={{ color: "var(--foreground)" }}>接入你自己的 API Key → 全部模型不限量，无需付费</p>
        <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>支持 OpenAI / DeepSeek / Groq 等兼容 API。Key 只存本地，不上传。</p>
      </div>

      {/* USDT Payment */}
      <h3 className="mb-2 text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
        <Coins size={17} style={{ color: "#26a17b" }} /> USDT 支付（国际用户 / Người dùng quốc tế）
      </h3>
      <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: "color-mix(in srgb, #26a17b 6%, transparent)", border: "1px solid color-mix(in srgb, #26a17b 15%, transparent)" }}>
        <p className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>TRC20 转账地址</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded-lg px-3 py-2 text-[12px] break-all select-all" style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)", fontFamily: "monospace" }}>
            TPZ6wpdCCVDiGEf39vAM421k2aTNzRC3Rh
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText("TPZ6wpdCCVDiGEf39vAM421k2aTNzRC3Rh"); }}
            className="rounded-lg px-3 py-2 text-[12px] font-medium transition-all active:scale-[0.97]"
            style={{ backgroundColor: "#26a17b", color: "#fff", whiteSpace: "nowrap" }}
          >
            <Copy size={14} className="inline mr-1" />复制
          </button>
        </div>
        <p className="mt-3 text-[12px]" style={{ color: "var(--muted-foreground)" }}>转账后联系客服开通，提供交易哈希即可。支持任意金额，1 USDT ≈ 1 美元。</p>
        <p className="mt-1 text-[11px]" style={{ color: "var(--muted-foreground)" }}>Sau khi chuyển khoản, liên hệ CSKH để kích hoạt, cung cấp transaction hash. 1 USDT ≈ 1 USD.</p>
      </div>

      {/* Payment Modal */}
      {showPayModal && payingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={closeModal}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold" style={{ color: "var(--foreground)" }}>开通会员</h3>
            <p className="mt-1 text-[14px]" style={{ color: "var(--muted-foreground)" }}>
              <span style={{ color: payingPlan.accent, fontWeight: 600 }}>{payingPlan.name}</span> · {payingPlan.priceLabel} · {payingPlan.description}
            </p>
            {payStatus === "idle" && !payUrl && (
              <button onClick={handlePay} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-semibold text-white transition-all active:scale-[0.98]" style={{ backgroundColor: payingPlan.accent }}>
                <ExternalLink size={16} />创建支付订单
              </button>
            )}
            {payUrl && payStatus === "idle" && (
              <div className="mt-4 space-y-3">
                <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl" style={{ backgroundColor: "#fff", border: "1px solid var(--border)" }}>
                  <div className="text-center px-3">
                    <p className="text-[13px] font-bold mb-2" style={{ color: "#333" }}>微信扫码支付</p>
                    <p className="text-[20px] font-bold" style={{ color: payingPlan.accent }}>¥{payingPlan.price}</p>
                    <p className="text-[10px] mt-2" style={{ color: "#999", wordBreak: "break-all" }}>{payUrl.substring(0, 45)}...</p>
                  </div>
                </div>
                <button onClick={() => openUrl(payUrl)} className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-medium text-white transition-all active:scale-[0.98]" style={{ backgroundColor: "#07c160" }}>
                  <ExternalLink size={16} />打开微信支付
                </button>
                <button onClick={() => navigator.clipboard.writeText(payUrl)} className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[13px] transition-all" style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}>
                  <Copy size={14} />复制支付链接
                </button>
                <p className="text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>支付后自动刷新状态</p>
              </div>
            )}
            {payStatus === "loading" && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl py-3" style={{ backgroundColor: "var(--secondary)" }}>
                <Loader2 size={18} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
                <span className="text-[14px]" style={{ color: "var(--muted-foreground)" }}>创建订单中...</span>
              </div>
            )}
            {payStatus === "success" && (
              <div className="mt-4 rounded-xl p-4 text-center" style={{ backgroundColor: "color-mix(in srgb, #22c55e 10%, transparent)" }}>
                <Check size={28} style={{ color: "#22c55e", margin: "0 auto 4px" }} />
                <p className="text-[14px] font-medium" style={{ color: "#22c55e" }}>支付成功！会员已开通</p>
              </div>
            )}
            {payStatus === "error" && (
              <div className="mt-4">
                <p className="mb-3 text-center text-[13px]" style={{ color: "var(--destructive)" }}>{payError}</p>
                <button onClick={() => setPayStatus("idle")} className="w-full rounded-xl py-2.5 text-[14px] font-medium" style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}>重试</button>
              </div>
            )}
            {payStatus !== "loading" && (
              <button onClick={closeModal} className="mt-2 w-full rounded-xl py-2.5 text-[14px]" style={{ backgroundColor: "transparent", color: "var(--muted-foreground)" }}>取消</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
