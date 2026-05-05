#!/usr/bin/env python3
"""
映创AI助手 - 微信 iLink Bot 模块
=================================
基于腾讯官方 iLink Bot API (ilinkai.weixin.qq.com) 实现微信消息收发。
不需要 WeChat.exe 进程，纯 HTTP API 通信。

用法：
  python bridge.py --wechat  （随 bridge 一起启动微信监听）
  
首次运行会生成二维码，手机微信扫码授权后自动保存凭证。
"""

import base64
import json
import os
import random
import struct
import threading
import time
from datetime import datetime

import requests

# ========================================
# iLink API 常量
# ========================================
ILINK_BASE_URL = "https://ilinkai.weixin.qq.com"
ILINK_APP_ID = "bot"
CHANNEL_VERSION = "2.2.0"
ILINK_APP_CLIENT_VERSION = (2 << 16) | (2 << 8) | 0

EP_GET_BOT_QR = "ilink/bot/get_bot_qrcode"
EP_GET_QR_STATUS = "ilink/bot/get_qrcode_status"
EP_GET_UPDATES = "ilink/bot/getupdates"
EP_SEND_MESSAGE = "ilink/bot/sendmessage"

LONG_POLL_TIMEOUT = 35  # 秒
QR_TIMEOUT = 35  # 秒
QR_LOGIN_TIMEOUT = 480  # 总等待时间（秒）
POLL_RETRY_DELAY = 2  # 轮询重试间隔

# HTTP 请求超时
_API_TIMEOUT = 15


# ========================================
# 辅助函数
# ========================================

def _random_wechat_uin() -> str:
    """生成随机 WeChat UIN（防检测）"""
    value = struct.unpack(">I", struct.pack("I", random.getrandbits(32)))[0]
    return base64.b64encode(str(value).encode("utf-8")).decode("ascii")


def _headers(token: str = "") -> dict:
    """构建 iLink API 请求头"""
    headers = {
        "Content-Type": "application/json",
        "AuthorizationType": "ilink_bot_token",
        "X-WECHAT-UIN": _random_wechat_uin(),
        "iLink-App-Id": ILINK_APP_ID,
        "iLink-App-ClientVersion": str(ILINK_APP_CLIENT_VERSION),
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


# ========================================
# 凭证管理
# ========================================

def _creds_path() -> str:
    """获取凭证文件路径（跟 bridge.py 同目录）"""
    base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, "wechat_account.json")


def save_creds(account_id: str, token: str, base_url: str, user_id: str = "") -> None:
    """保存微信凭证到本地文件"""
    data = {
        "account_id": account_id,
        "token": token,
        "base_url": base_url,
        "user_id": user_id,
        "saved_at": datetime.now().isoformat(),
    }
    path = _creds_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"  ✅ 微信凭证已保存: {path}")


def load_creds() -> dict:
    """加载微信凭证，不存在返回空 dict"""
    path = _creds_path()
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


# ========================================
# QR 码登录
# ========================================

