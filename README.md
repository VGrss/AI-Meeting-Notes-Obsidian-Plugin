# 🎙️ AI Voice Meeting Notes - Obsidian Plugin

Record, transcribe, and summarize voice meetings directly in Obsidian with AI integration.

## ✨ Features

- **🎵 Voice Recording**: Start, pause, resume, and stop audio recordings with a clean interface
- **🤖 AI Transcription**: Powered by OpenAI Whisper for accurate speech-to-text conversion
- **📝 Smart Summarization**: Generate intelligent meeting summaries using GPT-4o
- **⚡ Real-time Processing**: See live status updates as your recording is processed
- **📂 Organized History**: Collapsible cards with tabs for easy summary/transcript switching
- **🎨 Modern UI**: Clean, space-efficient design with shadcn styling

## 📦 Installation

1. Clone this repository into your vault's plugins folder: `VaultFolder/.obsidian/plugins/ai-voice-meeting-notes/`
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Enable the plugin in Obsidian settings

## 🚀 Quick Setup

### 🔑 API Key Setup
1. Get your OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. In Obsidian: Settings → Community Plugins → AI Voice Meeting Notes
3. Paste your API key and save

That's it! You're ready to start recording. 🎉

## 🎯 How to Use

1. **🎙️ Start Recording**: Click the microphone icon in the sidebar or ribbon
2. **⏯️ Control Playback**: Use pause/resume as needed during your meeting
3. **✅ Finish Recording**: Click "Recording Complete" to stop
4. **👀 Watch the Magic**: See real-time processing updates in your recording card
5. **📋 Copy & Share**: Use the hover copy button to grab summaries or transcripts

## 🛠️ Development

```bash
npm run dev
```

This will start the build process in watch mode.

## 📚 Documentation

- [Product Specification](rules/product-spec.md) - Complete product overview and features
- [Local Providers Setup](rules/local-providers.md) - Guide for setting up local AI providers
- [Multi-Providers Configuration](rules/multi-providers-setup.md) - Advanced provider configuration
- [Release Procedure](rules/RELEASE_PROCEDURE.md) - Development and release guidelines

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT