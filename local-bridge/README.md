# 映创AI助手 - 使用指南

---

## 🚀 3分钟快速开始

### ☁️ 云端模式（普通用户，零配置）

```
1. 下载安装 → 2. 左侧选「映创云」供应商 → 3. 输入文字开始聊天
```

全程无需任何配置，装好即用。

### 💻 本地模式（极客用户，需安装配置）

```
1. 安装 Ollama → 2. 下载本地AI连接器 → 3. 添加供应商 → 4. 创建群聊
```

配置完成后，你可以在群里同时和 **4个AI智能体** 聊天，它们可以互相讨论。

---

## 📋 最低系统要求

| 项目 | 云端模式 | 本地模式 |
|------|:--------:|:--------:|
| 操作系统 | Windows 10+ | Windows 10+（需 WSL 支持） |
| 处理器 | 任意 | 双核 2.0GHz+ |
| 内存 | 2GB+ | **8GB+**（推荐 16GB） |
| 硬盘空间 | 100MB+ | **10GB+**（含模型下载） |
| 网络 | 需联网 | 可离线（Ollama 模型） |
| 额外组件 | 无 | Ollama + WSL |

---

## 🔒 隐私声明

| 关注点 | 说明 |
|--------|------|
| **云端模式** | 对话通过新加坡中转服务器发送至 DeepSeek / Groq API。我们不存储对话记录，但第三方 API 有各自的数据政策。 |
| **本地模式** | **所有对话完全在本地运行**。Ollama 模型运行在你的电脑上，数据不会离开你的设备。桥梁服务监听 `localhost:5050`，仅本机可访问。 |
| **Hermes 智能体** | 在 WSL 中运行，调用远程 AI 模型 API 完成推理。仅任务内容通过网络传输，不会被用于训练。 |
| **我们不做什么** | 不收集使用数据，不记录对话日志，不向第三方出售数据。 |

---

## 概述

映创AI助手支持两种使用模式：

| 模式 | 适用人群 | 配置量 | 模型来源 |
|------|---------|:------:|---------|
| **云端模式** | 普通用户 | 零配置 | 新加坡服务器中转（DeepSeek / Groq） |
| **本地模式** | 极客用户 | 需按教程配置 | 本地 Ollama + Hermes 智能体 |

---

# 一、云端模式（普通用户，开箱即用）

**一句话：装好软件就能用，什么都不用配。**

### 1. 下载安装

