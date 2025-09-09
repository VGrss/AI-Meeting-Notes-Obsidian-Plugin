import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView } from 'obsidian';
import * as Sentry from '@sentry/browser';

interface VoiceNotesSettings {
	openaiApiKey: string;
	glitchTipDsn: string;
	enableErrorTracking: boolean;
}

interface RecordingData {
	id: string;
	timestamp: Date;
	duration: number;
	transcript: string;
	summary: string;
	topic: string;
}

const DEFAULT_SETTINGS: VoiceNotesSettings = {
	openaiApiKey: '',
	glitchTipDsn: '',
	enableErrorTracking: true
}

const RECORDING_VIEW_TYPE = 'voice-recording-view';

class ErrorTrackingService {
	private isInitialized = false;

	init(dsn: string, enabled: boolean) {
		if (!enabled || !dsn || this.isInitialized) return;

		try {
			Sentry.init({
				dsn: dsn,
				environment: 'production',
				integrations: [
					Sentry.browserTracingIntegration(),
				],
				tracesSampleRate: 0.1,
				beforeSend(event) {
					if (event.exception) {
						const error = event.exception.values?.[0];
						if (error) {
							console.error('Error captured by GlitchTip:', error);
						}
					}
					return event;
				}
			});
			
			Sentry.setTag('plugin', 'ai-voice-meeting-notes');
			this.isInitialized = true;
			console.log('GlitchTip error tracking initialized');
		} catch (error) {
			console.error('Failed to initialize GlitchTip:', error);
		}
	}

	captureError(error: Error, context?: Record<string, any>) {
		if (!this.isInitialized) {
			console.error('Error (tracking disabled):', error);
			return;
		}

		Sentry.withScope((scope) => {
			if (context) {
				Object.entries(context).forEach(([key, value]) => {
					scope.setExtra(key, value);
				});
			}
			Sentry.captureException(error);
		});
	}

	captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
		if (!this.isInitialized) {
			console.log(`Message (tracking disabled): ${message}`);
			return;
		}

		Sentry.withScope((scope) => {
			scope.setLevel(level);
			if (context) {
				Object.entries(context).forEach(([key, value]) => {
					scope.setExtra(key, value);
				});
			}
			Sentry.captureMessage(message);
		});
	}

	setUserContext(userId: string, userData?: Record<string, any>) {
		if (!this.isInitialized) return;
		
		Sentry.setUser({
			id: userId,
			...userData
		});
	}
}

class OpenAIService {
	private apiKey: string;
	private errorTracker?: ErrorTrackingService;
	
	// OpenAI Whisper limits: 25MB max file size
	private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
	private readonly RECOMMENDED_MAX_SIZE = 20 * 1024 * 1024; // 20MB recommended limit

	constructor(apiKey: string, errorTracker?: ErrorTrackingService) {
		this.apiKey = apiKey;
		this.errorTracker = errorTracker;
	}

	private checkFileSize(audioBlob: Blob): { canUpload: boolean; message?: string; recommendation?: string } {
		const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
		
		if (audioBlob.size > this.MAX_FILE_SIZE) {
			return {
				canUpload: false,
				message: `Audio file is too large (${sizeMB}MB). OpenAI Whisper has a 25MB limit.`,
				recommendation: "Try recording shorter segments (under 10 minutes) or use lower quality settings."
			};
		}
		
		if (audioBlob.size > this.RECOMMENDED_MAX_SIZE) {
			return {
				canUpload: true,
				message: `Audio file is large (${sizeMB}MB). This may take longer to process.`,
				recommendation: "For faster processing, consider shorter recordings."
			};
		}
		
		return { canUpload: true };
	}

	async transcribeWithChunking(audioBlob: Blob, maxChunkSize = 15 * 1024 * 1024): Promise<string> {
		const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
		
		// If file is small enough, use regular transcription
		if (audioBlob.size <= maxChunkSize) {
			return this.transcribeAudio(audioBlob);
		}

		this.errorTracker?.captureMessage('Large file detected, chunking not yet implemented', 'warning', {
			function: 'transcribeWithChunking',
			fileSizeMB: sizeMB,
			maxChunkSizeMB: (maxChunkSize / (1024 * 1024)).toFixed(1)
		});

		// For now, try regular upload and let it fail with helpful message
		// TODO: Implement actual chunking by splitting audio file
		return this.transcribeAudio(audioBlob);
	}

