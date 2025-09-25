import { App, Modal, Notice } from 'obsidian';
import { VoiceRecorder } from '../audio/VoiceRecorder';
import { ErrorTrackingService } from '../services/ErrorTrackingService';
import { TranscriptModal } from './TranscriptModal';
import { getTranscriberProvider, getSummarizerProvider } from '../src/providers';

/**
 * Modal d'enregistrement vocal avec interface utilisateur
 */
export class RecordingModal extends Modal {
	recorder: VoiceRecorder | null = null;
	isRecording = false;
	isPaused = false;
	recordingTime = 0;
	timeInterval: NodeJS.Timeout | null = null;
	
	// Services
	private errorTracker: ErrorTrackingService;
	private transcriberProviderId: string;
	private summarizerProviderId: string;

	constructor(
		app: App, 
		transcriberProviderId: string,
		summarizerProviderId: string,
		errorTracker: ErrorTrackingService
	) {
		super(app);
		this.transcriberProviderId = transcriberProviderId;
		this.summarizerProviderId = summarizerProviderId;
		this.errorTracker = errorTracker;
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
				this.recorder = new VoiceRecorder(this.errorTracker);
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
			const transcriber = getTranscriberProvider(this.transcriberProviderId);
			const summarizer = getSummarizerProvider(this.summarizerProviderId);
			
			// Pour l'instant, on assume que audioBlob est un Blob
			// Dans un vrai cas d'usage, il faudrait sauvegarder le blob et passer le chemin
			const transcript = await transcriber.transcribe(audioBlob as any);
			new TranscriptModal(this.app, summarizer, transcript.text).open();
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
