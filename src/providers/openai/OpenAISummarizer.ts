/**
 * Provider de résumé OpenAI GPT-4o
 * Adapté du code existant dans OpenAIService
 */

import {
  SummarizerProvider,
  ProviderHealth,
  SummarizationOptions,
  SummarizationResult,
} from '../types';
import { ProviderError, ProviderErrorCode } from '../errors';

export class OpenAISummarizer implements SummarizerProvider {
  id = 'openai-gpt4o';
  name = 'OpenAI GPT-4o';
  type = 'cloud' as const;

  private apiKey: string;
  private customSummaryPrompt: string;

  constructor(apiKey: string, customSummaryPrompt: string) {
    this.apiKey = apiKey;
    this.customSummaryPrompt = customSummaryPrompt;
  }

  async check(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        ok: false,
        details: 'Clé API OpenAI manquante',
      };
    }

    try {
      // Test de connexion simple en listant les modèles
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            ok: false,
            details: 'Clé API OpenAI invalide',
          };
        }
        return {
          ok: false,
          details: `Erreur de connexion: ${response.status} ${response.statusText}`,
        };
      }

      return {
        ok: true,
        details: 'OpenAI GPT-4o disponible',
        capabilities: ['summarization', 'multi-language', 'custom-prompts'],
      };
    } catch (error) {
      return {
        ok: false,
        details: `Erreur de connexion: ${error.message}`,
      };
    }
  }

  async summarize(text: string, opts?: SummarizationOptions): Promise<SummarizationResult> {
    try {
      if (!this.apiKey) {
        throw ProviderError.authInvalid(this.id, 'Clé API OpenAI requise');
      }

      // Handle very long transcripts by intelligent truncation
      let processedText = text;
      const maxTokensForContext = 12000; // GPT-4o has ~128k context, be conservative
      const avgCharsPerToken = 4; // Rough estimate
      const maxCharsForContext = maxTokensForContext * avgCharsPerToken;
      
      if (text.length > maxCharsForContext) {
        // For very long transcripts, take a balanced sample
        const firstPart = text.substring(0, maxCharsForContext * 0.4);
        const lastPart = text.substring(text.length - maxCharsForContext * 0.4);
        const middlePart = text.substring(
          Math.floor(text.length * 0.4), 
          Math.floor(text.length * 0.6)
        ).substring(0, maxCharsForContext * 0.2);
        
        processedText = `${firstPart}\n\n[...MIDDLE SECTION SUMMARY...]\n${middlePart}\n\n[...CONTINUED...]\n${lastPart}`;
        
        console.warn('Long transcript truncated for summary:', {
          function: 'OpenAISummarizer.summarize',
          originalLength: text.length,
          processedLength: processedText.length,
          truncationRatio: (processedText.length / text.length).toFixed(2)
        });
      }

      // Utiliser le prompt personnalisé ou celui par défaut
      const prompt = opts?.customPrompt || this.customSummaryPrompt;

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
            content: `${prompt}

**Transcript:**
${processedText}`
          }],
          max_tokens: opts?.maxLength || 2000,
          temperature: opts?.style === 'detailed' ? 0.3 : 0.1
        })
      });

      if (!response.ok) {
        throw new ProviderError(
          ProviderErrorCode.PROCESSING_FAILED,
          `Summary generation failed: ${response.statusText}`,
          {
            providerId: this.id,
            metadata: {
              httpStatus: response.status,
              responseText: response.statusText,
              textLength: text.length
            }
          }
        );
      }

      const result = await response.json();
      const summary = result.choices[0].message.content;
      
      // Log successful summary generation
      console.log('AI summary generated successfully:', {
        function: 'OpenAISummarizer.summarize',
        originalTextLength: text.length,
        processedTextLength: processedText.length,
        summaryLength: summary?.length || 0,
        wasTruncated: text.length !== processedText.length
      });
      
      return {
        summary,
        tokens: result.usage?.total_tokens,
        metadata: {
          originalLength: text.length,
          compressionRatio: summary.length / text.length,
          model: 'gpt-4o',
          processingTime: Date.now(), // Approximation
        }
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      
      console.error('Unexpected error in summarization:', {
        function: 'OpenAISummarizer.summarize',
        textLength: text.length,
        errorType: 'unexpected',
        error: error
      });
      
      throw ProviderError.processingFailed(
        'Résumé OpenAI',
        this.id,
        error as Error
      );
    }
  }
}

