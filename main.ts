import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView } from 'obsidian';
import { ErrorTrackingService } from './services/ErrorTrackingService';
import { VoiceRecorder } from './audio/VoiceRecorder';
import { RecordingModal } from './ui/RecordingModal';
import { TranscriptModal } from './ui/TranscriptModal';
import { RecordingView, RecordingData } from './ui/RecordingView';
import { 
  registerProvider, 
  getTranscriberProvider, 
  getSummarizerProvider,
  ProviderFactory 
} from './src/providers';
import { OpenAITranscriber, OpenAISummarizer } from './src/providers/openai';

interface VoiceNotesSettings {
	openaiApiKey: string;
	glitchTipDsn: string;
	enableErrorTracking: boolean;
	customSummaryPrompt: string;
	
	// Provider settings
	transcriberProvider: 'openai-whisper' | 'whispercpp' | 'fasterwhisper';
	summarizerProvider: 'openai-gpt4o' | 'ollama' | 'gpt4all';
	
	// Local provider configurations
	localProviders: {
		ollama: {
			host: string;
			port: number;
			model: string;
		};
		whispercpp: {
			binaryPath: string;
			modelPath: string;
			extraArgs: string[];
		};
		fasterwhisper: {
			pythonPath: string;
			modelName: string;
		};
	};
}

// RecordingData interface moved to ui/RecordingView.ts

const DEFAULT_SUMMARY_PROMPT = `You are analyzing a voice recording transcript from a meeting or discussion. Please provide a comprehensive summary using the EXACT SAME LANGUAGE as the transcript (if transcript is in French, respond in French; if in Spanish, respond in Spanish, etc.).

Structure your response with these sections:

1. **Main Topics Discussed**: What were the primary subjects covered?
2. **Key Points**: The most important information shared
3. **Decisions Made**: Any conclusions or agreements reached
4. **Action Items**: Tasks or next steps identified (if any)
5. **Context & Insights**: Important context or insights that emerged

CRITICAL: Your entire response must be in the same language as the transcript. Do not translate or use English if the transcript is in another language.`;

const DEFAULT_SETTINGS: VoiceNotesSettings = {
	openaiApiKey: '',
	glitchTipDsn: '',
	enableErrorTracking: true,
	customSummaryPrompt: DEFAULT_SUMMARY_PROMPT,
	
	// Provider settings
	transcriberProvider: 'openai-whisper',
	summarizerProvider: 'openai-gpt4o',
	
	// Local provider configurations
	localProviders: {
		ollama: {
			host: 'localhost',
			port: 11434,
			model: 'mistral:7b',
		},
		whispercpp: {
			binaryPath: '',
			modelPath: '',
			extraArgs: [],
		},
		fasterwhisper: {
			pythonPath: 'python',
			modelName: 'small',
		},
	},
}

const RECORDING_VIEW_TYPE = 'voice-recording-view';

// OpenAIService class moved to services/OpenAIService.ts


export default class VoiceNotesPlugin extends Plugin {
	settings: VoiceNotesSettings;
	statusBarItem: HTMLElement;
	recordings: RecordingData[] = [];
	errorTracker: ErrorTrackingService;

	async onload() {
		await this.loadSettings();
		
		// Initialize error tracking
		this.errorTracker = new ErrorTrackingService();
		this.errorTracker.init(this.settings.glitchTipDsn, this.settings.enableErrorTracking);
		
		// Initialize providers
		this.initializeProviders();

		this.addRibbonIcon('mic', 'Open Voice Recording Panel', (evt: MouseEvent) => {
			this.activateRecordingView();
		});

		this.addCommand({
			id: 'toggle-recording-panel',
			name: 'Toggle Voice Recording Panel',
			callback: () => {
				this.toggleRecordingView();
			}
		});

		this.addCommand({
			id: 'start-recording-modal',
			name: 'Start Voice Recording (Modal)',
			callback: () => {
				this.openRecordingModal();
			}
		});

		this.registerView(
			RECORDING_VIEW_TYPE,
			(leaf) => new RecordingView(
				leaf, 
				this.settings.transcriberProvider,
				this.settings.summarizerProvider,
				this.errorTracker,
				this.recordings,
				(recording) => this.addRecording(recording),
				() => this.saveSettings()
			)
		);

		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText('🎙️ Recording');
		this.statusBarItem.addClass('mod-clickable');
		this.statusBarItem.onClickEvent(() => {
			this.toggleRecordingView();
		});
		this.statusBarItem.setAttribute('title', 'Toggle Voice Recording Panel');

		this.addSettingTab(new VoiceNotesSettingTab(this.app, this));
	}

	onunload() {
	}

	openRecordingModal() {
		new RecordingModal(this.app, this.settings.transcriberProvider, this.settings.summarizerProvider, this.errorTracker).open();
	}

	async activateRecordingView() {
		const { workspace } = this.app;
		
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(RECORDING_VIEW_TYPE);
		
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: RECORDING_VIEW_TYPE, active: true });
		}
		
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async toggleRecordingView() {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(RECORDING_VIEW_TYPE);
		
		if (leaves.length > 0) {
			// Panel is open, close it
			leaves[0].detach();
		} else {
			// Panel is closed, open it
			await this.activateRecordingView();
		}
	}

	async loadSettings() {
		const data = await this.loadData() || {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});
		this.recordings = data.recordings || [];
	}

	async saveSettings() {
		await this.saveData({ settings: this.settings, recordings: this.recordings });
	}

	addRecording(recording: RecordingData) {
		this.recordings.unshift(recording);
		this.saveSettings();
	}

	/**
	 * Initialise tous les providers disponibles
	 */
	private initializeProviders() {
		// Enregistrer les providers OpenAI
		const openaiTranscriber = new OpenAITranscriber(this.settings.openaiApiKey, this.errorTracker);
		const openaiSummarizer = new OpenAISummarizer(this.settings.openaiApiKey, this.settings.customSummaryPrompt, this.errorTracker);
		
		registerProvider(openaiTranscriber);
		registerProvider(openaiSummarizer);
		
		// TODO: Enregistrer les providers locaux quand ils seront implémentés
		// registerProvider(new OllamaSummarizer(this.settings.localProviders.ollama, this.errorTracker));
		// registerProvider(new WhisperCppTranscriber(this.settings.localProviders.whispercpp, this.errorTracker));
	}
}

