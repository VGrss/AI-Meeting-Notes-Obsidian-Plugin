import { App, Notice, WorkspaceLeaf, ItemView, Modal } from 'obsidian';
import { VoiceRecorder } from '../audio/VoiceRecorder';
import { getTranscriberProvider, getSummarizerProvider } from '../src/providers';

/**
 * Interface pour les données d'enregistrement
 */
export interface RecordingData {
	id: string;
	timestamp: Date;
	duration: number;
	transcript: string;
	summary: string;
	topic: string;
}

/**
 * Vue d'enregistrement principal avec panneau latéral
 */
export class RecordingView extends ItemView {
	recorder: VoiceRecorder | null = null;
	isRecording = false;
	isPaused = false;
	recordingTime = 0;
	timeInterval: NodeJS.Timeout | null = null;
	collapsedCards: { [key: string]: boolean } = {};
	activeTab: { [key: string]: 'summary' | 'transcript' } = {};
	
	// Services
	private transcriberProviderId: string;
	private summarizerProviderId: string;
	
	// Callbacks
	private onAddRecording: (recording: RecordingData) => void;
	private onSaveSettings: () => Promise<void>;
	private recordings: RecordingData[];

	constructor(
		leaf: WorkspaceLeaf, 
		transcriberProviderId: string,
		summarizerProviderId: string,
		recordings: RecordingData[],
		onAddRecording: (recording: RecordingData) => void,
		onSaveSettings: () => Promise<void>
	) {
		super(leaf);
		this.transcriberProviderId = transcriberProviderId;
		this.summarizerProviderId = summarizerProviderId;
		this.recordings = recordings;
		this.onAddRecording = onAddRecording;
		this.onSaveSettings = onSaveSettings;
	}

