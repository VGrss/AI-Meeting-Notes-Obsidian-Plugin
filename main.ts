import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView } from 'obsidian';
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
	// API Keys - conditionnelles selon le provider choisi
	openaiApiKey: string;
	glitchTipDsn: string;
	
	// Provider settings
	transcriberProvider: 'openai-whisper' | 'whispercpp' | 'fasterwhisper';
	summarizerProvider: 'openai-gpt4o' | 'ollama' | 'gpt4all';
	
	// Customization
	customSummaryPrompt: string;
	
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
	glitchTipDsn: 'https://fc4c4cf2c55b4aaaa076954be7e02814@app.glitchtip.com/12695',
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

	async onload() {
		await this.loadSettings();
		
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
		new RecordingModal(this.app, this.settings.transcriberProvider, this.settings.summarizerProvider).open();
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
		const openaiTranscriber = new OpenAITranscriber(this.settings.openaiApiKey);
		const openaiSummarizer = new OpenAISummarizer(this.settings.openaiApiKey, this.settings.customSummaryPrompt);
		
		registerProvider(openaiTranscriber);
		registerProvider(openaiSummarizer);
		
		// TODO: Enregistrer les providers locaux quand ils seront implémentés
		// registerProvider(new OllamaSummarizer(this.settings.localProviders.ollama));
		// registerProvider(new WhisperCppTranscriber(this.settings.localProviders.whispercpp));
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
			text: 'Configure your AI-powered voice note-taking plugin. Choose your transcription and summary providers according to your needs.',
			cls: 'setting-description'
		});

		// Provider Configuration Section
		containerEl.createEl('h3', { text: '🤖 Provider Configuration' });
		
		containerEl.createEl('p', {
			text: 'Select providers for audio transcription and AI summarization. OpenAI API key is only required for OpenAI cloud providers.',
			cls: 'setting-description'
		});

		// Transcription Provider
		new Setting(containerEl)
			.setName('Transcription Provider')
			.setDesc('Choose the audio transcription service')
			.addDropdown(dropdown => {
				dropdown
					.addOption('openai-whisper', 'OpenAI Whisper (Cloud)')
					.addOption('whispercpp', 'Whisper.cpp (Local)')
					.addOption('fasterwhisper', 'FasterWhisper (Local)')
					.setValue(this.plugin.settings.transcriberProvider)
					.onChange(async (value) => {
						this.plugin.settings.transcriberProvider = value as any;
						await this.plugin.saveSettings();
						this.display(); // Refresh to show/hide API key field
					});
			});

		// Summary Provider
		new Setting(containerEl)
			.setName('Summary Provider')
			.setDesc('Choose the AI summarization service')
			.addDropdown(dropdown => {
				dropdown
					.addOption('openai-gpt4o', 'OpenAI GPT-4o (Cloud)')
					.addOption('ollama', 'Ollama (Local)')
					.addOption('gpt4all', 'GPT4All (Local)')
					.setValue(this.plugin.settings.summarizerProvider)
					.onChange(async (value) => {
						this.plugin.settings.summarizerProvider = value as any;
						await this.plugin.saveSettings();
						this.display(); // Refresh to show/hide API key field
					});
			});

		// OpenAI API Key (conditional)
		const needsOpenAI = this.plugin.settings.transcriberProvider === 'openai-whisper' || 
							this.plugin.settings.summarizerProvider === 'openai-gpt4o';

		if (needsOpenAI) {
			new Setting(containerEl)
				.setName('OpenAI API Key')
				.setDesc('Required for OpenAI providers (Whisper and/or GPT-4o)')
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
				text: '💡 Need an API key? Visit the OpenAI platform above to create your account and get your API key.',
				cls: 'help-text'
			});
		}

		// Local Providers Configuration
		if (this.plugin.settings.transcriberProvider === 'whispercpp' || 
			this.plugin.settings.transcriberProvider === 'fasterwhisper' ||
			this.plugin.settings.summarizerProvider === 'ollama' ||
			this.plugin.settings.summarizerProvider === 'gpt4all') {
			
			containerEl.createEl('h4', { text: 'Local Providers Configuration' });
			
			// Ollama Configuration
			if (this.plugin.settings.summarizerProvider === 'ollama') {
				containerEl.createEl('h5', { text: 'Ollama' });
				
			new Setting(containerEl)
				.setName('Ollama Host')
				.setDesc('Ollama server address')
					.addText(text => {
						text.setValue(this.plugin.settings.localProviders.ollama.host);
						text.onChange(async (value) => {
							this.plugin.settings.localProviders.ollama.host = value;
							await this.plugin.saveSettings();
						});
					});

			new Setting(containerEl)
				.setName('Ollama Port')
				.setDesc('Ollama server port')
					.addText(text => {
						text.setValue(this.plugin.settings.localProviders.ollama.port.toString());
						text.onChange(async (value) => {
							this.plugin.settings.localProviders.ollama.port = parseInt(value) || 11434;
							await this.plugin.saveSettings();
						});
					});

			new Setting(containerEl)
				.setName('Ollama Model')
				.setDesc('Model name to use')
					.addText(text => {
						text.setValue(this.plugin.settings.localProviders.ollama.model);
						text.onChange(async (value) => {
							this.plugin.settings.localProviders.ollama.model = value;
							await this.plugin.saveSettings();
						});
					});
			}

			// WhisperCpp Configuration
			if (this.plugin.settings.transcriberProvider === 'whispercpp') {
				containerEl.createEl('h5', { text: 'WhisperCpp' });
				
			new Setting(containerEl)
				.setName('WhisperCpp Binary Path')
				.setDesc('Path to whisper.cpp executable')
					.addText(text => {
						text.setValue(this.plugin.settings.localProviders.whispercpp.binaryPath);
						text.onChange(async (value) => {
							this.plugin.settings.localProviders.whispercpp.binaryPath = value;
							await this.plugin.saveSettings();
						});
					});

			new Setting(containerEl)
				.setName('WhisperCpp Model Path')
				.setDesc('Path to model file')
					.addText(text => {
						text.setValue(this.plugin.settings.localProviders.whispercpp.modelPath);
						text.onChange(async (value) => {
							this.plugin.settings.localProviders.whispercpp.modelPath = value;
							await this.plugin.saveSettings();
						});
					});
			}

			// FasterWhisper Configuration
			if (this.plugin.settings.transcriberProvider === 'fasterwhisper') {
				containerEl.createEl('h5', { text: 'FasterWhisper' });
				
			new Setting(containerEl)
				.setName('Python Path')
				.setDesc('Path to Python executable')
					.addText(text => {
						text.setValue(this.plugin.settings.localProviders.fasterwhisper.pythonPath);
						text.onChange(async (value) => {
							this.plugin.settings.localProviders.fasterwhisper.pythonPath = value;
							await this.plugin.saveSettings();
						});
					});

			new Setting(containerEl)
				.setName('Model Name')
				.setDesc('FasterWhisper model name to use')
					.addText(text => {
						text.setValue(this.plugin.settings.localProviders.fasterwhisper.modelName);
						text.onChange(async (value) => {
							this.plugin.settings.localProviders.fasterwhisper.modelName = value;
							await this.plugin.saveSettings();
						});
					});
			}
		}

		// AI Customization Section
		containerEl.createEl('h3', { text: '📝 AI Customization' });
		
		containerEl.createEl('p', {
			text: 'Customize the prompt used to generate summaries of your voice recordings. This allows you to adapt the output format and focus to your specific needs.',
			cls: 'setting-description'
		});

		new Setting(containerEl)
			.setName('Custom Summary Prompt')
			.setDesc('Customize the prompt sent to AI for generating summaries')
			.addTextArea(text => {
				text.setPlaceholder('Enter your custom summary prompt...');
				text.setValue(this.plugin.settings.customSummaryPrompt || DEFAULT_SUMMARY_PROMPT);
				text.inputEl.rows = 12; // Augmenté de 8 à 12 lignes
				text.inputEl.addClass('custom-summary-prompt-textarea');
				text.onChange(async (value) => {
					this.plugin.settings.customSummaryPrompt = value;
					await this.plugin.saveSettings();
				});
			})
			.addExtraButton(button => button
				.setIcon('reset')
				.setTooltip('Reset to Default Prompt')
				.onClick(async () => {
					this.plugin.settings.customSummaryPrompt = DEFAULT_SUMMARY_PROMPT;
					await this.plugin.saveSettings();
					this.display(); // Refresh the settings display
				}));

		containerEl.createEl('p', {
			text: '💡 The prompt should include instructions for the AI on how to analyze and summarize voice recordings. Use "**Transcript:**" as a placeholder where the actual transcript will be inserted.',
			cls: 'help-text'
		});

		// Monitoring Section (simplified)
		containerEl.createEl('h3', { text: '🛡️ Monitoring' });
		
		containerEl.createEl('p', {
			text: 'Error monitoring configuration with GlitchTip to improve plugin reliability.',
			cls: 'setting-description'
		});

		new Setting(containerEl)
			.setName('GlitchTip Token')
			.setDesc('Error monitoring token (configured by default)')
			.addText(text => {
				text.setValue(this.plugin.settings.glitchTipDsn);
				text.inputEl.type = 'password';
				text.onChange(async (value) => {
					this.plugin.settings.glitchTipDsn = value;
					await this.plugin.saveSettings();
				});
			})
			.addExtraButton(button => button
				.setIcon('external-link')
				.setTooltip('Learn more about GlitchTip')
				.onClick(() => {
					window.open('https://glitchtip.com/', '_blank');
				}));

		containerEl.createEl('p', {
			text: '💡 GlitchTip is an open-source error tracking service. The default token is configured for automatic monitoring.',
			cls: 'help-text'
		});
	}
}