// RecordingModal class moved to ui/RecordingModal.ts

// TranscriptModal class moved to ui/TranscriptModal.ts

// RecordingView class moved to ui/RecordingView.ts

// VoiceRecorder class moved to audio/VoiceRecorder.ts

// ConfirmDiscardModal class moved to ui/RecordingView.ts

class VoiceNotesSettingTab extends PluginSettingTab {
	plugin: VoiceNotesPlugin;

	constructor(app: App, plugin: VoiceNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'AI Voice Meeting Notes Settings' });

		containerEl.createEl('p', {
			text: 'This plugin uses OpenAI Whisper for audio transcription and GPT-4o for intelligent summarization of your voice recordings.',
			cls: 'setting-description'
		});

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('API key for OpenAI services (Whisper transcription + GPT-4o summarization)')
			.addText(text => {
				text.setPlaceholder('Enter your OpenAI API key');
				
				if (this.plugin.settings.openaiApiKey) {
					text.setValue('*'.repeat(this.plugin.settings.openaiApiKey.length));
				} else {
					text.setValue('');
				}
				
				text.inputEl.type = 'password';
				
				text.onChange(async (value) => {
					if (value !== '*'.repeat(this.plugin.settings.openaiApiKey.length)) {
						this.plugin.settings.openaiApiKey = value;
						await this.plugin.saveSettings();
					}
				});
			})
			.addExtraButton(button => button
				.setIcon('external-link')
				.setTooltip('Get OpenAI API Key')
				.onClick(() => {
					window.open('https://platform.openai.com/api-keys', '_blank');
				}));

		containerEl.createEl('p', {
			text: '💡 Need an API key? Visit the OpenAI Platform above to create your account and get your API key.',
			cls: 'help-text'
		});

		// Custom AI Summary Prompt Section
		containerEl.createEl('h3', { text: 'AI Summary Customization' });
		
		containerEl.createEl('p', {
			text: 'Customize the AI prompt used to generate summaries from your voice recordings. This allows you to tailor the output format and focus to your specific needs.',
			cls: 'setting-description'
		});

		new Setting(containerEl)
			.setName('Custom Summary Prompt')
			.setDesc('Customize the prompt sent to GPT-4o for generating summaries')
			.addTextArea(text => {
				text.setPlaceholder('Enter your custom summary prompt...');
				text.setValue(this.plugin.settings.customSummaryPrompt || DEFAULT_SUMMARY_PROMPT);
				text.inputEl.rows = 8;
				text.inputEl.addClass('custom-summary-prompt-textarea');
				text.onChange(async (value) => {
					this.plugin.settings.customSummaryPrompt = value;
					await this.plugin.saveSettings();
				});
			})
			.addExtraButton(button => button
				.setIcon('reset')
				.setTooltip('Restore Default Prompt')
				.onClick(async () => {
					this.plugin.settings.customSummaryPrompt = DEFAULT_SUMMARY_PROMPT;
					await this.plugin.saveSettings();
					this.display(); // Refresh the settings display
				}));

		containerEl.createEl('p', {
			text: '💡 The prompt should include instructions for the AI on how to analyze and summarize voice recordings. Use "**Transcript:**" as a placeholder where the actual transcript will be inserted.',
			cls: 'help-text'
		});

		// Error Tracking Section
		containerEl.createEl('h3', { text: 'Error Tracking (Optional)' });
		
		containerEl.createEl('p', {
			text: 'Configure GlitchTip error tracking to monitor issues and improve reliability. This helps identify problems like transcription failures.',
			cls: 'setting-description'
		});

		new Setting(containerEl)
			.setName('Enable Error Tracking')
			.setDesc('Enable GlitchTip error tracking to monitor application issues')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableErrorTracking)
				.onChange(async (value) => {
					this.plugin.settings.enableErrorTracking = value;
					await this.plugin.saveSettings();
					// Reinitialize error tracking with new setting
					this.plugin.errorTracker.init(this.plugin.settings.glitchTipDsn, value);
				}));

		new Setting(containerEl)
			.setName('GlitchTip DSN')
			.setDesc('Data Source Name (DSN) for your GlitchTip project')
			.addText(text => {
				text.setPlaceholder('https://your-key@your-glitchtip-instance.com/project-id');
				text.setValue(this.plugin.settings.glitchTipDsn || '');
				text.onChange(async (value) => {
					this.plugin.settings.glitchTipDsn = value;
					await this.plugin.saveSettings();
					// Reinitialize error tracking with new DSN
					this.plugin.errorTracker.init(value, this.plugin.settings.enableErrorTracking);
				});
			})
			.addExtraButton(button => button
				.setIcon('external-link')
				.setTooltip('Learn about GlitchTip')
				.onClick(() => {
					window.open('https://glitchtip.com/', '_blank');
				}));

		containerEl.createEl('p', {
			text: '💡 GlitchTip is an open-source error tracking service. You can use the hosted service or self-host it.',
			cls: 'help-text'
		});
	}
}