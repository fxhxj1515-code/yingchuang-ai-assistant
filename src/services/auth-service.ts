/**
 * Auth Service — 手机验证码登录/登出
 *
 * 对接映创云统一用户系统 (hwzs.club/login-api)
 */
import { kvStore } from "../storage/kv-store";
import { appFetch } from "../lib/http";

const LOGIN_API_BASE = "https://hwzs.club/login-api";

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_PHONE_KEY = "auth_phone";
const AUTH_USER_ID_KEY = "auth_user_id";

// ── Internal helpers ──

function getToken(): string | null {
  return kvStore.getString(AUTH_TOKEN_KEY);
}

function getPhone(): string | null {
  return kvStore.getString(AUTH_PHONE_KEY);
}

// ── Public API ──

/**
 * 发送短信验证码到指定手机号
 */
export async function sendCode(phone: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const resp = await appFetch(`${LOGIN_API_BASE}/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await resp.json();
    if (resp.ok && data.code === 0) {
      return { ok: true };
    }
    return { ok: false, message: data.message ?? `发送失败 (${resp.status})` };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "网络错误" };
  }
}

/**
 * 验证短信验证码并登录，返回 token 和 user_id
 */
export async function verifyCode(
  phone: string,
  code: string,
): Promise<{ ok: boolean; token?: string; userId?: string; message?: string }> {
  try {
    const resp = await appFetch(`${LOGIN_API_BASE}/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await resp.json();
    if (resp.ok && data.code === 0) {
      const token = data.data?.token ?? data.token;
      const userId = data.data?.user_id ?? data.user_id ?? data.data?.userId;
      if (token) {
        kvStore.set(AUTH_TOKEN_KEY, token);
        kvStore.set(AUTH_PHONE_KEY, phone);
        if (userId) kvStore.set(AUTH_USER_ID_KEY, String(userId));
        return { ok: true, token, userId };
      }
      return { ok: false, message: "登录成功但未获取到token" };
    }
    return { ok: false, message: data.message ?? `验证失败 (${resp.status})` };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "网络错误" };
  }
}

/**
 * 检查当前 token 是否有效
 */
export async function checkLogin(): Promise<{ loggedIn: boolean; phone?: string }> {
  const token = getToken();
  if (!token) return { loggedIn: false };

  try {
    const resp = await appFetch(`${LOGIN_API_BASE}/check-login`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json();
    if (resp.ok && data.code === 0) {
      return { loggedIn: true, phone: getPhone() ?? undefined };
    }
    // Token expired or invalid — clean up
    if (resp.status === 401) {
      kvStore.delete(AUTH_TOKEN_KEY);
      kvStore.delete(AUTH_USER_ID_KEY);
    }
    return { loggedIn: false };
  } catch {
    // Network error — assume still logged in (don't force re-login)
    const phone = getPhone();
    return { loggedIn: true, phone: phone ?? undefined };
  }
}

/**
 * 获取用户积分/点数余额
 */
export async function getUserCredits(): Promise<{
  credits: number;
  message?: string;
}> {
  const token = getToken();
  if (!token) return { credits: 0, message: "未登录" };

  try {
    const resp = await appFetch(`${LOGIN_API_BASE}/user-credits`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json();
    if (resp.ok && data.code === 0) {
      return { credits: data.data?.credits ?? data.credits ?? 0 };
    }
    return { credits: 0, message: data.message ?? "获取失败" };
  } catch (err: any) {
    return { credits: 0, message: err?.message ?? "网络错误" };
  }
}

/**
 * 获取用户订单列表
 */
export async function getUserOrders(): Promise<{
  orders: any[];
  message?: string;
}> {
  const token = getToken();
  if (!token) return { orders: [], message: "未登录" };

  try {
    const resp = await appFetch(`${LOGIN_API_BASE}/user-orders`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json();
    if (resp.ok && data.code === 0) {
      return { orders: data.data?.orders ?? data.orders ?? [] };
    }
    return { orders: [], message: data.message ?? "获取失败" };
  } catch (err: any) {
    return { orders: [], message: err?.message ?? "网络错误" };
  }
}

/**
 * 登出：清除本地存储的认证信息
 */
export function logout(): void {
  kvStore.delete(AUTH_TOKEN_KEY);
  kvStore.delete(AUTH_PHONE_KEY);
  kvStore.delete(AUTH_USER_ID_KEY);
}

/**
 * 获取 HTTP Authorization headers（用于 API 请求注入）
 * 返回空对象表示无认证信息，调用方自行决定是否附加
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * 获取当前已登录手机号（不带 token 检查）
 */
export function getLoggedInPhone(): string | null {
  return getPhone();
}
