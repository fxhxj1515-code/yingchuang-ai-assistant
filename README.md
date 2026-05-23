# 映创AI助手 (YingChuang AI Assistant)

A cross-platform AI assistant desktop app built with Tauri v2 + React. Supports multi-model chat, MCP tools, local knowledge base, WeChat bot, and collaborative workspace.

> 跨平台 AI 助手桌面应用，基于 Tauri v2 + React。支持多模型对话、MCP 工具、本地知识库、微信机器人、协作空间。

> Một ứng dụng desktop trợ lý AI đa nền tảng được xây dựng bằng Tauri v2 + React. Hỗ trợ trò chuyện đa mô hình, công cụ MCP, cơ sở tri thức cục bộ, bot WeChat và không gian làm việc cộng tác. *(Tiếng Việt)*

## Features / 功能 / Tính năng

- **Multi-model chat** — DeepSeek, Qwen, Llama, and more via OpenAI-compatible API
- **7 languages** — English, 中文, Bahasa Indonesia, Tiếng Việt, ภาษาไทย, Bahasa Melayu, Tagalog
- **MCP Tools** — File operations, terminal, web search, Git, and custom tools
- **Local RAG** — Knowledge base with local embedding and FAISS search
- **WeChat Bot** — Desktop WeChat automation for AI replies
- **Collaborative Workspace** — Multi-agent group chat with task orchestration
- **Auto-update** — Built-in updater with signature verification
- **Cross-platform** — Windows (MSI/NSIS), macOS, Linux

## Download / 下载 / Tải xuống

Download the latest installer from [Releases](https://github.com/fxhxj1515-code/yingchuang-ai-assistant/releases).

> Tải xuống trình cài đặt mới nhất từ [Releases](https://github.com/fxhxj1515-code/yingchuang-ai-assistant/releases).

Or build from source — see below.

## Build from Source / 从源码编译

### Prerequisites / 环境要求

- Node.js 20+
- pnpm
- Rust (for Tauri v2)
- Windows 10 1809+ / macOS 12+ / Linux

### Quick Start / 快速开始

```bash
# Install dependencies
pnpm install

# Development
pnpm run dev

# Build
pnpm run tauri build
```

The installer will be in `src-tauri/target/release/bundle/`.

## Project Structure / 项目结构

```
├── src/                    # React frontend
│   ├── i18n/              # Internationalization (7 languages)
│   │   └── locales/       # Translation JSON files
│   ├── components/        # UI components
│   ├── pages/             # Page components
│   ├── services/          # API services
│   └── stores/            # Zustand stores
├── src-tauri/             # Tauri Rust backend
├── local-bridge/          # Local Python bridge (MCP, RAG, WeChat bot)
└── scripts/               # Build scripts
```

## Auto-Update / 自动更新

The auto-update feature is enabled by default and points to our official update server. To use your own update server, modify `pubkey` and `endpoints` in `src-tauri/tauri.conf.json`.

## License

MIT — see [LICENSE](./LICENSE) for details.

> **Note**: This software is free and open-source. The auto-update service, cloud AI models, and RAG embedding service are hosted by us. For commercial use or custom deployment, contact us.
>
> **注意**: 本软件免费开源。自动更新服务、云端 AI 模型、RAG 嵌入服务由我们托管。商业使用或定制部署请联系我们。
>
> **Lưu ý**: Phần mềm này là miễn phí và mã nguồn mở. Dịch vụ tự động cập nhật, các mô hình AI đám mây và dịch vụ nhúng RAG được chúng tôi lưu trữ. Để sử dụng thương mại hoặc triển khai tùy chỉnh, vui lòng liên hệ với chúng tôi.
