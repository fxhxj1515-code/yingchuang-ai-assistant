#!/usr/bin/env python3
"""
映创AI助手 - 本地智能体桥梁服务 v1.0
=====================================
在Windows上运行，暴露 OpenAI 兼容 API。
让映创AI助手可以跟本地智能体群聊。

用法：
  python bridge.py

然后在映创AI助手里添加供应商：
  名称: 本地智能体
  地址: http://localhost:5050/v1
  Key:  留空

依赖安装：
  pip install flask requests
"""

import subprocess
import re
import json
import requests
import platform
import sys
import time
import os
import threading
from flask import Flask, request, jsonify, Response, send_file

# 微信 iLink Bot 模块
from wechat_bot import WeChatBot, load_creds

app = Flask(__name__)

# ========================================
# 自动检测运行环境
# ========================================
IS_WSL = "microsoft" in platform.uname().release.lower()
IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    OLLAMA_URL = "http://localhost:11434"
    HERMES_CMD = ["wsl", "/home/fan/.local/bin/hermes", "chat", "-q"]
elif IS_WSL:
    OLLAMA_URL = "http://192.168.1.181:11434"
    HERMES_CMD = ["hermes", "chat", "-q"]
else:
    OLLAMA_URL = "http://localhost:11434"
    HERMES_CMD = ["hermes", "chat", "-q"]

BRIDGE_PORT = 5050

# ========================================
# QClaw 真实服务检测
# ========================================
QCLAW_URL = "http://127.0.0.1:28789"
QCLAW_AVAILABLE = False

