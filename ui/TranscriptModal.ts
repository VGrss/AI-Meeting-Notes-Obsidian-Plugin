import { App, Modal, Notice, MarkdownView } from 'obsidian';
import { SummarizerProvider } from '../src/providers';

/**
 * Modal d'affichage et gestion des résultats de transcription
 */
export class TranscriptModal extends Modal {
	summarizer: SummarizerProvider;
	transcript: string;
	summary: string = '';

	constructor(app: App, summarizer: SummarizerProvider, transcript: string) {
		super(app);
		this.summarizer = summarizer;
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
		};

		const insertBtn = actionsEl.createEl('button', { text: 'Insert into Note' });
		insertBtn.onclick = () => this.insertIntoNote();

		const copyBtn = actionsEl.createEl('button', { text: 'Copy to Clipboard' });
		copyBtn.onclick = () => this.copyToClipboard();
	}

	async generateSummary(): Promise<string> {
		const result = await this.summarizer.summarize(this.transcript);
		return result.summary;
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
