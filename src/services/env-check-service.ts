/**
 * Environment Check Service
 *
 * One-click detection of local AI tools.
 * Checks: Ollama, Bridge service, Hermes Agent (via WSL).
 *
 * Usage:
 *   import { runAllChecks, type EnvCheckResult } from "../../services/env-check-service";
 *   const results = await runAllChecks();
 */

// ── Types ──

export interface EnvCheckResult {
  name: string;
  status: "ok" | "fail" | "warn" | "pending";
  detail: string;
  hint: string;
}

// ── Check Functions ──

/**
 * Check if Ollama is running by hitting its API.
 * Returns status with model count on success.
 */
export async function checkOllama(signal?: AbortSignal): Promise<EnvCheckResult> {
  try {
    const res = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: signal ?? AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = data.models ?? [];
    const count = models.length;
    if (count > 0) {
      return {
        name: "Ollama",
        status: "ok",
        detail: `✅ 运行中 — ${count} 个模型可用`,
        hint: "",
      };
    }
    return {
      name: "Ollama",
      status: "ok",
      detail: "✅ 运行中 — 暂无模型",
      hint: "请使用 ollama pull <模型名> 下载模型，如: ollama pull llama3",
    };
  } catch {
    return {
      name: "Ollama",
      status: "fail",
      detail: "❌ 未运行",
      hint: "请确保 Ollama 已安装并运行\n下载地址: https://ollama.com/download\n安装后执行: ollama serve",
    };
  }
}

/**
 * Check if the Bridge service (agent bridge) is running.
 * Returns status with agent count on success.
 */
export async function checkBridge(signal?: AbortSignal): Promise<EnvCheckResult> {
  try {
    const res = await fetch("http://localhost:5050/v1/models", {
      method: "GET",
      signal: signal ?? AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const models = data.data ?? [];
    const count = models.length;
    if (count > 0) {
      const names = models
        .slice(0, 5)
        .map((m: any) => m.id || m.name || "")
        .filter(Boolean)
        .join(", ");
      return {
        name: "桥梁服务 (Bridge)",
        status: "ok",
        detail: `✅ 运行中 — ${count} 个智能体 (${names}${count > 5 ? "..." : ""})`,
        hint: "",
      };
    }
    return {
      name: "桥梁服务 (Bridge)",
      status: "ok",
      detail: "✅ 运行中 — 暂无智能体",
      hint: "Bridge 可接入 Claude Code、Codex CLI 等 Agent",
    };
  } catch {
    return {
      name: "桥梁服务 (Bridge)",
      status: "fail",
      detail: "❌ 未运行",
      hint: "请确保本地 Bridge 服务已启动 (默认端口 5050)\n请运行: bridge serve",
    };
  }
}

/**
 * Check if Hermes Agent is available.
 * Tries Bridge first (if Bridge is up, checks for Hermes in its model list).
 * Falls back to checking via WSL shell command (Tauri only).
 */
export async function checkHermes(signal?: AbortSignal): Promise<EnvCheckResult> {
  // First, try to detect Hermes through the Bridge API
  try {
    const res = await fetch("http://localhost:5050/v1/models", {
      method: "GET",
      signal: signal ?? AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      const models = data.data ?? [];
      const hasHermes = models.some(
        (m: any) =>
          (m.id || m.name || "").toLowerCase().includes("hermes"),
      );
      if (hasHermes) {
        return {
          name: "Hermes Agent",
          status: "ok",
          detail: "✅ 通过 Bridge 可用",
          hint: "Hermes Agent 已配置为 Bridge 的一个智能体",
        };
      }
    }
  } catch {
    // Bridge not available, continue to WSL check
  }

  // Try Tauri shell command for WSL (only works in Tauri desktop)
  try {
    const { isDesktop } = await import("../lib/platform");
    if (!isDesktop) {
      return {
        name: "Hermes Agent",
        status: "warn",
        detail: "⚠️ 桌面端专用",
        hint: "Hermes Agent 仅支持桌面端 (WSL)",
      };
    }

    const shellResult = await tryTauriShell("wsl", ["hermes", "--version"]);
    if (shellResult) {
      const version = shellResult.stdout?.trim() || shellResult.stderr?.trim() || "";
      if (version) {
        return {
          name: "Hermes Agent",
          status: "ok",
          detail: `✅ 可用 — ${version}`,
          hint: "",
        };
      }
      return {
        name: "Hermes Agent",
        status: "warn",
        detail: "⚠️ 未返回版本信息",
        hint: "请确保 Hermes Agent 已通过 WSL 安装",
      };
    }

    return {
      name: "Hermes Agent",
      status: "warn",
      detail: "⚠️ 未检测到",
      hint: "请确保 WSL 已安装且 Hermes Agent 已配置\n如需 Tauri Shell 支持: npm install @tauri-apps/plugin-shell",
    };
  } catch {
    return {
      name: "Hermes Agent",
      status: "warn",
      detail: "⚠️ 未检测到",
      hint: "请确保 WSL 已安装且 Hermes Agent 已配置",
    };
  }
}

// ── Runner ──

/**
 * Run all environment checks concurrently and return results.
 */
export async function runAllChecks(): Promise<EnvCheckResult[]> {
  const controller = new AbortController();
  const signal = controller.signal;

  const results = await Promise.all([
    checkOllama(signal),
    checkBridge(signal),
    checkHermes(signal),
  ]);

  controller.abort(); // clean up
  return results;
}

// ── Helpers ──

/**
 * Try to execute a shell command via Tauri's plugin:shell.
 * Returns { stdout, stderr } or null if unavailable.
 */
async function tryTauriShell(
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string } | null> {
  try {
    const core = await import("@tauri-apps/api/core");
    try {
      const result = (await core.invoke("plugin:shell|execute", {
        command,
        args,
      })) as any;
      if (result && (result.stdout || result.stderr)) {
        return {
          stdout: result.stdout ?? "",
          stderr: result.stderr ?? "",
        };
      }
    } catch {
      // plugin:shell not registered
    }
  } catch {
    // @tauri-apps/api/core not available
  }
  return null;
}
