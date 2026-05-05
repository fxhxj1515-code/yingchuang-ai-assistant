/**
 * WeChatPage — 微信 iLink Bot 连接管理
 *
 * 通过 localhost:5050 (bridge) 的 WeChat API 实现扫码登录和状态查看。
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { appFetch } from "../../lib/http";

const BRIDGE_BASE = "http://localhost:5050";

interface WeChatStatus {
  enabled: boolean;
  connected: boolean;
  logged_in: boolean;
  message: string;
}

export function WeChatPage({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<WeChatStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await appFetch(`${BRIDGE_BASE}/wechat/status`);
      if (resp.ok) {
        const data: WeChatStatus = await resp.json();
        setStatus(data);
        if (data.connected && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        return data;
      }
    } catch {
      // bridge 可能没启动
    }
    setStatus({ enabled: false, connected: false, logged_in: false, message: "Bridge 未运行" });
    return null;
  }, []);

  useEffect(() => {
    fetchStatus();
    // 轮询状态直到连接成功
    pollRef.current = setInterval(() => {
      fetchStatus();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setQrUrl(null);
    try {
      const resp = await appFetch(`${BRIDGE_BASE}/wechat/login`, {
        method: "POST",
      });
      const data = await resp.json();
      if (data.success) {
        setQrUrl(`${BRIDGE_BASE}/wechat/qr?_t=${Date.now()}`);
        // 轮询等登录成功
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          const s = await fetchStatus();
          if (s?.connected) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setQrUrl(null);
          }
        }, 2000);
      } else {
        setError(data.message || "登录失败");
      }
    } catch (e) {
      setError("无法连接到 Bridge (localhost:5050)，请确认桥梁已启动");
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    // 停止 bridge 的 wechat（通过重启 bridge 实现，或直接清凭证）
    setError("请关闭 bridge 窗口重新启动以断开微信连接");
  };

  if (!status) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">正在连接桥梁服务...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onClose} className="p-2 active:opacity-60">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-foreground text-lg font-bold">微信连接</h2>
      </div>

      {/* 状态卡片 */}
      <div
        className="mb-6 rounded-xl p-4"
        style={{
          backgroundColor: status.connected
            ? "rgba(34,197,94,0.1)"
            : status.logged_in
              ? "rgba(234,179,8,0.1)"
              : "rgba(239,68,68,0.1)",
          border: `1px solid ${
            status.connected
              ? "rgba(34,197,94,0.2)"
              : status.logged_in
                ? "rgba(234,179,8,0.2)"
                : "rgba(239,68,68,0.2)"
          }`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: status.connected
                ? "#22c55e"
                : status.logged_in
                  ? "#eab308"
                  : "#ef4444",
            }}
          />
          <span className="text-foreground font-medium">{status.message}</span>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          {status.connected
            ? "微信已连接，好友消息将由 AI 自动回复"
            : status.logged_in
              ? "已登录但连接中，等待消息通道建立"
              : status.enabled
                ? "请点击下方按钮扫码登录微信"
                : "桥梁未以 --wechat 模式启动"}
        </p>
      </div>

      {/* 二维码 */}
      {qrUrl && (
        <div className="mb-6 flex flex-col items-center gap-3">
          <p className="text-muted-foreground text-sm">请用手机微信扫描下方二维码</p>
          <div
            className="flex items-center justify-center rounded-xl p-4"
            style={{ backgroundColor: "white" }}
          >
            <img src={qrUrl} alt="微信登录二维码" className="h-48 w-48" />
          </div>
          <p className="text-muted-foreground text-xs">二维码有效期约 8 分钟</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          {error}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mt-auto flex flex-col gap-3">
        {!status.connected && (
          <button
            onClick={handleLogin}
            disabled={loading || !status.enabled}
            className="w-full rounded-xl py-3 font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {loading ? "连接中..." : "扫描二维码登录微信"}
          </button>
        )}
        {!status.enabled && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            请使用 <code className="rounded bg-black/10 px-1">local-ai-agent.exe --wechat</code>{" "}
            启动桥梁以启用微信功能
          </div>
        )}
        <button
          onClick={onClose}
          className="text-muted-foreground w-full py-2 text-sm"
        >
          返回
        </button>
      </div>
    </div>
  );
}