	async transcribeAudio(audioBlob: Blob): Promise<string> {
		try {
			if (!this.apiKey) {
				const error = new Error('OpenAI API key not configured');
				this.errorTracker?.captureError(error, { 
					function: 'transcribeAudio',
					reason: 'missing_api_key' 
				});
				throw error;
			}

			// Pre-flight size check
			const sizeCheck = this.checkFileSize(audioBlob);
			const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
			
			if (!sizeCheck.canUpload) {
				const error = new Error(`${sizeCheck.message}\n\n${sizeCheck.recommendation}`);
				this.errorTracker?.captureError(error, {
					function: 'transcribeAudio',
					reason: 'file_too_large',
					fileSizeMB: sizeMB,
					fileSizeBytes: audioBlob.size
				});
				throw error;
			}
			
			// Log warning for large files
			if (sizeCheck.message) {
				this.errorTracker?.captureMessage('Large file upload attempt', 'warning', {
					function: 'transcribeAudio',
					fileSizeMB: sizeMB,
					message: sizeCheck.message,
					recommendation: sizeCheck.recommendation
				});
			}

			const formData = new FormData();
			formData.append('file', audioBlob, 'recording.wav');
			formData.append('model', 'whisper-1');

			const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
				},
				body: formData
			});

			if (!response.ok) {
				const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
				let errorMessage: string;
				
				// Handle specific HTTP status codes with helpful messages
				if (response.status === 413) {
					errorMessage = `Audio file is too large to transcribe (${sizeMB}MB).\n\nSolutions:\n• Record shorter segments (under 10 minutes)\n• Use lower quality settings in your browser\n• Break long recordings into smaller parts`;
				} else if (response.status === 400) {
					errorMessage = `Audio format not supported or file corrupted.\n\nTry:\n• Re-recording with different settings\n• Ensuring your microphone works properly`;
				} else if (response.status === 429) {
					errorMessage = `Rate limit exceeded. Please wait a moment before trying again.`;
				} else if (response.status >= 500) {
					errorMessage = `OpenAI service is temporarily unavailable (${response.status}).\n\nPlease try again in a few minutes.`;
				} else {
					errorMessage = `Transcription failed (${response.status}): ${response.statusText}`;
				}
				
				const error = new Error(errorMessage);
				this.errorTracker?.captureError(error, {
					function: 'transcribeAudio',
					httpStatus: response.status,
					responseText: response.statusText,
					fileSizeMB: sizeMB,
					audioBlobSize: audioBlob.size,
					helpfulErrorHandling: true
				});
				throw error;
			}

			const result = await response.json();
			
			// Log successful transcription
			this.errorTracker?.captureMessage('Audio transcription completed successfully', 'info', {
				function: 'transcribeAudio',
				audioBlobSize: audioBlob.size,
				transcriptLength: result.text?.length || 0
			});
			
			return result.text;
		} catch (error) {
			if (error instanceof Error) {
				// Only capture if not already captured above
				if (!error.message.includes('OpenAI API key') && !error.message.includes('Transcription failed')) {
					this.errorTracker?.captureError(error, {
						function: 'transcribeAudio',
						audioBlobSize: audioBlob.size,
						errorType: 'unexpected'
					});
				}
			}
			throw error;
		}
	}

	async generateSummary(transcript: string): Promise<string> {
		try {
			if (!this.apiKey) {
				const error = new Error('OpenAI API key not configured');
				this.errorTracker?.captureError(error, { 
					function: 'generateSummary',
					reason: 'missing_api_key' 
				});
				throw error;
			}

			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'gpt-4o',
					messages: [{
						role: 'user',
						content: `You are analyzing a voice recording transcript from a meeting or discussion. Please provide a comprehensive summary using the EXACT SAME LANGUAGE as the transcript (if transcript is in French, respond in French; if in Spanish, respond in Spanish, etc.).

Structure your response with these sections:

1. **Main Topics Discussed**: What were the primary subjects covered?
2. **Key Points**: The most important information shared
3. **Decisions Made**: Any conclusions or agreements reached
4. **Action Items**: Tasks or next steps identified (if any)
5. **Context & Insights**: Important context or insights that emerged

CRITICAL: Your entire response must be in the same language as the transcript. Do not translate or use English if the transcript is in another language.

**Transcript:**
${transcript}`
					}],
					max_tokens: 800,
					temperature: 0.3
				})
			});

			if (!response.ok) {
				const error = new Error(`Summary generation failed: ${response.statusText}`);
				this.errorTracker?.captureError(error, {
					function: 'generateSummary',
					httpStatus: response.status,
					responseText: response.statusText,
					transcriptLength: transcript.length
				});
				throw error;
			}

			const result = await response.json();
			
			// Log successful summary generation
			this.errorTracker?.captureMessage('AI summary generated successfully', 'info', {
				function: 'generateSummary',
				transcriptLength: transcript.length,
				summaryLength: result.choices[0].message.content?.length || 0
			});
			
			return result.choices[0].message.content;
		} catch (error) {
			if (error instanceof Error) {
				// Only capture if not already captured above
				if (!error.message.includes('OpenAI API key') && !error.message.includes('Summary generation failed')) {
					this.errorTracker?.captureError(error, {
						function: 'generateSummary',
						transcriptLength: transcript.length,
						errorType: 'unexpected'
					});
				}
			}
			throw error;
		}
	}

	async generateTopic(transcript: string): Promise<string> {
		try {
			if (!this.apiKey) {
				const error = new Error('OpenAI API key not configured');
				this.errorTracker?.captureError(error, { 
					function: 'generateTopic',
					reason: 'missing_api_key' 
				});
				throw error;
			}

			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'gpt-4o',
					messages: [{
						role: 'user',
						content: `Based on this voice recording transcript, provide a very short 2-word topic summary that captures the main subject discussed. Use the same language as the transcript.

Examples: "Project Planning", "Team Meeting", "Client Call", "Budget Review"

**Transcript:**
${transcript}`
					}],
					max_tokens: 10,
					temperature: 0.1
				})
			});

			if (!response.ok) {
				const error = new Error(`Topic generation failed: ${response.statusText}`);
				this.errorTracker?.captureError(error, {
					function: 'generateTopic',
					httpStatus: response.status,
					responseText: response.statusText,
					transcriptLength: transcript.length
				});
				throw error;
			}

			const result = await response.json();
			const topic = result.choices[0].message.content.trim();
			const cleanTopic = topic.replace(/^["']|["']$/g, '');
			
			// Log successful topic generation
			this.errorTracker?.captureMessage('Topic generated successfully', 'info', {
				function: 'generateTopic',
				transcriptLength: transcript.length,
				generatedTopic: cleanTopic
			});
			
			return cleanTopic;
		} catch (error) {
			if (error instanceof Error) {
				// Only capture if not already captured above
				if (!error.message.includes('OpenAI API key') && !error.message.includes('Topic generation failed')) {
					this.errorTracker?.captureError(error, {
						function: 'generateTopic',
						transcriptLength: transcript.length,
						errorType: 'unexpected'
					});
				}
			}
			throw error;
		}
	}
}


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

		this.addRibbonIcon('mic', 'Open Voice Recording Panel', (evt: MouseEvent) => {
			this.activateRecordingView();
		});

		this.addCommand({
			id: 'toggle-recording-panel',
			name: 'Toggle Voice Recording Panel',
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "r" }],
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
			(leaf) => new RecordingView(leaf, this)
		);

		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText('🎙️ Recording');
		this.statusBarItem.addClass('mod-clickable');
		this.statusBarItem.onClickEvent(() => {
			this.toggleRecordingView();
		});
		this.statusBarItem.setAttribute('title', 'Toggle Voice Recording Panel (Cmd+Shift+R)');

		this.addSettingTab(new VoiceNotesSettingTab(this.app, this));
	}

	onunload() {
	}

	openRecordingModal() {
		new RecordingModal(this.app, this).open();
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
}

