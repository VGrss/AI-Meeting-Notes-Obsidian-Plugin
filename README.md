# AI Voice Meeting Notes - Obsidian Plugin

Record, transcribe, and summarize voice meetings directly in Obsidian with AI integration.

## Features

- **Voice Recording**: Start, pause, resume, and stop audio recordings
- **Multiple Transcription Services**: Support for OpenAI Whisper, Deepgram, and AssemblyAI
- **AI Summarization**: Generate meeting summaries using OpenAI GPT
- **Flexible Output**: Insert into current note, create new note, or copy to clipboard
- **Settings Management**: Configure API keys and transcription preferences

## Installation

1. Clone this repository into your vault's plugins folder: `VaultFolder/.obsidian/plugins/ai-voice-meeting-notes/`
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Enable the plugin in Obsidian settings

## Development

```bash
npm run dev
```

This will start the build process in watch mode.

## Configuration

1. Go to Settings → Community Plugins → AI Voice Meeting Notes
2. Configure your transcription service API key
3. Configure your OpenAI API key for summaries

### Recommended Transcription Services

- **OpenAI Whisper**: Best overall accuracy, excellent with technical content
- **Deepgram**: Fast real-time transcription, ideal for live meetings
- **AssemblyAI**: Good balance of speed and accuracy with competitive pricing

## Usage

1. Click the microphone icon in the ribbon or use the command palette
2. Start recording your meeting
3. Use pause/resume as needed
4. Stop recording when finished
5. Review the transcript and generate an AI summary
6. Insert into your current note or create a new one

## API Key Setup

### OpenAI Whisper
Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

### Deepgram
Get your API key from [Deepgram Console](https://console.deepgram.com/)

### AssemblyAI
Get your API key from [AssemblyAI Dashboard](https://www.assemblyai.com/dashboard/)

## License

MIT