def _api_get(url: str, timeout: int = _API_TIMEOUT) -> dict:
    """GET 请求 iLink API"""
    resp = requests.get(url, headers=_headers(), timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def _api_post(url: str, payload: dict, token: str = "", timeout: int = _API_TIMEOUT) -> dict:
    """POST 请求 iLink API（带 Bearer Token）"""
    resp = requests.post(
        url,
        headers=_headers(token),
        json=payload,
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()


def qr_login(save_qr_path: str = "") -> dict:
    """
    QR 码登录流程。
    返回 {account_id, token, base_url, user_id} 或空 dict（失败）。
    如果 save_qr_path 有值，将二维码图片保存到该路径。
    """
    print("\n📱 === 微信 iLink 登录 ===")
    print("  正在获取二维码...")

    # 1. 获取二维码
    try:
        qr_resp = _api_get(f"{ILINK_BASE_URL}/{EP_GET_BOT_QR}?bot_type=3")
    except Exception as e:
        print(f"  ❌ 获取二维码失败: {e}")
        return {}

    qrcode_value = str(qr_resp.get("qrcode") or "")
    qrcode_url = str(qr_resp.get("qrcode_img_content") or "")
    if not qrcode_value:
        print("  ❌ 二维码响应中缺少 qrcode")
        return {}

    qr_scan_data = qrcode_url if qrcode_url else qrcode_value
    print(f"\n  🔗 二维码链接: {qr_scan_data}")
    print(f"  📌 请用手机微信扫描上方二维码")
    print(f"     或复制链接到浏览器打开扫描")
    print(f"     等待时间: {QR_LOGIN_TIMEOUT} 秒")

    # 2. 尝试用 qrcode 库显示二维码
    try:
        import qrcode as _qr
        _qr_instance = _qr.QRCode()
        _qr_instance.add_data(qr_scan_data)
        _qr_instance.make(fit=True)
        _qr_instance.print_ascii(invert=True)
    except ImportError:
        print("  (提示: pip install qrcode 可显示终端二维码)")
    except Exception:
        pass

    # 3. 保存二维码图片
    if save_qr_path:
        try:
            import qrcode as _qr
            img = _qr.make(qr_scan_data)
            img.save(save_qr_path)
            print(f"  🖼️  二维码已保存: {save_qr_path}")
        except Exception:
            pass

    # 4. 轮询扫码状态
    deadline = time.time() + QR_LOGIN_TIMEOUT
    current_base_url = ILINK_BASE_URL
    refresh_count = 0

    while time.time() < deadline:
        try:
            status_resp = _api_get(
                f"{current_base_url}/{EP_GET_QR_STATUS}?qrcode={qrcode_value}",
                timeout=QR_TIMEOUT,
            )
        except Exception as e:
            print(f"  ⚠️ 状态查询异常: {e}")
            time.sleep(1)
            continue

        status = str(status_resp.get("status") or "wait")

        if status == "wait":
            print(".", end="", flush=True)
        elif status == "scaned":
            print("\n  ✅ 已扫码，请在手机上确认...")
        elif status == "scaned_but_redirect":
            redirect_host = str(status_resp.get("redirect_host") or "")
            if redirect_host:
                current_base_url = f"https://{redirect_host}"
        elif status == "expired":
            refresh_count += 1
            if refresh_count > 3:
                print("\n  ❌ 二维码多次过期")
                return {}
            print(f"\n  🔄 二维码已过期，刷新... ({refresh_count}/3)")
            try:
                qr_resp = _api_get(f"{ILINK_BASE_URL}/{EP_GET_BOT_QR}?bot_type=3")
                qrcode_value = str(qr_resp.get("qrcode") or "")
                qrcode_url = str(qr_resp.get("qrcode_img_content") or "")
                qr_scan_data = qrcode_url if qrcode_url else qrcode_value
                print(f"  🔗 新二维码: {qr_scan_data}")
            except Exception as e:
                print(f"  ❌ 刷新二维码失败: {e}")
                return {}
        elif status == "confirmed":
            account_id = str(status_resp.get("ilink_bot_id") or "")
            token = str(status_resp.get("bot_token") or "")
            base_url = str(status_resp.get("baseurl") or ILINK_BASE_URL)
            user_id = str(status_resp.get("ilink_user_id") or "")
            if not account_id or not token:
                print("  ❌ 扫码成功但凭证信息不完整")
                return {}

            save_creds(account_id, token, base_url, user_id)
            print(f"\n  ✅ 微信连接成功!")
            print(f"     account_id: {account_id}")
            return {
                "account_id": account_id,
                "token": token,
                "base_url": base_url,
                "user_id": user_id,
            }

        time.sleep(1)

    print("\n  ❌ 微信登录超时")
    return {}


# ========================================
# 消息收发
# ========================================

class WeChatBot:
    """微信 iLink Bot 客户端"""

    def __init__(self, on_message=None, ai_respond=None):
        """
        on_message: callback(text, from_user) -> None
          - text: 消息文本
          - from_user: 发送方 user_id
        ai_respond: callback(text, from_user) -> str
          - 接收消息文本和发送方，返回 AI 回复文本
        """
        self._creds = load_creds()
        self._running = False
        self._poll_thread: threading.Thread = None
        self._sync_buf = ""
        self._context_tokens: dict = {}  # user_id -> context_token
        self.on_message = on_message
        self.ai_respond = ai_respond
        self._connected = False

    @property
    def is_logged_in(self) -> bool:
        """是否已有保存的凭证"""
        return bool(self._creds.get("token"))

    @property
    def is_connected(self) -> bool:
        """是否已连接且轮询中"""
        return self._connected

    def login(self, save_qr_path: str = "") -> bool:
        """执行 QR 码登录"""
        result = qr_login(save_qr_path)
        if result:
            self._creds = result
            return True
        return False

    def start(self):
        """启动消息轮询（后台线程）"""
        if not self.is_logged_in:
            print("  ⚠️ WeChat: 未登录，请先调用 login()")
            return

        if self._running:
            return

        self._running = True
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._poll_thread.start()
        print("  ✅ WeChat: 消息监听已启动")

    def stop(self):
        """停止消息轮询"""
        self._running = False
        if self._poll_thread:
            self._poll_thread.join(timeout=5)
        self._connected = False
        print("  ⛔ WeChat: 消息监听已停止")

    def send_text(self, to_user_id: str, text: str) -> bool:
        """发送文本消息给指定用户"""
        token = self._creds.get("token", "")
        base_url = self._creds.get("base_url", ILINK_BASE_URL)
        if not token:
            return False

        context_token = self._context_tokens.get(to_user_id, "")

        message = {
            "from_user_id": "",
            "to_user_id": to_user_id,
            "client_id": "",
            "message_type": 2,  # MSG_TYPE_BOT
            "message_state": 2,  # MSG_STATE_FINISH
            "item_list": [{"type": 1, "text_item": {"text": text}}],
        }
        if context_token:
            message["context_token"] = context_token

        try:
            resp = _api_post(
                f"{base_url}/{EP_SEND_MESSAGE}",
                payload={"msg": message},
                token=token,
                timeout=_API_TIMEOUT,
            )
            ret = resp.get("ret", 0)
            errcode = resp.get("errcode", 0)
            if ret == -14 or errcode == -14:
                print(f"  ⚠️ WeChat: 会话过期，需要重新登录")
                self._creds = {}
                self._connected = False
                self._running = False
                return False
            return True
        except Exception as e:
            print(f"  ⚠️ WeChat: 发送消息失败: {e}")
            return False

    def _poll_loop(self):
        """消息轮询主循环"""
        token = self._creds.get("token", "")
        base_url = self._creds.get("base_url", ILINK_BASE_URL)

        self._connected = True
        failures = 0
        timeout = LONG_POLL_TIMEOUT

        while self._running:
            try:
                resp = _api_post(
                    f"{base_url}/{EP_GET_UPDATES}",
                    payload={"get_updates_buf": self._sync_buf},
                    token=token,
                    timeout=timeout + 5,
                )

                suggested = resp.get("longpolling_timeout_ms")
                if isinstance(suggested, int) and suggested > 0:
                    timeout = suggested // 1000

                ret = resp.get("ret", 0)
                errcode = resp.get("errcode", 0)

                if ret not in (0, None) or errcode not in (0, None):
                    if ret in (-14, -2) or errcode in (-14, -2):
                        print(f"\n  ⚠️ WeChat: 会话过期，暂停 10 分钟后重试")
                        self._connected = False
                        time.sleep(600)
                        self._connected = True
                        failures = 0
                        continue
                    failures += 1
                    time.sleep(POLL_RETRY_DELAY * min(failures, 3))
                    continue

                failures = 0
                new_buf = str(resp.get("get_updates_buf") or "")
                if new_buf:
                    self._sync_buf = new_buf

                for msg in resp.get("msgs") or []:
                    self._handle_message(msg)

            except requests.exceptions.Timeout:
                # 长轮询超时是正常的，继续
                continue
            except requests.exceptions.RequestException:
                failures += 1
                time.sleep(POLL_RETRY_DELAY * min(failures, 3))
                continue
            except Exception:
                failures += 1
                time.sleep(POLL_RETRY_DELAY * min(failures, 3))
                continue

        self._connected = False

    def _handle_message(self, msg: dict):
        """处理收到的消息"""
        msg_type = msg.get("message_type", 0)
        if msg_type != 1:  # 只处理用户消息
            return

        from_user = msg.get("from_user_id", "")
        if not from_user:
            return

        # 保存 context_token（回复时需要带上）
        ctx = msg.get("context_token", "")
        if ctx:
            self._context_tokens[from_user] = ctx

        # 提取文本内容
        items = msg.get("item_list") or []
        text_parts = []
        for item in items:
            if item.get("type") == 1:  # ITEM_TEXT
                text_item = item.get("text_item") or {}
                text_parts.append(text_item.get("text", ""))

        if not text_parts:
            return

        full_text = "\n".join(text_parts)

        # 回调通知
        if self.on_message:
            self.on_message(full_text, from_user)

        # AI 自动回复
        if self.ai_respond:
            try:
                reply = self.ai_respond(full_text, from_user)
                if reply:
                    self.send_text(from_user, reply)
                    print(f"  💬 WeChat 回复 [{from_user}]: {reply[:100]}...")
            except Exception as e:
                print(f"  ⚠️ WeChat AI 回复失败: {e}")