	getViewType(): string {
		return 'voice-recording-view';
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
		// Create close SVG icon using DOM API
		const closeSvg = closeBtn.createSvg('svg', {
			attr: {
				width: '16',
				height: '16',
				viewBox: '0 0 24 24',
				fill: 'none'
			}
		});
		closeSvg.createSvg('path', {
			attr: {
				d: 'M18 6L6 18M6 6L18 18',
				stroke: 'currentColor',
				'stroke-width': '2',
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round'
			}
		});

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
			cls: 'primary-button start-recording-button',
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
				startBtn.classList.add('recording-active');
				pauseBtn.disabled = false;
				completeBtn.disabled = false;

				this.startTimer(timeEl);
				new Notice('Recording started');
			} catch (error) {
				new Notice('Failed to start recording: ' + error.message);
			}
		} else {
			// Show confirmation modal before discarding
			new ConfirmDiscardModal(this.app, async () => {
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
			startBtn.classList.remove('recording-active');
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
			startBtn.classList.remove('recording-active');
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
			this.onAddRecording(processingRecording);
			this.refreshRecordingHistory(historyListEl);
			
			new Notice('Recording complete. Processing...');
			
			try {
				const transcriber = getTranscriberProvider(this.transcriberProviderId);
				const summarizer = getSummarizerProvider(this.summarizerProviderId);
				
				// Step 1: Transcribe audio
				const transcriptResult = await transcriber.transcribe(audioBlob as any);
				
				// Update card with transcript and start summary processing
				processingRecording.transcript = transcriptResult.text;
				processingRecording.summary = '⏳ Generating AI summary...';
				processingRecording.topic = '⏳ Generating topic...';
				this.refreshRecordingHistory(historyListEl);
				
				// Step 2: Generate summary and topic in parallel
				const [summaryResult, topicResult] = await Promise.all([
					summarizer.summarize(transcriptResult.text),
					summarizer.summarize(transcriptResult.text, { 
						style: 'brief',
						maxLength: 50 
					})
				]);
				
				// Final update with complete data
				processingRecording.summary = summaryResult.summary;
				processingRecording.topic = topicResult.summary;
				
				// Save to plugin data
				await this.onSaveSettings();
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
		
		if (this.recordings.length === 0) {
			historyListEl.createEl('p', { 
				text: 'No recordings yet. Start recording to see them here!',
				cls: 'empty-state'
			});
			return;
		}

		this.recordings.forEach(recording => {
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
		
		// Chevron icon using DOM API
		const chevron = header.createDiv('chevron-icon');
		const chevronSvg = chevron.createSvg('svg', {
			attr: {
				width: '12',
				height: '12',
				viewBox: '0 0 12 12',
				fill: 'none'
			}
		});
		
		// Create different path based on collapsed state
		const pathData = isCollapsed ? 
			'M4.5 3L7.5 6L4.5 9' : 
			'M3 4.5L6 7.5L9 4.5';
		
		chevronSvg.createSvg('path', {
			attr: {
				d: pathData,
				stroke: 'currentColor',
				'stroke-width': '1.5',
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round'
			}
		});
		
		// Title (topic)
		const title = header.createEl('span', { 
			text: recording.topic || 'Discussion',
			cls: `card-title ${recording.topic?.includes('⏳') ? 'processing' : ''} ${recording.topic?.includes('❌') ? 'error' : ''}`
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
			
			// Create summary tab icon using DOM API
			const summarySvg = summaryTab.createSvg('svg', {
				attr: {
					width: '10',
					height: '10',
					viewBox: '0 0 24 24',
					fill: 'none'
				}
			});
			summarySvg.createSvg('path', {
				attr: {
					d: 'M12 2L2 7L12 12L22 7L12 2Z',
					stroke: 'currentColor',
					'stroke-width': '2',
					'stroke-linecap': 'round',
					'stroke-linejoin': 'round'
				}
			});
			summarySvg.createSvg('path', {
				attr: {
					d: 'M2 17L12 22L22 17',
					stroke: 'currentColor',
					'stroke-width': '2',
					'stroke-linecap': 'round',
					'stroke-linejoin': 'round'
				}
			});
			summarySvg.createSvg('path', {
				attr: {
					d: 'M2 12L12 17L22 12',
					stroke: 'currentColor',
					'stroke-width': '2',
					'stroke-linecap': 'round',
					'stroke-linejoin': 'round'
				}
			});
			summaryTab.createEl('span', { text: 'AI Summary' });
			
			const transcriptTab = tabContainer.createEl('button', {
				cls: `tab-button ${currentTab === 'transcript' ? 'active' : ''}`,
			});
			
			// Create transcript tab icon using DOM API
			const transcriptSvg = transcriptTab.createSvg('svg', {
				attr: {
					width: '10',
					height: '10',
					viewBox: '0 0 24 24',
					fill: 'none'
				}
			});
			transcriptSvg.createSvg('path', {
				attr: {
					d: 'M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2Z',
					stroke: 'currentColor',
					'stroke-width': '2',
					'stroke-linecap': 'round',
					'stroke-linejoin': 'round'
				}
			});
			transcriptSvg.createSvg('path', {
				attr: {
					d: 'M14 2V8H20',
					stroke: 'currentColor',
					'stroke-width': '2',
					'stroke-linecap': 'round',
					'stroke-linejoin': 'round'
				}
			});
			transcriptTab.createEl('span', { text: 'Transcript' });

			// Content area with hover-activated copy button
			const contentArea = content.createDiv('content-area group');
			
			const textContent = contentArea.createDiv('text-content');
			const currentContent = currentTab === 'summary' ? recording.summary : recording.transcript;
			
			// Split content into paragraphs for better formatting
			const paragraphs = currentContent.split('\n\n');
			paragraphs.forEach(paragraph => {
				if (paragraph.trim()) {
					const isProcessing = paragraph.includes('⏳');
					const isError = paragraph.includes('❌');
					textContent.createEl('p', { 
						text: paragraph.trim(),
						cls: `content-paragraph ${isProcessing ? 'processing' : ''} ${isError ? 'error' : ''}`
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

/**
 * Modal de confirmation pour abandonner un enregistrement
 */
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
