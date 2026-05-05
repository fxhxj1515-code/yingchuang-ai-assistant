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

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    setQrUrl(null);

    if (status?.connected || status?.logged_in) {
      // 关闭微信
      try {
        const resp = await appFetch(`${BRIDGE_BASE}/wechat/disable`, { method: "POST" });
        const data = await resp.json();
        if (data.success) {
          await fetchStatus();
        } else {
          setError(data.message || "关闭失败");
        }
      } catch {
        setError("无法连接到 Bridge");
      }
    } else {
      // 开启微信
      try {
        const resp = await appFetch(`${BRIDGE_BASE}/wechat/enable`, { method: "POST" });
        const data = await resp.json();
        if (data.success) {
          if (data.qr_url) {
            setQrUrl(`${BRIDGE_BASE}/wechat/qr?_t=${Date.now()}`);
          }
          // 轮询等连接成功
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
          setError(data.message || "开启失败");
        }
      } catch {
        setError("无法连接到 Bridge (localhost:5050)，请确认桥梁已启动");
      }
    }
    setLoading(false);
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
        <h2 className="text-foreground text-lg font-bold">微信</h2>
      </div>

      {/* 状态卡片 */}
      <div
        className="mb-6 rounded-xl p-4"
        style={{
          backgroundColor: status.connected
            ? "rgba(34,197,94,0.1)"
            : status.enabled && !status.connected
              ? "rgba(234,179,8,0.1)"
              : "rgba(239,68,68,0.1)",
          border: `1px solid ${
            status.connected
              ? "rgba(34,197,94,0.2)"
              : status.enabled && !status.connected
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
                : status.enabled && !status.connected
                  ? "#eab308"
                  : "#6b7280",
            }}
          />
          <span className="text-foreground font-medium">
            {status.connected
              ? "已连接"
              : status.enabled
                ? "连接中..."
                : "未启用"}
          </span>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          {status.connected
            ? "微信已连接，好友消息将由 AI 自动回复"
            : status.enabled
              ? "正在建立消息通道，请在手机上确认..."
              : "点击下方开关开启微信，首次需要扫码登录"}
        </p>
        {qrUrl && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-muted-foreground text-sm">请用手机微信扫描二维码</p>
            <div className="flex items-center justify-center rounded-xl bg-white p-3">
              <img src={qrUrl} alt="微信登录二维码" className="h-44 w-44" />
            </div>
          </div>
        )}
      </div>

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

      {/* 开关按钮 */}
      <div className="mt-auto flex flex-col gap-3">
        <button
          onClick={handleToggle}
          disabled={loading}
          className="w-full rounded-xl py-3 font-medium text-white transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: status.connected || status.logged_in ? "#ef4444" : "var(--primary)",
          }}
        >
          {loading
            ? "处理中..."
            : status.connected || status.logged_in
              ? "关闭微信连接"
              : "开启微信"}
        </button>
        <p className="text-muted-foreground text-center text-xs">
          开启后配置即保存，下次启动 bridge 自动连接
        </p>
        <button onClick={onClose} className="text-muted-foreground py-2 text-sm">
          返回
        </button>
      </div>
    </div>
  );
}