def detect_qclaw():
    """检测真实 QClaw 服务是否在运行"""
    global QCLAW_AVAILABLE
    try:
        resp = requests.get(f"{QCLAW_URL}/v1/models", timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            models = data.get("data", [])
            if models:
                QCLAW_AVAILABLE = True
                print(f"  ✅ 检测到真实 QClaw 服务 ({QCLAW_URL})")
                print(f"  📋 QClaw 可用模型: {', '.join(m.get('id', m) if isinstance(m, dict) else m for m in models[:5])}")
                return True
    except requests.ConnectionError:
        pass
    except Exception:
        pass
    print("  ⚠️ 未检测到真实 QClaw 服务，将用 Ollama 模拟 qclaw 人设")
    return False

QCLAW_AVAILABLE = detect_qclaw()

# ========================================
# 自动检测 Ollama 可用模型
# ========================================

def detect_ollama_models():
    """从 Ollama 获取已安装的模型列表"""
    try:
        resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            models = [m["name"] for m in data.get("models", [])]
            return models
    except requests.ConnectionError:
        pass
    except Exception:
        pass
    return []

OLLAMA_MODELS = detect_ollama_models()
DEFAULT_OLLAMA_MODEL = OLLAMA_MODELS[0] if OLLAMA_MODELS else "gemma3:4b"

# 支持命令行参数
# --model 指定默认模型
# --wechat 启用微信监听
ENABLE_WECHAT = False
WECHAT_BOT = None

i = 1
while i < len(sys.argv):
    if sys.argv[i] == "--model" and i + 1 < len(sys.argv):
        DEFAULT_OLLAMA_MODEL = sys.argv[i + 1]
        print(f"📌 手动指定默认模型: {DEFAULT_OLLAMA_MODEL}")
        i += 2
    elif sys.argv[i] == "--wechat":
        ENABLE_WECHAT = True
        i += 1
    else:
        i += 1

# ========================================
# 智能体人设
# ========================================

SYSTEM_PROMPTS = {
    "hermes": "你是一个AI智能体 Hermes Agent。回答问题简洁直接。",
    "workbuddy": """你是 WorkBuddy（腾讯 CodeBuddy），一个专业的AI编程助手。
你擅长：
- 代码编写、调试、优化
- 技术方案设计
- 回答编程相关问题
风格：专业、细致、喜欢给代码示例。""",
    "qclaw": """你是 QClaw（基于 OpenClaw），一个多通道AI智能体。
你擅长：
- 多平台消息处理
- 自动化工作流
- 系统集成方案
风格：实用主义、喜欢给可落地的方案。""",
}

# ========================================
# 构建模型列表
# ========================================

def get_model_tags(model_id):
    """根据模型名称自动推荐标签"""
    name_lower = model_id.lower()
    tags = set()

    # 智能体标签
    agent_tags = {
        "hermes": ["WSL智能体", "推荐对话"],
        "workbuddy": ["编程助手", "推荐代码"],
        "qclaw": ["多通道智能体"],
    }
    if model_id in agent_tags:
        tags.update(agent_tags[model_id])
        return sorted(tags)

    # 按规则匹配
    # 匹配完整子串（如 deepseek-coder 应匹配"推荐代码"而非"推荐中文"）
    coder_patterns = ["codellama", "codestral", "deepseek-coder", "qwen2.5-coder"]
    for pat in coder_patterns:
        if pat in name_lower:
            tags.add("推荐代码")
            break

    chinese_patterns = ["qwen", "deepseek", "yi", "glm"]
    for pat in chinese_patterns:
        if pat in name_lower:
            tags.add("推荐中文")
            tags.add("推荐对话")
            break

    chat_patterns = ["gemma", "llama", "mistral"]
    for pat in chat_patterns:
        if pat in name_lower and "coder" not in name_lower and "code" not in name_lower:
            tags.add("推荐对话")
            tags.add("低内存")
            break

    # 按内存需求匹配（从模型名称的标签部分提取，如 "qwen2.5:7b"）
    # 先取冒号后的部分，或者整个名称
    tag_part = name_lower.split(":")[-1] if ":" in name_lower else name_lower

    if any(s in tag_part for s in ["phi", "tinyllama", "1b", "3b"]):
        tags.add("低内存")
    # 7b/8b — 精确匹配或用分隔符匹配，避免误匹配 1b/3b
    for s in ["7b", "8b"]:
        if tag_part == s or tag_part.startswith(s + "-") or tag_part.endswith("-" + s) or f"-{s}-" in tag_part:
            tags.add("8GB内存")
            break
    if any(s in tag_part for s in ["13b", "14b", "20b", "30b", "70b"]):
        tags.add("推荐高级")
        tags.add("需16GB+内存")

    return sorted(tags) if tags else ["通用"]


def get_model_recommendation(model_name: str) -> str:
    """根据模型名称返回带 emoji 的推荐标签字符串"""
    name_lower = model_name.lower()

    # 自定义智能体
    agent_recommendations = {
        "hermes": "💬 推荐对话",
        "workbuddy": "💻 推荐代码",
        "qclaw": "💬 推荐对话",
    }
    if model_name in agent_recommendations:
        return agent_recommendations[model_name]

    # 提取参数规模标签部分（冒号后）用于小模型检测
    tag_part = name_lower.split(":")[-1] if ":" in name_lower else name_lower

    # --- 特例：明确的小模型优先匹配 ---
    # tinyllama*, gemma2:2b* → "🔋 低内存可用"（覆盖下面的通用规则）
    if any(s in name_lower for s in ["tinyllama", "gemma2:2b"]):
        return "🔋 低内存可用"

    # phi* → "🔋 低内存可用 · 💬 推荐对话"（phi 本身就是小模型但对话能力强）
    if "phi" in name_lower:
        return "🔋 低内存可用 · 💬 推荐对话"

    # --- 按名称模式匹配（通用规则） ---
    if "gemma" in name_lower:
        return "💬 推荐对话 · 💻 推荐代码"
    if "qwen" in name_lower:
        return "💬 推荐对话 · 🇨🇳 推荐中文"
    if "llama" in name_lower:
        return "💬 推荐对话"
    if "deepseek" in name_lower:
        return "💬 推荐对话 · 💻 推荐代码"
    if "mistral" in name_lower:
        return "💬 推荐对话"

    # --- 其他 <4B 参数的小模型（从标签部分检测数字） ---
    if any(s in tag_part for s in ["1b", "2b", "3b"]):
        return "🔋 低内存可用"
    param_match = re.findall(r'(\d+)b', tag_part)
    if param_match:
        param_val = int(param_match[0])
        if param_val < 4:
            return "🔋 低内存可用"

    return "💬 推荐对话"


def get_models():
    models = [
        {"id": "hermes", "object": "model", "created": 1700000000, "owned_by": "local"},
        {"id": "workbuddy", "object": "model", "created": 1700000001, "owned_by": "local"},
        {"id": "qclaw", "object": "model", "created": 1700000002, "owned_by": "local"},
    ]
    # 给智能体添加标签，标记 qclaw 是否真实服务
    for m in models:
        m["tags"] = get_model_tags(m["id"])
        m["recommendation"] = get_model_recommendation(m["id"])
        if m["id"] == "qclaw":
            m["real_service"] = QCLAW_AVAILABLE
            if QCLAW_AVAILABLE:
                m["tags"].insert(0, "真实服务")
                m["recommendation"] = "🔗 真实 QClaw 服务"
    # 添加 Ollama 中所有可用模型（去重，避免和上面冲突）
    seen = {m["id"] for m in models}
    for i, m in enumerate(OLLAMA_MODELS):
        if m not in seen:
            tags = get_model_tags(m)
            models.append({
                "id": m,
                "object": "model",
                "created": 1700000010 + i,
                "owned_by": "ollama",
                "tags": tags,
                "recommendation": get_model_recommendation(m),
            })
            seen.add(m)
    # 如果没有检测到任何模型，加一个占位
    if not OLLAMA_MODELS:
        fallback_id = "gemma3:4b"
        models.append({
            "id": fallback_id,
            "object": "model",
            "created": 1700000010,
            "owned_by": "ollama",
            "tags": ["推荐对话", "低内存"],
            "recommendation": get_model_recommendation(fallback_id),
        })
    return models


# ========================================
# 调用 Hermes (通过 WSL)
# ========================================

def call_hermes(messages, user_message):
    """调用 Hermes Agent (WSL 或直接)"""
    try:
        # 处理消息内容是数组的情况（多模态消息）
        if isinstance(user_message, list):
            text_parts = [p.get("text", "") for p in user_message if isinstance(p, dict) and p.get("type") == "text"]
            user_message = "\n".join(text_parts)
        elif not isinstance(user_message, str):
            user_message = str(user_message)

        cmd = HERMES_CMD + [user_message, "-Q"]
        print(f"  🐚 调用: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        output = (result.stdout or "").strip()
        stderr_output = (result.stderr or "").strip()

        # 如果有 stderr，打印到服务端日志
        if stderr_output:
            print(f"  ⚠️ stderr: {stderr_output[:200]}")

        # 去掉 session_id 行
        lines = output.split("\n")
        if len(lines) > 1:
            response_text = "\n".join(lines[1:]).strip()
        else:
            response_text = output

        if not response_text:
            err_msg = f"(Hermes 返回空｜stdout: '{output[:100]}'"
            if stderr_output:
                err_msg += f"｜stderr: '{stderr_output[:200]}'"
            if result.returncode != 0:
                err_msg += f"｜exit: {result.returncode}"
            err_msg += ")"
            return err_msg
        return response_text
    except subprocess.TimeoutExpired:
        return "(Hermes 响应超时｜120秒)"
    except FileNotFoundError:
        return "⚠️ Hermes 未安装或 WSL 不可用。请先安装：https://hermes-agent.nousresearch.com"
    except Exception as e:
        return f"(Hermes 调用失败: {type(e).__name__}: {e})"


# ========================================
# 调用 Ollama 本地模型
# ========================================

def call_ollama(model_id, messages):
    """调用本地 Ollama 模型"""
    # 如果请求的是 workbuddy 或 qclaw，用默认模型
    ollama_model = model_id
    if model_id in ("workbuddy", "qclaw"):
        ollama_model = DEFAULT_OLLAMA_MODEL

    try:
        resp = requests.post(
            f"{OLLAMA_URL}/v1/chat/completions",
            json={
                "model": ollama_model,
                "messages": messages,
                "stream": False,
            },
            timeout=120,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        else:
            return f"(Ollama 返回错误: {resp.status_code})"
    except requests.ConnectionError:
        return "⚠️ Ollama 未运行。请先启动 Ollama。"
    except Exception as e:
        return f"(Ollama 调用失败: {str(e)})"


# ========================================
# 调用真实 QClaw 服务（Windows）
# ========================================

def call_qclaw(messages):
    """调用真实 QClaw 服务（http://127.0.0.1:28789）"""
    if not QCLAW_AVAILABLE:
        return None  # 由外层回退到 Ollama 模拟
    try:
        # 动态获取 QClaw 支持的模型名，优先请求列表第一个
        qclaw_model = "qclaw"  # 默认
        try:
            info = requests.get(f"{QCLAW_URL}/v1/models", timeout=3)
            if info.status_code == 200:
                data = info.json()
                all_models = data.get("data", [])
                if all_models:
                    first = all_models[0]
                    qclaw_model = first.get("id") if isinstance(first, dict) else first
        except Exception:
            pass

        # 直接转发消息，不带 system prompt — QClaw 自己有
        resp = requests.post(
            f"{QCLAW_URL}/v1/chat/completions",
            json={
                "model": qclaw_model,
                "messages": messages,
                "stream": False,
            },
            timeout=120,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        else:
            return f"(QClaw 返回错误: {resp.status_code})"
    except requests.ConnectionError:
        return "⚠️ QClaw 服务连接失败。请检查 QClaw 是否在运行。"
    except Exception as e:
        return f"(QClaw 调用失败: {str(e)})"


# ========================================
# API: GET /v1/models
# ========================================

@app.route("/v1/models", methods=["GET"])
def list_models():
    models = get_models()
    recommendations = {m["id"]: m["recommendation"] for m in models if "recommendation" in m}
    return jsonify({
        "object": "list",
        "data": models,
        "recommendations": recommendations,
    })


# ========================================
# API: POST /v1/chat/completions
# ========================================

@app.route("/v1/chat/completions", methods=["POST"])
def chat_completions():
    data = request.get_json()
    if not data:
        return jsonify({"error": "invalid request"}), 400

    model = data.get("model", DEFAULT_OLLAMA_MODEL)
    messages = data.get("messages", [])
    stream = data.get("stream", False)

    # 提取最后一条用户消息
    user_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_message = msg.get("content", "")
            break

    # 构建带系统提示的消息列表
    system_prompt = SYSTEM_PROMPTS.get(model, "")
    ollama_messages = []
    if system_prompt:
        ollama_messages.append({"role": "system", "content": system_prompt})
    for msg in messages:
        ollama_messages.append({
            "role": msg["role"],
            "content": msg.get("content", ""),
        })

    # 根据模型选择调用方式
    if model == "hermes":
        response_text = call_hermes(ollama_messages, user_message)
    elif model == "qclaw" and QCLAW_AVAILABLE:
        # 走真实 QClaw 服务（不带 system prompt，QClaw 自己有）
        response_text = call_qclaw(messages)
    else:
        # workbuddy / qclaw(模拟) / 所有 Ollama 模型都走 Ollama
        response_text = call_ollama(model, ollama_messages)

    # 返回 OpenAI 兼容格式
    response_id = f"chatcmpl-{abs(hash(response_text)) & 0x7fffffff}"
    now = int(time.time())

    if stream:
        def generate():
            yield f"data: {json.dumps({'choices': [{'delta': {'role': 'assistant', 'content': response_text}, 'finish_reason': 'stop', 'index': 0}]})}\n\n"
            yield "data: [DONE]\n\n"
        return Response(generate(), mimetype="text/event-stream")
    else:
        return jsonify({
            "id": response_id,
            "object": "chat.completion",
            "created": now,
            "model": model,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": response_text},
                "finish_reason": "stop",
            }],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        })


# ========================================
# 微信 iLink Bot API
# ========================================

# AI 回复回调（供 WeChatBot 调用）
def _wechat_ai_respond(text, from_user):
    """微信消息 → AI 回复"""
    # 使用映创云 AI（如果连不上回退本地 Ollama）
    try:
        ai_url = "https://hwzs.club/api/ai/v1"
        resp = requests.post(
            f"{ai_url}/chat/completions",
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": "你是一个AI助手，回答简洁直接。"},
                    {"role": "user", "content": text},
                ],
                "stream": False,
            },
            timeout=60,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception:
        pass

    # 回退本地 Ollama
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/v1/chat/completions",
            json={
                "model": DEFAULT_OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": "你是一个AI助手，回答简洁直接。"},
                    {"role": "user", "content": text},
                ],
                "stream": False,
            },
            timeout=60,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception:
        pass

    return "（AI 暂时无法回复，请稍后再试）"


