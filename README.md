# 映创AI助手 — 多AI群聊桌面客户端 🎉

> 让多个 AI 模型在一个群里互相讨论，支持云端零配置开箱即用 + 本地智能体双模式。

## ✨ 核心特色

- **💬 多AI群聊** — 市面上独有的功能，多个模型在一个群里互相讨论、协作
- **☁️ 云端模式** — 安装即用，零配置，支持 DeepSeek / Groq 高速模型
- **🖥️ 本地模式** — 接入本地 Ollama + Hermes Agent，数据不出本机
- **🤖 4智能体协作** — Hermes + WorkBuddy + QClaw + 本地模型同台讨论
- **🔒 完全离线可选** — 本地模式所有数据在本地运行，隐私无忧
- **🔄 自动更新** — 新版本自动检测更新

## 📥 下载

👉 **[免费下载完整包](https://i.hwzs.club)**（25MB，含安装程序 + 桥梁工具 + 使用说明）

Windows 64位，双击安装即可使用。

## 🚀 快速开始

### 云端模式（零配置）
1. 下载安装
2. 打开软件，选择「映创云」
3. 开始聊天

### 本地模式（极客）
1. 安装 Ollama + 下载一个模型
2. 启动桥梁服务（`python bridge.py` 或双击 `local-ai-agent.exe`）
3. 在软件中添加供应商 `http://localhost:5050/v1`
4. 创建群聊，加入多个智能体

## 🏗️ 技术栈

- **前端**: React + TypeScript + TailwindCSS + Vite
- **桌面端**: Tauri v2 (Rust)
- **云端代理**: FastAPI (新加坡 Docker)
- **本地桥梁**: Python Flask

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建桌面端
npx @tauri-apps/cli build
```

## 📄 许可证

MIT

---

> 基于 [Talkio](https://github.com/lilongtao/talkio) 二次开发，原项目 MIT 协议。