class RecordingModal extends Modal {
	plugin: VoiceNotesPlugin;
	recorder: VoiceRecorder | null = null;
	isRecording = false;
	isPaused = false;
	recordingTime = 0;
	timeInterval: NodeJS.Timeout | null = null;

	constructor(app: App, plugin: VoiceNotesPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'AI Voice Meeting Notes' });

		const statusEl = contentEl.createDiv('recording-status');
		const timeEl = statusEl.createEl('div', { 
			text: '00:00', 
			cls: 'recording-time' 
		});

		const controlsEl = contentEl.createDiv('recording-controls');
		
		const startBtn = controlsEl.createEl('button', {
			text: '🎙️ Start Recording',
			cls: 'start-btn'
		});

		const pauseBtn = controlsEl.createEl('button', {
			text: '⏸️ Pause',
			cls: 'pause-btn',
			attr: { disabled: 'true' }
		});

		const stopBtn = controlsEl.createEl('button', {
			text: '✅ Recording complete',
			cls: 'stop-btn',
			attr: { disabled: 'true' }
		});

		startBtn.onclick = () => this.startRecording(startBtn, pauseBtn, stopBtn, timeEl);
		pauseBtn.onclick = () => this.pauseRecording(pauseBtn, timeEl);
		stopBtn.onclick = () => this.stopRecording(startBtn, pauseBtn, stopBtn, timeEl);
	}

	async startRecording(startBtn: HTMLButtonElement, pauseBtn: HTMLButtonElement, stopBtn: HTMLButtonElement, timeEl: HTMLElement) {
		if (!this.isRecording) {
			try {
				this.recorder = new VoiceRecorder(this.plugin.errorTracker);
				await this.recorder.start();
				this.isRecording = true;
				this.isPaused = false;
				
				startBtn.disabled = true;
				pauseBtn.disabled = false;
				stopBtn.disabled = false;
				startBtn.textContent = 'Recording...';

				this.startTimer(timeEl);
				new Notice('Recording started');
			} catch (error) {
				new Notice('Failed to start recording: ' + error.message);
			}
		}
	}

	pauseRecording(pauseBtn: HTMLButtonElement, timeEl: HTMLElement) {
		if (this.recorder && !this.isPaused) {
			this.recorder.pause();
			this.isPaused = true;
			pauseBtn.textContent = '▶️ Resume';
			this.stopTimer();
			new Notice('Recording paused');
		} else if (this.recorder && this.isPaused) {
			this.recorder.resume();
			this.isPaused = false;
			pauseBtn.textContent = '⏸️ Pause';
			this.startTimer(timeEl);
			new Notice('Recording resumed');
		}
	}

	async stopRecording(startBtn: HTMLButtonElement, pauseBtn: HTMLButtonElement, stopBtn: HTMLButtonElement, timeEl: HTMLElement) {
		if (this.recorder) {
				
			// Stop timer and reset display FIRST
			this.stopTimer();
			this.recordingTime = 0;
			timeEl.textContent = '00:00';
			
			const audioBlob = await this.recorder.stop();
			this.isRecording = false;
			this.isPaused = false;
			
			startBtn.disabled = false;
			pauseBtn.disabled = true;
			stopBtn.disabled = true;
			startBtn.textContent = 'Start Recording';
			pauseBtn.textContent = '⏸️ Pause';
			
			new Notice('Recording complete. Processing...');
			this.close();
			
			await this.processRecording(audioBlob);
		}
	}

	startTimer(timeEl: HTMLElement) {
		// Clear any existing timer first
		this.stopTimer();
		
		this.timeInterval = setInterval(() => {
			this.recordingTime++;
			const minutes = Math.floor(this.recordingTime / 60);
			const seconds = this.recordingTime % 60;
			const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
			timeEl.textContent = display;
		}, 1000);
	}

	stopTimer() {
		if (this.timeInterval) {
			clearInterval(this.timeInterval);
			this.timeInterval = null;
		}
	}

	async processRecording(audioBlob: Blob) {
		try {
			const openaiService = new OpenAIService(this.plugin.settings.openaiApiKey, this.plugin.errorTracker);
			const transcript = await openaiService.transcribeWithChunking(audioBlob);
			new TranscriptModal(this.app, this.plugin, transcript).open();
		} catch (error) {
			new Notice('Transcription failed: ' + error.message);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.stopTimer();
	}
}