@app.route("/wechat/status")
def wechat_status():
    """获取微信连接状态"""
    if not ENABLE_WECHAT:
        return jsonify({"enabled": False, "connected": False, "message": "微信功能未启用（启动时加 --wechat 参数）"})
    if not WECHAT_BOT:
        return jsonify({"enabled": True, "connected": False, "message": "微信 Bot 未初始化"})
    return jsonify({
        "enabled": True,
        "connected": WECHAT_BOT.is_connected,
        "logged_in": WECHAT_BOT.is_logged_in,
        "message": "已连接" if WECHAT_BOT.is_connected else ("已登录" if WECHAT_BOT.is_logged_in else "未登录"),
    })


@app.route("/wechat/qr")
def wechat_qr():
    """获取微信登录二维码图片"""
    qr_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wechat_qr.png")
    if os.path.exists(qr_path):
        return send_file(qr_path, mimetype="image/png")
    return jsonify({"error": "二维码不存在，请先调用 /wechat/login"}), 404


@app.route("/wechat/login", methods=["POST"])
def wechat_login():
    """触发微信扫码登录"""
    global WECHAT_BOT
    if not ENABLE_WECHAT:
        return jsonify({"success": False, "message": "微信功能未启用（启动时加 --wechat 参数）"}), 400

    if WECHAT_BOT and WECHAT_BOT.is_logged_in:
        return jsonify({"success": True, "message": "已登录，无需重新扫码", "connected": WECHAT_BOT.is_connected})

    qr_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wechat_qr.png")

    def _async_login():
        global WECHAT_BOT
        bot = WeChatBot(ai_respond=_wechat_ai_respond)
        if bot.login(save_qr_path=qr_path):
            WECHAT_BOT = bot
            bot.start()
            print("  ✅ WeChat: 登录成功，消息监听已启动")
        else:
            print("  ❌ WeChat: 登录失败")

    t = threading.Thread(target=_async_login, daemon=True)
    t.start()

    return jsonify({"success": True, "message": "请在浏览器打开 /wechat/qr 查看二维码，或用手机微信扫码"})


