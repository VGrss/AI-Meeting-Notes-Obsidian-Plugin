import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView } from 'obsidian';

interface VoiceNotesSettings {
	openaiApiKey: string;
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
	openaiApiKey: ''
}

const RECORDING_VIEW_TYPE = 'voice-recording-view';

class OpenAIService {
	private apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async transcribeAudio(audioBlob: Blob): Promise<string> {
		if (!this.apiKey) {
			throw new Error('OpenAI API key not configured');
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
			throw new Error(`Transcription failed: ${response.statusText}`);
		}

		const result = await response.json();
		return result.text;
	}

	async generateSummary(transcript: string): Promise<string> {
		if (!this.apiKey) {
			throw new Error('OpenAI API key not configured');
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
			throw new Error(`Summary generation failed: ${response.statusText}`);
		}

		const result = await response.json();
		return result.choices[0].message.content;
	}

	async generateTopic(transcript: string): Promise<string> {
		if (!this.apiKey) {
			throw new Error('OpenAI API key not configured');
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
			throw new Error(`Topic generation failed: ${response.statusText}`);
		}

		const result = await response.json();
		const topic = result.choices[0].message.content.trim();
		// Remove quotes if present
		return topic.replace(/^["']|["']$/g, '');
	}
}


export default class VoiceNotesPlugin extends Plugin {
	settings: VoiceNotesSettings;
	statusBarItem: HTMLElement;
	recordings: RecordingData[] = [];

	async onload() {
		await this.loadSettings();

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
				this.recorder = new VoiceRecorder();
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
			const openaiService = new OpenAIService(this.plugin.settings.openaiApiKey);
			const transcript = await openaiService.transcribeAudio(audioBlob);
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
		const openaiService = new OpenAIService(this.plugin.settings.openaiApiKey);
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
				this.recorder = new VoiceRecorder();
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
			// Stop recording (discard)
			await this.discardRecording(startBtn, pauseBtn, completeBtn, timeEl);
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
				const openaiService = new OpenAIService(this.plugin.settings.openaiApiKey);
				
				// Step 1: Transcribe audio
				const transcript = await openaiService.transcribeAudio(audioBlob);
				
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
			copyButton.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M16 4H18A2 2 0 0 1 20 6V18A2 2 0 0 1 18 20H6A2 2 0 0 1 4 18V6A2 2 0 0 1 6 4H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" stroke-width="2" fill="none"/></svg>';

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

	async start(): Promise<void> {
		try {
			
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				throw new Error('getUserMedia not supported in this browser');
			}
			
			this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			
			this.mediaRecorder = new MediaRecorder(this.stream);
			this.chunks = [];

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.chunks.push(event.data);
				}
			};

			this.mediaRecorder.start();
		} catch (error) {
			if (error.name === 'NotAllowedError') {
				throw new Error('Microphone access denied. Please allow microphone permissions.');
			} else if (error.name === 'NotFoundError') {
				throw new Error('No microphone found. Please connect a microphone.');
			} else {
				throw new Error(`Failed to access microphone: ${error.message}`);
			}
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
	}
}