class TranscriptModal extends Modal {
	plugin: VoiceNotesPlugin;
	transcript: string;
	summary: string = '';

	constructor(app: App, plugin: VoiceNotesPlugin, transcript: string) {
		super(app);
		this.plugin = plugin;
		this.transcript = transcript;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Transcript Results' });

		const transcriptContainer = contentEl.createDiv('transcript-container');
		transcriptContainer.createEl('h3', { text: 'Raw Transcript' });
		const transcriptEl = transcriptContainer.createEl('textarea', {
			attr: { 
				readonly: 'true',
				rows: '10',
				cols: '50'
			}
		});
		transcriptEl.value = this.transcript;

		const summaryContainer = contentEl.createDiv('summary-container');
		summaryContainer.createEl('h3', { text: 'AI Summary' });
		const summaryEl = summaryContainer.createEl('textarea', {
			attr: { 
				readonly: 'true',
				rows: '6',
				cols: '50',
				placeholder: 'Click "Generate Summary" to create AI summary'
			}
		});

		const actionsEl = contentEl.createDiv('actions');
		
		const summaryBtn = actionsEl.createEl('button', { text: 'Generate Summary' });
		summaryBtn.onclick = async () => {
			if (this.plugin.settings.openaiApiKey) {
				summaryBtn.disabled = true;
				summaryBtn.textContent = 'Generating...';
				try {
					this.summary = await this.generateSummary();
					summaryEl.value = this.summary;
				} catch (error) {
					new Notice('Failed to generate summary: ' + error.message);
				}
				summaryBtn.disabled = false;
				summaryBtn.textContent = 'Generate Summary';
			} else {
				new Notice('OpenAI API key not configured');
			}
		};

		const insertBtn = actionsEl.createEl('button', { text: 'Insert into Note' });
		insertBtn.onclick = () => this.insertIntoNote();

		const copyBtn = actionsEl.createEl('button', { text: 'Copy to Clipboard' });
		copyBtn.onclick = () => this.copyToClipboard();
	}

	async generateSummary(): Promise<string> {
		const openaiService = new OpenAIService(this.plugin.settings.openaiApiKey, this.plugin.errorTracker);
		return await openaiService.generateSummary(this.transcript);
	}