从 [i.hwzs.club](https://i.hwzs.club) 下载映创AI助手安装包，双击安装即可。

### 2. 开始聊天

1. 打开软件
2. 左侧选"映创云"供应商
3. 输入文字开始聊天

> 支持群聊：创建群组，添加多个模型，AI们可以互相讨论。

### 3. 可用模型（云端）

| 模型 | 供应商 | 说明 |
|------|--------|------|
| DeepSeek Chat | 映创云 | 高性能通用模型 |
| DeepSeek Flash | 映创云 | 快速轻量版 |
| Llama 3.3/3.1 | Groq | 免费高速 |
| Qwen3 32B | Groq | 免费高速 |

---

# 二、本地模式（极客用户，4智能体群聊）

如果你想要更极客的体验，可以解锁**本地智能体群聊**功能。
配置好后，你可以在群里同时和以下4个AI聊天：

| 智能体 | 本质 | 说明 |
|--------|------|------|
| **Hermes** | 真实 Hermes Agent | 通过 WSL 调用，真正的AI智能体 |
| **WorkBuddy** 🛈 | 本地模型 + 人设 | 用 Ollama 模拟腾讯 CodeBuddy 风格 |
| **QClaw** 🛈 | 本地模型 + 人设 | 用 Ollama 模拟 OpenClaw 风格 |
| **本地模型** | Ollama 原始模型 | 你本地安装的任何模型 |

> 🛈 WorkBuddy 和 QClaw 是**内置人设**，**无需安装**任何额外软件。
> 桥梁服务已经包含了它们的角色设定，你在 Ollama 下载好模型后即可使用。

---

## 前置准备

### 第1步：安装 Ollama <img src="https://img.shields.io/badge/必须-必备-red" alt="必须" />

Ollama 是本地模型运行环境，WorkBuddy 和 QClaw 两个智能体都靠它。

```bash
# 下载 Windows 版安装
# https://ollama.com/download  → 下载 Windows 安装包

# 安装完成后，打开 CMD 或 PowerShell，下载一个模型
ollama pull gemma3:4b    # 约 3.3GB，推荐 8GB+ 内存
# 也可以选其他模型：
# ollama pull qwen2.5:7b    # 中文更强的模型
# ollama pull llama3.2:3b   # 轻量模型（2GB内存也能跑）

# 查看已安装的模型
ollama list

# Ollama 会自动在后台运行（端口 11434）
# 右下角任务栏有 Ollama 图标表示运行中
```

> **配置要求：** gemma3:4b 需要 4GB+ 内存，qwen2.5:7b 需要 8GB+。

### 第2步：安装 Hermes <img src="https://img.shields.io/badge/可选-推荐安装-green" alt="可选" />

Hermes 是 WSL 中的 AI 智能体，它是**真实的智能体**（而非模拟人设），
可以直接参与群聊回答问题。

```bash
# 先确认 WSL 已安装（Windows 搜索 "WSL" → 打开）
# 打开 Ubuntu 终端（或任何 WSL 发行版），执行：

curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# 验证安装
hermes --version

# 测试是否可用
hermes chat -q "你好" -Q
```

> 如果 WSL 没装，在 PowerShell 里执行 `wsl --install` 即可。

### 第3步：了解 WorkBuddy <img src="https://img.shields.io/badge/了解即可-无需安装-blue" alt="了解即可" />

WorkBuddy 是基于腾讯 CodeBuddy 风格的人设模型，**已内置在桥梁服务中**，**无需安装任何软件**。

- **人设来源：** https://codebuddy.tencent.com/（了解参考，无需下载）
- **作用：** 在代码编辑场景下提供 AI 辅助风格的回答
- **实际原理：** 桥梁服务用 Ollama 本地模型加载 WorkBuddy 人设提示词，模拟其风格

> ✅ **你不需要下载或安装 WorkBuddy。** 只要安装了 Ollama 并下载了模型，WorkBuddy 智能体就可以直接使用。

### 第4步：了解 QClaw <img src="https://img.shields.io/badge/了解即可-无需安装-blue" alt="了解即可" />

QClaw 是基于 OpenClaw 风格的人设模型，**已内置在桥梁服务中**，**无需安装任何软件**。

- **项目参考：** https://github.com/openclaw/openclaw（了解参考，无需下载）
- **作用：** 提供多平台 AI 消息网关风格的回答
- **实际原理：** 桥梁服务用 Ollama 本地模型加载 QClaw 人设提示词，模拟其风格

> ✅ **你不需要下载或安装 QClaw。** 只要安装了 Ollama 并下载了模型，QClaw 智能体就可以直接使用。

---

## 启动本地AI连接器

### 第5步：下载并启动

有两种方式运行本地AI连接器：

#### 方式 A：直接运行 .exe（推荐，无需 Python）

```bash
# 1. 下载 exe 文件
#    从 https://i.hwzs.club/downloads/ai-agent-bridge-v1.0.zip 下载
#    或直接使用 ai-agent-bridge.exe

# 2. 双击 ai-agent-bridge.exe 即可启动
#    或者在 CMD 中运行：
ai-agent-bridge.exe
```

> ✅ 无需安装 Python、无需安装依赖、即点即用。

#### 方式 B：Python 源码运行（需要 Python 环境）

```bash
# 1. 下载本地AI连接器源码
#    从 https://i.hwzs.club/downloads/ai-agent-bridge-v1.0.zip 下载

# 2. 解压到任意文件夹（比如 D:\ai-agent-bridge\）
# 3. 打开 CMD 或 PowerShell，进入解压后的目录
cd D:\ai-agent-bridge

# 4. 安装依赖（只需执行一次）
pip install flask requests

# 5. 启动本地AI连接器
python bridge.py
```

看到以下输出即启动成功：

```
🚀 映创AI助手 - 本地AI连接器 v1.0
📡 服务地址: http://localhost:5050

📦 Ollama 检测结果: 发现 2 个模型: gemma3:4b, qwen2.5:7b

🤖 可用智能体:
   hermes               → WSL Hermes Agent（真实智能体）
   workbuddy            → Ollama gemma3:4b + WorkBuddy 人设
   qclaw                → Ollama gemma3:4b + QClaw 人设
   gemma3:4b            → Ollama 原始模型（gemma3:4b）
   qwen2.5:7b           → Ollama 原始模型（qwen2.5:7b）
```

> ⚠️ **保持此窗口打开**，关闭连接器服务就会断开。

### 第6步：在软件中添加供应商

1. 打开映创AI助手 → 设置 → 供应商管理
2. 点击 "添加供应商"
3. 填写以下字段：

| 字段 | 填写值 | 说明 |
|------|--------|------|
| **名称** | `本地智能体` | 给连接器起个名字，可自定义 |
| **地址** | `http://localhost:5050/v1` | 连接器的 API 地址（必须准确） |
| **Key** | `（留空）` | 本地服务不需要认证密钥 |

4. 保存

> 如果软件提示连接失败，请检查连接器窗口是否仍在运行，以及地址是否拼写正确。

### 第7步：创建群聊

1. 新建一个群聊
2. 添加多个智能体到群中（Hermes、WorkBuddy、QClaw...）
3. 发送一条消息
4. 所有智能体会依次回复，互相讨论

---

## 💡 示例对话场景

### 💻 编程辅助

```
你："用 Python 写一个文件去重工具"

Hermes：  我来写一个完整的文件去重脚本...
          1. 先计算每个文件的 MD5 哈希值
          2. 用字典跟踪已见过的哈希值
          3. 删除重复文件（保留第一个）

WorkBuddy：让我用 CodeBuddy 风格优化一下...
           加上进度条、多线程支持和日志记录

本地模型：  这是一个基础版本，我也可以帮忙优化性能
```

### ✍️ 写作辅助

```
你："帮我写一篇关于 AI 助手的博客大纲"

Hermes：   这里是一个技术博客的大纲...
           1. AI 助手的发展历程
           2. 本地 vs 云端 AI 的对比

WorkBuddy：从开发者角度补充技术架构部分...
           可以加上开源生态的对比

QClaw：    从用户社区的角度丰富案例...
           收集一些社区的真实使用反馈
```

### 🔄 多智能体讨论

```
你："ChatGPT 和 DeepSeek 各有什么优势？"

QClaw：    ChatGPT 优势在于生态成熟...
           插件系统丰富，应用场景广泛

本地模型： DeepSeek 在中文理解上更自然...
           数学推理能力也很强

Hermes：   综合来看，选择取决于你的场景...
           日常办公推荐 DeepSeek，深度工作推荐 ChatGPT
```

> 不同智能体会从各自"角色视角"给出不同的回答，让讨论更全面有趣。

---

## 常见问题

### Python 未找到（'python' 不是内部或外部命令）

启动连接器时提示 `'python' 不是内部或外部命令`，说明系统没有安装 Python 或未加入 PATH。

**解决方法：**

**推荐方案：使用 .exe 版本**
直接下载 `ai-agent-bridge.exe`，双击即可运行，**无需安装 Python**。

**备用方案：安装 Python**
1. 从 https://www.python.org/downloads/ 下载 Python 3.10+
2. 安装时**务必勾选** "Add Python to PATH"
3. 安装完成后重启 CMD，再试 `python bridge.py`

> 如果安装了 Python 3 但命令是 `python3`，也可以用 `python3 bridge.py`。

### 端口 5050 被占用

启动时提示 `Address already in use` 或 `端口 5050 已被占用`。

**解决方法：**
```bash
# 查看哪个程序占用了 5050 端口
netstat -ano | findstr :5050

# 找到 PID 后，在任务管理器中结束该进程
# 或使用命令（将 1234 替换为实际 PID）
taskkill /PID 1234 /F

# 也可以指定其他端口启动
python bridge.py --port 5051
```
然后更新软件中的供应商地址为 `http://localhost:5051/v1`。

### 防火墙阻止连接

软件提示"无法连接"或"连接超时"，但连接器窗口显示正常运行。

**解决方法：**
1. 打开 Windows 安全中心 → 防火墙和网络保护
2. 点击"允许应用通过防火墙"
3. 点击"更改设置" → "允许其他应用"
4. 添加 `python.exe`（通常在 `C:\Users\<用户名>\AppData\Local\Programs\Python\Python3x\`）
5. 确保同时勾选"专用"和"公用"
6. 或者直接关闭防火墙测试（仅测试，不推荐长期关闭）

> 本地连接器监听 `localhost:5050`，正常情况下不需要防火墙放行。如果仍有问题，检查是否开启了 VPN 或代理软件。

### Ollama 模型未检测到

启动日志显示 `Ollama 检测结果: 发现 0 个模型` 或 `未发现任何模型`。

**原因排查：**
1. Ollama 是否在运行？右下角任务栏有 Ollama 图标吗？没有则启动 Ollama
2. 是否下载了模型？运行 `ollama list` 查看已安装的模型列表
3. 模型名称是否正确？确保 `ollama pull` 成功完成

```bash
# 检查 Ollama 服务状态
ollama list

# 如果列表是空的，下载一个模型
ollama pull gemma3:4b

# 手动启动 Ollama 服务（如果图标没出现）
ollama serve
```

### 桥梁启动提示 "Ollama 未运行"

Ollama 没启动。右下角任务栏找到 Ollama 图标点击启动，
或运行 `ollama serve`。

### Hermes 显示 "未安装"

WSL 中没有安装 Hermes Agent。按上方第2步安装。

### 本地模型回答慢

本地模型在普通电脑上需要几秒到十几秒生成，属于正常现象。
模型越大越慢，推荐 gemma3:4b 或 qwen2.5:3b。

### 可以换 Ollama 里的其他模型吗？

可以。桥梁会自动检测你安装的所有 Ollama 模型，
全部会出现在模型列表里。WorkBuddy 和 QClaw 用的模型
会自动选你安装的第一个模型。

如果不想用默认模型，可以手动指定：

```bash
# 启动时指定模型
python bridge.py --model qwen2.5:7b
```

### 怎么卸载本地AI连接器？

- **.exe 用户：** 直接删除 `ai-agent-bridge.exe` 文件即可。
- **源码用户：** 关掉运行 `bridge.py` 的窗口即可，删除解压的文件夹。
- 两种方式都没有残留文件或注册表项。

### 云端和本地可以同时用吗？

可以。映创云（云端）和 本地智能体 是两个不同的供应商，
都可以添加，聊天时随意切换。

---

> **提示：** 如遇到其他问题，请检查连接器窗口的输出日志，或提交 Issue 到项目仓库。
