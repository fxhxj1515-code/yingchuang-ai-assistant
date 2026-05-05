/**
 * Device Service — 设备注册与设备ID管理
 *
 * 为映创AI助手提供设备身份识别，支持付费墙（paywall）功能。
 * 客户端启动时自动注册设备，后续每次API请求自动携带设备ID。
 */
import { kvStore } from "../storage/kv-store";
import { appFetch } from "../lib/http";

const DEVICE_ID_KEY = "device_id";
const DEVICE_REGISTERED_KEY = "device_registered";
const YINGCHUANG_API_BASE = "https://hwzs.club/api/ai/v1";

function generateUuid(): string {
  // 生成 UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 获取设备ID（本地生成，持久化存储）
 */
export function getDeviceId(): string {
  let deviceId = kvStore.getString(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateUuid();
    kvStore.set(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * 向云API注册设备（首次启动时执行一次）
 */
export async function registerDevice(): Promise<boolean> {
  const alreadyRegistered = kvStore.getString(DEVICE_REGISTERED_KEY);
  if (alreadyRegistered === "1") return true;

  const deviceId = getDeviceId();
  try {
    const resp = await appFetch(`${YINGCHUANG_API_BASE}/v1/api/register-device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
      signal: AbortSignal.timeout(10000),
    });
    if (resp.ok) {
      kvStore.set(DEVICE_REGISTERED_KEY, "1");
      console.log("[DeviceService] 设备注册成功:", deviceId);
      return true;
    }
    console.warn("[DeviceService] 设备注册失败:", resp.status);
    return false;
  } catch (err) {
    console.warn("[DeviceService] 设备注册异常:", err);
    return false;
  }
}

/**
 * 确保设备已注册（应用启动时调用，不阻塞启动流程）
 */
export function ensureDeviceRegistered(): void {
  const alreadyRegistered = kvStore.getString(DEVICE_REGISTERED_KEY);
  if (alreadyRegistered === "1") {
    // 已注册过，静默通过
    return;
  }
  // 异步注册，不阻塞
  registerDevice().catch(() => {});
}

/**
 * 重置设备ID（用于调试/测试）
 */
export function resetDeviceId(): void {
  kvStore.delete(DEVICE_ID_KEY);
  kvStore.delete(DEVICE_REGISTERED_KEY);
}