	async insertIntoNote() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		
		if (activeView) {
			const editor = activeView.editor;
			const content = this.formatContent();
			editor.replaceSelection(content);
			new Notice('Transcript inserted into current note');
		} else {
			try {
				await this.app.workspace.openLinkText('Voice Meeting Notes - ' + new Date().toLocaleString(), '', true);
				await new Promise(resolve => setTimeout(resolve, 200));
				
				const newActiveView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (newActiveView) {
					const editor = newActiveView.editor;
					editor.setValue(this.formatContent());
					new Notice('New note created with transcript');
				}
			} catch (error) {
				new Notice('Failed to insert transcript: ' + error.message);
			}
		}
		this.close();
	}

	copyToClipboard() {
		navigator.clipboard.writeText(this.formatContent());
		new Notice('Transcript copied to clipboard');
	}

	formatContent(): string {
		let content = `## Voice Meeting Notes - ${new Date().toLocaleString()}\n\n`;
		
		if (this.summary) {
			content += `### Summary\n${this.summary}\n\n`;
		}
		
		content += `### Raw Transcript\n${this.transcript}`;
		
		return content;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class RecordingView extends ItemView {
	plugin: VoiceNotesPlugin;
	recorder: VoiceRecorder | null = null;
	isRecording = false;
	isPaused = false;
	recordingTime = 0;
	timeInterval: NodeJS.Timeout | null = null;
	collapsedCards: { [key: string]: boolean } = {};
	activeTab: { [key: string]: 'summary' | 'transcript' } = {};

	constructor(leaf: WorkspaceLeaf, plugin: VoiceNotesPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return RECORDING_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Voice Recording';
	}

	getIcon(): string {
		return 'mic';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('voice-recording-sidebar');
		
		// 1. Top Header Section
		const headerSection = container.createDiv('header-section');
		const headerTitle = headerSection.createEl('h4', { 
			text: 'AI Voice Recording',
			cls: 'header-title'
		});
		const closeBtn = headerSection.createEl('button', {
			cls: 'close-button',
			attr: { 
				type: 'button',
				'aria-label': 'Close Panel'
			}
		});
		closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

		// 2. Timer & Controls Section
		const timerControlsSection = container.createDiv('timer-controls-section');
		
		// Timer Display
		const timeEl = timerControlsSection.createEl('div', { 
			text: '00:00', 
			cls: 'timer-display' 
		});

		// Button Stack
		const buttonStack = timerControlsSection.createDiv('button-stack');
		
		const startBtn = buttonStack.createEl('button', {
			text: '🎙️ Start Recording',
			cls: 'primary-button',
			attr: { 
				type: 'button',
				'aria-label': 'Start Recording'
			}
		});

		const pauseBtn = buttonStack.createEl('button', {
			text: '⏸️ Pause',
			cls: 'secondary-button',
			attr: { 
				disabled: 'true',
				type: 'button',
				'aria-label': 'Pause Recording'
			}
		});

		const completeBtn = buttonStack.createEl('button', {
			text: '✅ Complete Recording',
			cls: 'tertiary-button',
			attr: { 
				disabled: 'true',
				type: 'button',
				'aria-label': 'Complete Recording'
			}
		});

		// 4. Separator
		const separator = container.createDiv('separator');

		// 5. Recording History Section
		const historySection = container.createDiv('history-section');
		const historyHeader = historySection.createDiv('history-header');
		historyHeader.createEl('h5', { 
			text: 'RECORDING HISTORY',
			cls: 'history-title'
		});
		const historyListEl = historySection.createDiv('recordings-list');

		startBtn.onclick = () => this.toggleRecording(startBtn, pauseBtn, completeBtn, timeEl);
		pauseBtn.onclick = () => this.pauseRecording(pauseBtn, timeEl);
		completeBtn.onclick = () => this.completeRecording(startBtn, pauseBtn, completeBtn, historyListEl, timeEl);
		closeBtn.onclick = () => this.leaf.detach();
		
		this.refreshRecordingHistory(historyListEl);
	}

	async toggleRecording(startBtn: HTMLButtonElement, pauseBtn: HTMLButtonElement, completeBtn: HTMLButtonElement, timeEl: HTMLElement) {
		if (!this.isRecording) {
			// Start recording
			try {
				this.recorder = new VoiceRecorder(this.plugin.errorTracker);
				await this.recorder.start();
				this.isRecording = true;
				this.isPaused = false;
				
				// Transform start button to stop button (red) and enable other buttons
				startBtn.textContent = '🛑 Stop Recording';
				startBtn.className = 'stop-recording-button';
				pauseBtn.disabled = false;
				completeBtn.disabled = false;

				this.startTimer(timeEl);
				new Notice('Recording started');
			} catch (error) {
				new Notice('Failed to start recording: ' + error.message);
			}
		} else {
			// Show confirmation modal before discarding
			new ConfirmDiscardModal(this.plugin.app, async () => {
				await this.discardRecording(startBtn, pauseBtn, completeBtn, timeEl);
			}).open();
		}
	}

	pauseRecording(pauseBtn: HTMLButtonElement, timeEl: HTMLElement) {
		if (this.recorder && !this.isPaused) {
			this.recorder.pause();
			this.isPaused = true;
			pauseBtn.textContent = '▶️ Resume';
			this.stopTimer();
			new Notice('Recording paused');
		} else if (this.recorder && this.isPaused) {
			this.recorder.resume();
			this.isPaused = false;
			pauseBtn.textContent = '⏸️ Pause';
			this.startTimer(timeEl);
			new Notice('Recording resumed');
		}
	}

	async discardRecording(startBtn: HTMLButtonElement, pauseBtn: HTMLButtonElement, completeBtn: HTMLButtonElement, timeEl: HTMLElement) {
		if (this.recorder) {
			// Stop the recorder and discard audio
			await this.recorder.stop();
			
			// Reset all states
			this.isRecording = false;
			this.isPaused = false;
			this.stopTimer();
			this.recordingTime = 0;
			
			// Reset UI to initial state
			timeEl.textContent = '00:00';
			startBtn.textContent = '🎙️ Start Recording';
			startBtn.className = 'primary-button';
			pauseBtn.disabled = true;
			pauseBtn.textContent = '⏸️ Pause';
			completeBtn.disabled = true;
			
			new Notice('Recording discarded');
		}
	}

	async completeRecording(startBtn: HTMLButtonElement, pauseBtn: HTMLButtonElement, completeBtn: HTMLButtonElement, historyListEl: HTMLElement, timeEl: HTMLElement) {
		if (this.recorder) {
			// Save duration BEFORE stopping timer
			const recordingDuration = this.recordingTime;
			
			// Stop timer and reset display immediately 
			this.stopTimer();
			this.recordingTime = 0;
			timeEl.textContent = '00:00';
			
			const audioBlob = await this.recorder.stop();
			
			this.isRecording = false;
			this.isPaused = false;
			
			// Reset UI to initial state
			startBtn.textContent = '🎙️ Start Recording';
			startBtn.className = 'primary-button';
			pauseBtn.disabled = true;
			pauseBtn.textContent = '⏸️ Pause';
			completeBtn.disabled = true;
			
			// Create immediate processing card with unique ID
			const recordingId = Date.now().toString();
			const processingRecording: RecordingData = {
				id: recordingId,
				timestamp: new Date(),
				duration: recordingDuration,
				transcript: '⏳ Transcribing audio...',
				summary: '⏳ Processing will start after transcription...',
				topic: '⏳ Processing...'
			};
			
			// Add processing card to plugin data and refresh display
			this.plugin.recordings.unshift(processingRecording);
			this.refreshRecordingHistory(historyListEl);
			
			new Notice('Recording complete. Processing...');
			
			try {
				const openaiService = new OpenAIService(this.plugin.settings.openaiApiKey, this.plugin.errorTracker);
				
				// Step 1: Transcribe audio
				const transcript = await openaiService.transcribeWithChunking(audioBlob);
				
				// Update card with transcript and start summary processing
				processingRecording.transcript = transcript;
				processingRecording.summary = '⏳ Generating AI summary...';
				processingRecording.topic = '⏳ Generating topic...';
				this.refreshRecordingHistory(historyListEl);
				
				// Step 2: Generate summary and topic in parallel
				const [summary, topic] = await Promise.all([
					openaiService.generateSummary(transcript),
					openaiService.generateTopic(transcript)
				]);
				
				// Final update with complete data
				processingRecording.summary = summary;
				processingRecording.topic = topic;
				
				// Save to plugin data
				this.plugin.saveSettings();
				this.refreshRecordingHistory(historyListEl);
				new Notice('Recording processed and saved!');
			} catch (error) {
				// Update card to show error state
				processingRecording.transcript = '❌ Processing failed';
				processingRecording.summary = `❌ Error: ${error.message}`;
				processingRecording.topic = '❌ Failed';
				this.refreshRecordingHistory(historyListEl);
				new Notice('Processing failed: ' + error.message);
			}
		}
	}


	startTimer(timeEl: HTMLElement) {
		// Clear any existing timer first
		this.stopTimer();
		
		this.timeInterval = setInterval(() => {
			this.recordingTime++;
			const minutes = Math.floor(this.recordingTime / 60);
			const seconds = this.recordingTime % 60;
			const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
			timeEl.textContent = display;
		}, 1000);
	}

	stopTimer() {
		if (this.timeInterval) {
			clearInterval(this.timeInterval);
			this.timeInterval = null;
		}
	}


	refreshRecordingHistory(historyListEl: HTMLElement) {
		historyListEl.empty();
		
		if (this.plugin.recordings.length === 0) {
			historyListEl.createEl('p', { 
				text: 'No recordings yet. Start recording to see them here!',
				cls: 'empty-state'
			});
			return;
		}

		this.plugin.recordings.forEach(recording => {
			this.createRecordingCard(historyListEl, recording);
		});
	}

	toggleCardCollapse(recordingId: string) {
		this.collapsedCards[recordingId] = !this.collapsedCards[recordingId];
		// Refresh to update UI
		const historyListEl = this.containerEl.querySelector('.recordings-list') as HTMLElement;
		if (historyListEl) {
			this.refreshRecordingHistory(historyListEl);
		}
	}

	createRecordingCard(container: HTMLElement, recording: RecordingData) {
		// Initialize states if not exists
		if (this.collapsedCards[recording.id] === undefined) {
			this.collapsedCards[recording.id] = false; // Expanded by default
		}
		if (this.activeTab[recording.id] === undefined) {
			this.activeTab[recording.id] = 'summary'; // AI Summary default
		}

		const isCollapsed = this.collapsedCards[recording.id];
		const currentTab = this.activeTab[recording.id];

		// Main card container
		const card = container.createDiv('recording-card group');
		
		// Clickable header
		const header = card.createDiv('card-header');
		header.onclick = () => this.toggleCardCollapse(recording.id);
		
		// Chevron icon
		const chevron = header.createDiv('chevron-icon');
		chevron.innerHTML = isCollapsed ? 
			'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' :
			'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
		
		// Title (topic)
		const title = header.createEl('span', { 
			text: recording.topic || 'Discussion',
			cls: 'card-title'
		});
		
		// Duration badge
		const durationBadge = header.createEl('span', { 
			text: `${Math.floor(recording.duration / 60)}:${(recording.duration % 60).toString().padStart(2, '0')}`,
			cls: 'duration-badge'
		});

		// Collapsible content
		if (!isCollapsed) {
			const content = card.createDiv('card-content');
			
			// Tab navigation
			const tabNav = content.createDiv('tab-navigation');
			const tabContainer = tabNav.createDiv('tab-container');
			
			const summaryTab = tabContainer.createEl('button', {
				cls: `tab-button ${currentTab === 'summary' ? 'active' : ''}`,
			});
			summaryTab.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>AI Summary</span>';
			
			const transcriptTab = tabContainer.createEl('button', {
				cls: `tab-button ${currentTab === 'transcript' ? 'active' : ''}`,
			});
			transcriptTab.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Transcript</span>';

			// Content area with hover-activated copy button
			const contentArea = content.createDiv('content-area group');
			
			const textContent = contentArea.createDiv('text-content');
			const currentContent = currentTab === 'summary' ? recording.summary : recording.transcript;
			
			// Split content into paragraphs for better formatting
			const paragraphs = currentContent.split('\n\n');
			paragraphs.forEach(paragraph => {
				if (paragraph.trim()) {
					textContent.createEl('p', { 
						text: paragraph.trim(),
						cls: 'content-paragraph'
					});
				}
			});

			// Hover-activated copy button
			const copyButton = contentArea.createEl('button', {
				cls: 'copy-button',
				attr: { title: `Copy ${currentTab} to clipboard` }
			});
			copyButton.textContent = '📋';

			// Event handlers
			summaryTab.onclick = (e) => {
				e.stopPropagation();
				this.activeTab[recording.id] = 'summary';
				this.refreshRecordingHistory(container);
			};
			
			transcriptTab.onclick = (e) => {
				e.stopPropagation();
				this.activeTab[recording.id] = 'transcript';
				this.refreshRecordingHistory(container);
			};

			copyButton.onclick = (e) => {
				e.stopPropagation();
				const contentToCopy = currentTab === 'summary' ? recording.summary : recording.transcript;
				navigator.clipboard.writeText(contentToCopy);
				new Notice(`${currentTab === 'summary' ? 'Summary' : 'Transcript'} copied to clipboard`);
			};
		}
	}


	async onClose() {
		if (this.recorder) {
			await this.recorder.stop();
		}
		this.stopTimer();
	}
}

class VoiceRecorder {
	mediaRecorder: MediaRecorder | null = null;
	stream: MediaStream | null = null;
	chunks: Blob[] = [];
	private errorTracker?: ErrorTrackingService;
	
	// Audio compression settings for smaller file sizes
	private readonly AUDIO_SETTINGS = {
		mimeType: 'audio/webm;codecs=opus', // Opus codec for better compression
		audioBitsPerSecond: 32000, // 32 kbps for good quality/size balance
	};
	
	// Chunking settings for long recordings
	private readonly CHUNK_DURATION_MS = 120000; // 2 minutes per chunk
	private isChunking = false;
	private chunkStartTime = 0;

	// Fallback settings if primary format not supported
	private readonly FALLBACK_SETTINGS = [
		{ mimeType: 'audio/mp4;codecs=mp4a.40.2', audioBitsPerSecond: 32000 }, // AAC
		{ mimeType: 'audio/webm', audioBitsPerSecond: 32000 }, // WebM default
		{ mimeType: 'audio/mp4', audioBitsPerSecond: 32000 }, // MP4 default
	];

	constructor(errorTracker?: ErrorTrackingService) {
		this.errorTracker = errorTracker;
	}

	private getBestAudioSettings(): MediaRecorderOptions {
		// Try preferred settings first
		if (MediaRecorder.isTypeSupported(this.AUDIO_SETTINGS.mimeType)) {
			return this.AUDIO_SETTINGS;
		}
		
		// Try fallback options
		for (const settings of this.FALLBACK_SETTINGS) {
			if (MediaRecorder.isTypeSupported(settings.mimeType)) {
				this.errorTracker?.captureMessage('Using fallback audio settings', 'warning', {
					function: 'VoiceRecorder.getBestAudioSettings',
					selectedSettings: settings
				});
				return settings;
			}
		}
		
		// Use browser default if nothing else works
		this.errorTracker?.captureMessage('Using default audio settings (no compression)', 'warning', {
			function: 'VoiceRecorder.getBestAudioSettings',
			reason: 'no_supported_formats'
		});
		
		return {}; // Browser default
	}

	async start(): Promise<void> {
		try {
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				const error = new Error('getUserMedia not supported in this browser');
				this.errorTracker?.captureError(error, {
					function: 'VoiceRecorder.start',
					reason: 'getUserMedia_not_supported',
					userAgent: navigator.userAgent
				});
				throw error;
			}
			
			// Request mono audio at lower sample rate for smaller files
			this.stream = await navigator.mediaDevices.getUserMedia({ 
				audio: {
					channelCount: 1, // Mono audio
					sampleRate: 16000, // 16kHz sample rate (adequate for speech)
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});
			
			// Find the best supported audio format
			const audioSettings = this.getBestAudioSettings();
			this.mediaRecorder = new MediaRecorder(this.stream, audioSettings);
			this.chunks = [];
			
			this.errorTracker?.captureMessage('Recording started with optimized settings', 'info', {
				function: 'VoiceRecorder.start',
				audioSettings: audioSettings
			});

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.chunks.push(event.data);
				}
			};

			this.mediaRecorder.onerror = (event) => {
				const error = new Error(`MediaRecorder error: ${event.type}`);
				this.errorTracker?.captureError(error, {
					function: 'VoiceRecorder.mediaRecorder.onerror',
					eventType: event.type
				});
			};

			// Start recording with chunking for better file size management
			this.mediaRecorder.start(this.CHUNK_DURATION_MS);
			this.chunkStartTime = Date.now();
			
			// Log successful start
			this.errorTracker?.captureMessage('Voice recording started successfully', 'info', {
				function: 'VoiceRecorder.start',
				chunkDurationMs: this.CHUNK_DURATION_MS
			});
			
		} catch (error) {
			let enhancedError: Error;
			let errorContext: Record<string, any> = {
				function: 'VoiceRecorder.start',
				userAgent: navigator.userAgent
			};

			if (error.name === 'NotAllowedError') {
				enhancedError = new Error('Microphone access denied. Please allow microphone permissions.');
				errorContext.reason = 'microphone_access_denied';
			} else if (error.name === 'NotFoundError') {
				enhancedError = new Error('No microphone found. Please connect a microphone.');
				errorContext.reason = 'no_microphone_found';
			} else {
				enhancedError = new Error(`Failed to access microphone: ${error.message}`);
				errorContext.reason = 'microphone_access_failed';
				errorContext.originalError = error.message;
				errorContext.errorName = error.name;
			}

			this.errorTracker?.captureError(enhancedError, errorContext);
			throw enhancedError;
		}
	}

	pause(): void {
		if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
			this.mediaRecorder.pause();
		}
	}

	resume(): void {
		if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
			this.mediaRecorder.resume();
		}
	}

	async stop(): Promise<Blob> {
		return new Promise((resolve) => {
			if (this.mediaRecorder) {
				this.mediaRecorder.onstop = () => {
					const audioBlob = new Blob(this.chunks, { type: 'audio/wav' });
					this.cleanup();
					resolve(audioBlob);
				};
				this.mediaRecorder.stop();
			}
		});
	}

	cleanup(): void {
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
			this.stream = null;
		}
		this.mediaRecorder = null;
		this.chunks = [];
	}
}

class ConfirmDiscardModal extends Modal {
	onConfirm: () => void;

	constructor(app: App, onConfirm: () => void) {
		super(app);
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: '🛑 Discard Recording?' });

		const warningEl = contentEl.createDiv('warning-message');
		warningEl.createEl('p', { 
			text: 'Are you sure you want to stop and discard this recording?'
		});
		warningEl.createEl('p', { 
			text: 'This action cannot be undone and the audio will be lost permanently.',
			cls: 'warning-text'
		});

		const buttonsEl = contentEl.createDiv('modal-buttons');
		
		const cancelBtn = buttonsEl.createEl('button', {
			text: 'Cancel',
			cls: 'modal-button-secondary'
		});
		
		const discardBtn = buttonsEl.createEl('button', {
			text: '🛑 Yes, Discard Recording',
			cls: 'modal-button-danger'
		});

		cancelBtn.onclick = () => this.close();
		discardBtn.onclick = () => {
			this.onConfirm();
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

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