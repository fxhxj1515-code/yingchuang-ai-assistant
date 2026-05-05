import { useState, useEffect } from "react";
import { User, LogOut, DollarSign, Send, Loader2 } from "lucide-react";
import {
  sendCode,
  verifyCode,
  checkLogin,
  logout,
  getUserCredits,
  getLoggedInPhone,
} from "../../services/auth-service";

type PageState = "loading" | "login" | "logged-in";

export function AccountPage() {
  const [state, setState] = useState<PageState>("loading");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [logging, setLogging] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [error, setError] = useState("");

  // Check login status on mount
  useEffect(() => {
    (async () => {
      const result = await checkLogin();
      if (result.loggedIn) {
        setPhone(result.phone ?? getLoggedInPhone() ?? "");
        setState("logged-in");
        fetchCredits();
      } else {
        setState("login");
      }
    })();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const fetchCredits = async () => {
    setCreditsLoading(true);
    const result = await getUserCredits();
    setCredits(result.credits);
    setCreditsLoading(false);
  };

  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      setError("请输入正确的手机号");
      return;
    }
    setError("");
    setSending(true);
    const result = await sendCode(phone);
    setSending(false);
    if (result.ok) {
      setCodeSent(true);
      setCountdown(60);
    } else {
      setError(result.message ?? "发送失败");
    }
  };

  const handleLogin = async () => {
    if (!code || code.length < 4) {
      setError("请输入验证码");
      return;
    }
    setError("");
    setLogging(true);
    const result = await verifyCode(phone, code);
    setLogging(false);
    if (result.ok) {
      setState("logged-in");
      fetchCredits();
    } else {
      setError(result.message ?? "登录失败");
    }
  };

  const handleLogout = () => {
    logout();
    setState("login");
    setPhone("");
    setCode("");
    setCodeSent(false);
    setCredits(null);
    setError("");
  };

  // ── Login form ──
  if (state === "loading") {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ backgroundColor: "var(--background)" }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
      </div>
    );
  }

  if (state === "login") {
    return (
      <div
        className="flex h-full flex-col px-5 pt-6"
        style={{ backgroundColor: "var(--background)" }}
      >
        {/* Title */}
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(59,130,246,0.1)" }}
          >
            <User size={28} color="#3b82f6" />
          </div>
          <h2
            className="text-[20px] font-bold"
            style={{ color: "var(--foreground)" }}
          >
            账号登录
          </h2>
          <p
            className="mt-1 text-[14px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            登录后可查看积分余额并使用全部功能
          </p>
        </div>

        {/* Phone input */}
        <div className="mb-4">
          <label
            className="mb-1.5 block text-[13px] font-medium"
            style={{ color: "var(--foreground)" }}
          >
            手机号
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError("");
            }}
            placeholder="请输入手机号"
            maxLength={20}
            className="w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-colors"
            style={{
              backgroundColor: "var(--secondary)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          />
        </div>

        {/* Send code button */}
        <button
          onClick={handleSendCode}
          disabled={sending || countdown > 0}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            backgroundColor: countdown > 0
              ? "color-mix(in srgb, var(--muted) 50%, transparent)"
              : "rgba(59,130,246,0.1)",
            color: countdown > 0 ? "var(--muted-foreground)" : "#3b82f6",
          }}
        >
          {sending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              发送中...
            </>
          ) : countdown > 0 ? (
            `${countdown}s 后重新发送`
          ) : codeSent ? (
            <>
              <Send size={16} />
              重新发送验证码
            </>
          ) : (
            <>
              <Send size={16} />
              发送验证码
            </>
          )}
        </button>

        {/* Code input */}
        <div className="mb-5">
          <label
            className="mb-1.5 block text-[13px] font-medium"
            style={{ color: "var(--foreground)" }}
          >
            验证码
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            placeholder="请输入验证码"
            maxLength={10}
            className="w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-colors"
            style={{
              backgroundColor: "var(--secondary)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          />
        </div>

        {/* Error message */}
        {error && (
          <p
            className="mb-4 text-center text-[13px]"
            style={{ color: "var(--destructive)" }}
          >
            {error}
          </p>
        )}

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={logging || !code || !phone}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: "#3b82f6" }}
        >
          {logging ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              登录中...
            </>
          ) : (
            "登录"
          )}
        </button>
      </div>
    );
  }

  // ── Logged in view ──
  return (
    <div
      className="flex h-full flex-col px-5 pt-6"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Account info card */}
      <div
        className="mb-6 rounded-xl p-5 text-center"
        style={{
          backgroundColor: "color-mix(in srgb, var(--primary) 5%, transparent)",
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <div
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(59,130,246,0.15)" }}
        >
          <User size={28} color="#3b82f6" />
        </div>
        <p
          className="text-[13px] font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          已登录账号
        </p>
        <p
          className="mt-1 text-[18px] font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}
        </p>
      </div>

      {/* Credits card */}
      <div
        className="mb-6 rounded-xl p-5"
        style={{
          backgroundColor: "color-mix(in srgb, #f59e0b 8%, transparent)",
          border: "1px solid color-mix(in srgb, #f59e0b 15%, transparent)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(245,158,11,0.15)" }}
          >
            <DollarSign size={20} color="#f59e0b" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[13px] font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              剩余积分
            </p>
            <div className="flex items-center gap-2">
              {creditsLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                  style={{ color: "var(--muted-foreground)" }}
                />
              ) : (
                <p
                  className="text-[22px] font-bold"
                  style={{ color: "#f59e0b" }}
                >
                  {credits !== null ? credits.toLocaleString() : "—"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={fetchCredits}
            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors active:opacity-70"
            style={{
              backgroundColor: "color-mix(in srgb, #f59e0b 15%, transparent)",
              color: "#f59e0b",
            }}
          >
            刷新
          </button>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-semibold transition-all active:scale-[0.98]"
        style={{
          backgroundColor: "color-mix(in srgb, var(--destructive) 10%, transparent)",
          color: "var(--destructive)",
        }}
      >
        <LogOut size={18} />
        退出登录
      </button>
    </div>
  );
}
