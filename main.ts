import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView } from 'obsidian';

interface VoiceNotesSettings {
	openaiApiKey: string;
}

const DEFAULT_SETTINGS: VoiceNotesSettings = {
	openaiApiKey: ''
}

const RECORDING_VIEW_TYPE = 'voice-recording-view';

export default class VoiceNotesPlugin extends Plugin {
	settings: VoiceNotesSettings;
	recorder: VoiceRecorder | null = null;
	statusBarItem: HTMLElement;

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
		if (this.recorder) {
			this.recorder.stop();
		}
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
			text: 'Start Recording',
			cls: 'start-btn'
		});

		const pauseBtn = controlsEl.createEl('button', {
			text: 'Pause',
			cls: 'pause-btn',
			attr: { disabled: 'true' }
		});

		const stopBtn = controlsEl.createEl('button', {
			text: 'Stop',
			cls: 'stop-btn',
			attr: { disabled: 'true' }
		});

		startBtn.onclick = () => this.startRecording(startBtn, pauseBtn, stopBtn, timeEl);
		pauseBtn.onclick = () => this.pauseRecording(pauseBtn);
		stopBtn.onclick = () => this.stopRecording(startBtn, pauseBtn, stopBtn);
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
		} else if (this.isPaused && this.recorder) {
			this.recorder.resume();
			this.isPaused = false;
			pauseBtn.textContent = 'Pause';
			this.startTimer(timeEl);
			new Notice('Recording resumed');
		}
	}

	pauseRecording(pauseBtn: HTMLButtonElement) {
		if (this.recorder && !this.isPaused) {
			this.recorder.pause();
			this.isPaused = true;
			pauseBtn.textContent = 'Resume';
			this.stopTimer();
			new Notice('Recording paused');
		}
	}

	async stopRecording(startBtn: HTMLButtonElement, pauseBtn: HTMLButtonElement, stopBtn: HTMLButtonElement) {
		if (this.recorder) {
			const audioBlob = await this.recorder.stop();
			this.isRecording = false;
			this.isPaused = false;
			
			startBtn.disabled = false;
			pauseBtn.disabled = true;
			stopBtn.disabled = true;
			startBtn.textContent = 'Start Recording';
			pauseBtn.textContent = 'Pause';
			
			this.stopTimer();
			this.recordingTime = 0;
			
			new Notice('Recording stopped. Processing...');
			this.close();
			
			await this.processRecording(audioBlob);
		}
	}

	startTimer(timeEl: HTMLElement) {
		this.timeInterval = setInterval(() => {
			this.recordingTime++;
			const minutes = Math.floor(this.recordingTime / 60);
			const seconds = this.recordingTime % 60;
			timeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
			const transcript = await this.transcribeAudio(audioBlob);
			new TranscriptModal(this.app, this.plugin, transcript).open();
		} catch (error) {
			new Notice('Transcription failed: ' + error.message);
		}
	}

	async transcribeAudio(audioBlob: Blob): Promise<string> {
		const { openaiApiKey } = this.plugin.settings;
		
		if (!openaiApiKey) {
			throw new Error('OpenAI API key not configured');
		}

		const formData = new FormData();
		formData.append('file', audioBlob, 'recording.wav');
		formData.append('model', 'whisper-1');

		const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${openaiApiKey}`,
			},
			body: formData
		});

		const result = await response.json();
		return result.text;
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
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.plugin.settings.openaiApiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'gpt-3.5-turbo',
				messages: [{
					role: 'user',
					content: `Please summarize the following meeting transcript into key points and action items:\n\n${this.transcript}`
				}],
				max_tokens: 500,
				temperature: 0.3
			})
		});

		const result = await response.json();
		return result.choices[0].message.content;
	}

	insertIntoNote() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		
		if (activeView) {
			const editor = activeView.editor;
			const content = this.formatContent();
			editor.replaceSelection(content);
			new Notice('Transcript inserted into current note');
			this.close();
		} else {
			// Create new note
			this.app.workspace.openLinkText('Voice Meeting Notes - ' + new Date().toLocaleString(), '', true)
				.then(() => {
					setTimeout(() => {
						const newActiveView = this.app.workspace.getActiveViewOfType(MarkdownView);
						if (newActiveView) {
							const editor = newActiveView.editor;
							editor.setValue(this.formatContent());
							new Notice('New note created with transcript');
							this.close();
						}
					}, 100);
				});
		}
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
	transcript = '';
	summary = '';

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
		
		const headerEl = container.createDiv('panel-header');
		headerEl.createEl('h4', { text: 'AI Voice Recording' });
		
		const closeBtn = headerEl.createEl('button', {
			text: '×',
			cls: 'close-panel-btn'
		});
		closeBtn.onclick = () => this.leaf.detach();

		const statusEl = container.createDiv('recording-status');
		const timeEl = statusEl.createEl('div', { 
			text: '00:00', 
			cls: 'recording-time' 
		});

		const controlsEl = container.createDiv('recording-controls');
		
		const startBtn = controlsEl.createEl('button', {
			text: 'Start Recording',
			cls: 'start-btn'
		});

		const pauseBtn = controlsEl.createEl('button', {
			text: 'Pause',
			cls: 'pause-btn',
			attr: { disabled: 'true' }
		});

		const stopBtn = controlsEl.createEl('button', {
			text: 'Stop',
			cls: 'stop-btn',
			attr: { disabled: 'true' }
		});

		const transcriptContainer = container.createDiv('transcript-container');
		transcriptContainer.createEl('h4', { text: 'Live Transcript' });
		const transcriptEl = transcriptContainer.createEl('textarea', {
			attr: { 
				readonly: 'true',
				rows: '8',
				placeholder: 'Transcript will appear here after recording...'
			},
			cls: 'transcript-display'
		});

		const summaryContainer = container.createDiv('summary-container');
		summaryContainer.createEl('h4', { text: 'AI Summary' });
		const summaryEl = summaryContainer.createEl('textarea', {
			attr: { 
				readonly: 'true',
				rows: '6',
				placeholder: 'AI summary will appear here...'
			},
			cls: 'summary-display'
		});

		const actionsEl = container.createDiv('actions');
		
		const summaryBtn = actionsEl.createEl('button', { 
			text: 'Generate Summary',
			attr: { disabled: 'true' }
		});

		const insertBtn = actionsEl.createEl('button', { 
			text: 'Insert into Note',
			attr: { disabled: 'true' }
		});

		const copyBtn = actionsEl.createEl('button', { 
			text: 'Copy to Clipboard',
			attr: { disabled: 'true' }
		});

		startBtn.onclick = () => this.startRecording(startBtn, pauseBtn, stopBtn, timeEl, transcriptEl, summaryEl, summaryBtn, insertBtn, copyBtn);
		pauseBtn.onclick = () => this.pauseRecording(pauseBtn);
		stopBtn.onclick = () => this.stopRecording(startBtn, pauseBtn, stopBtn, transcriptEl, summaryEl, summaryBtn, insertBtn, copyBtn);
		
		summaryBtn.onclick = () => this.generateSummary(summaryEl, summaryBtn);
		insertBtn.onclick = () => this.insertIntoNote();
		copyBtn.onclick = () => this.copyToClipboard();
	}

	async startRecording(startBtn: HTMLButtonElement, pauseBtn: HTMLButtonElement, stopBtn: HTMLButtonElement, timeEl: HTMLElement, transcriptEl: HTMLTextAreaElement, summaryEl: HTMLTextAreaElement, summaryBtn: HTMLButtonElement, insertBtn: HTMLButtonElement, copyBtn: HTMLButtonElement) {
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
		} else if (this.isPaused && this.recorder) {
			this.recorder.resume();
			this.isPaused = false;
			pauseBtn.textContent = 'Pause';
			this.startTimer(timeEl);
			new Notice('Recording resumed');
		}
	}

	pauseRecording(pauseBtn: HTMLButtonElement) {
		if (this.recorder && !this.isPaused) {
			this.recorder.pause();
			this.isPaused = true;
			pauseBtn.textContent = 'Resume';
			this.stopTimer();
			new Notice('Recording paused');
		}
	}

	async stopRecording(startBtn: HTMLButtonElement, pauseBtn: HTMLButtonElement, stopBtn: HTMLButtonElement, transcriptEl: HTMLTextAreaElement, summaryEl: HTMLTextAreaElement, summaryBtn: HTMLButtonElement, insertBtn: HTMLButtonElement, copyBtn: HTMLButtonElement) {
		if (this.recorder) {
			const audioBlob = await this.recorder.stop();
			this.isRecording = false;
			this.isPaused = false;
			
			startBtn.disabled = false;
			pauseBtn.disabled = true;
			stopBtn.disabled = true;
			startBtn.textContent = 'Start Recording';
			pauseBtn.textContent = 'Pause';
			
			this.stopTimer();
			this.recordingTime = 0;
			
			new Notice('Recording stopped. Processing...');
			
			try {
				this.transcript = await this.transcribeAudio(audioBlob);
				transcriptEl.value = this.transcript;
				summaryBtn.disabled = false;
				insertBtn.disabled = false;
				copyBtn.disabled = false;
				new Notice('Transcript ready!');
			} catch (error) {
				new Notice('Transcription failed: ' + error.message);
			}
		}
	}

	startTimer(timeEl: HTMLElement) {
		this.timeInterval = setInterval(() => {
			this.recordingTime++;
			const minutes = Math.floor(this.recordingTime / 60);
			const seconds = this.recordingTime % 60;
			timeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}, 1000);
	}

	stopTimer() {
		if (this.timeInterval) {
			clearInterval(this.timeInterval);
			this.timeInterval = null;
		}
	}

	async transcribeAudio(audioBlob: Blob): Promise<string> {
		const { openaiApiKey } = this.plugin.settings;
		
		if (!openaiApiKey) {
			throw new Error('OpenAI API key not configured');
		}

		const formData = new FormData();
		formData.append('file', audioBlob, 'recording.wav');
		formData.append('model', 'whisper-1');

		const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${openaiApiKey}`,
			},
			body: formData
		});

		const result = await response.json();
		return result.text;
	}


	async generateSummary(summaryEl: HTMLTextAreaElement, summaryBtn: HTMLButtonElement) {
		if (!this.plugin.settings.openaiApiKey) {
			new Notice('OpenAI API key not configured');
			return;
		}

		summaryBtn.disabled = true;
		summaryBtn.textContent = 'Generating...';

		try {
			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.plugin.settings.openaiApiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'gpt-3.5-turbo',
					messages: [{
						role: 'user',
						content: `Please summarize the following meeting transcript into key points and action items:\n\n${this.transcript}`
					}],
					max_tokens: 500,
					temperature: 0.3
				})
			});

			const result = await response.json();
			this.summary = result.choices[0].message.content;
			summaryEl.value = this.summary;
			new Notice('Summary generated!');
		} catch (error) {
			new Notice('Failed to generate summary: ' + error.message);
		}

		summaryBtn.disabled = false;
		summaryBtn.textContent = 'Generate Summary';
	}

	insertIntoNote() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		
		if (activeView) {
			const editor = activeView.editor;
			const content = this.formatContent();
			editor.replaceSelection(content);
			new Notice('Transcript inserted into current note');
		} else {
			this.app.workspace.openLinkText('Voice Meeting Notes - ' + new Date().toLocaleString(), '', true)
				.then(() => {
					setTimeout(() => {
						const newActiveView = this.app.workspace.getActiveViewOfType(MarkdownView);
						if (newActiveView) {
							const editor = newActiveView.editor;
							editor.setValue(this.formatContent());
							new Notice('New note created with transcript');
						}
					}, 100);
				});
		}
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
			throw new Error('Failed to access microphone');
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

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('API key for OpenAI (used for transcription and summary generation)')
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
	}
}