@app.route("/wechat/send", methods=["POST"])
def wechat_send():
    """发送微信消息（调试用）"""
    if not WECHAT_BOT or not WECHAT_BOT.is_connected:
        return jsonify({"success": False, "message": "微信未连接"}), 400
    data = request.get_json()
    to_user = data.get("to", "")
    text = data.get("text", "")
    if not to_user or not text:
        return jsonify({"success": False, "message": "缺少 to 或 text 参数"}), 400
    ok = WECHAT_BOT.send_text(to_user, text)
    return jsonify({"success": ok})


# ========================================
# 启动
# ========================================

if __name__ == "__main__":
    print(f"🚀 映创AI助手 - 本地AI连接器 v1.1")
    print(f"📡 服务地址: http://localhost:{BRIDGE_PORT}")
    print(f"📋 API端点:  http://localhost:{BRIDGE_PORT}/v1")
    print(f"\n📦 Ollama 检测结果:", end=" ")
    if OLLAMA_MODELS:
        print(f"发现 {len(OLLAMA_MODELS)} 个模型: {', '.join(OLLAMA_MODELS)}")
    else:
        print("⚠️ 未检测到 Ollama 或没有已安装的模型")
    print(f"\n🤖 可用智能体:")
    for m in get_models():
        desc = {
            "hermes": "WSL Hermes Agent（真实智能体）",
            "workbuddy": f"Ollama {DEFAULT_OLLAMA_MODEL} + WorkBuddy 人设",
            "qclaw": f"{'🔗 真实 QClaw 服务' if QCLAW_AVAILABLE else f'Ollama {DEFAULT_OLLAMA_MODEL} + QClaw 人设'}",
        }.get(m["id"], f"Ollama 原始模型（{m['id']}）")
        tag_str = ", ".join(m.get("tags", []))
        rec = m.get("recommendation", "")
        print(f"   {m['id']:20s} → {desc}")
        if tag_str:
            print(f"   {'':20s}  标签: [{tag_str}]")
        if rec:
            print(f"   {'':20s}  📌 {rec}")
    print(f"💡 在映创AI助手中添加供应商:")
    print(f"   名称: 本地智能体")
    print(f"   地址: http://localhost:{BRIDGE_PORT}/v1")
    print(f"   Key:  留空")
    print(f"")
    print(f"💡 桥梁已内置在 映创AI助手 安装包中")
    
    # 微信模式
    if ENABLE_WECHAT:
        print(f"\n📱 === 微信 iLink Bot ===")
        creds = load_creds()
        if creds.get("token"):
            print(f"  ✅ 发现已保存的微信凭证 (account_id: {creds.get('account_id', '?')})")
            bot = WeChatBot(ai_respond=_wechat_ai_respond)
            WECHAT_BOT = bot
            bot.start()
        else:
            print(f"  ⚠️ 未登录微信，请 POST /wechat/login 扫码登录")
            print(f"     curl -X POST http://localhost:{BRIDGE_PORT}/wechat/login")
        print(f"  📋 状态API: http://localhost:{BRIDGE_PORT}/wechat/status")
        print(f"  🖼️  二维码: http://localhost:{BRIDGE_PORT}/wechat/qr")

    print(f"⚠️ 确保 Ollama 已启动（当前端口 {OLLAMA_URL}）")
    app.run(host="0.0.0.0", port=BRIDGE_PORT, debug=False)
