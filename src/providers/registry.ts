/**
 * Registry centralisé pour la gestion des providers
 * Permet l'enregistrement et la récupération des providers par type
 */

import {
  Provider,
  TranscriberProvider,
  SummarizerProvider,
  ProviderType,
} from './types';
import {
  ProviderError,
  ProviderErrorCode,
} from './errors';

/**
 * Registry in-memory pour les providers
 */
class ProviderRegistry {
  private transcriberProviders = new Map<string, TranscriberProvider>();
  private summarizerProviders = new Map<string, SummarizerProvider>();

  /**
   * Enregistre un provider dans le registry
   */
  registerProvider(provider: Provider): void {
    const { id } = provider;

    // Vérifie que l'ID n'est pas déjà utilisé
    if (this.isProviderRegistered(id)) {
      throw ProviderError.providerNotFound(
        id,
        'Un provider avec cet ID est déjà enregistré'
      );
    }

    // Enregistre selon le type
    if (this.isTranscriberProvider(provider)) {
      this.transcriberProviders.set(id, provider);
    } else if (this.isSummarizerProvider(provider)) {
      this.summarizerProviders.set(id, provider);
    } else {
      throw new ProviderError(
        ProviderErrorCode.INVALID_PROVIDER_TYPE,
        `Type de provider non supporté pour ${id}`,
        { providerId: id }
      );
    }
  }

  /**
   * Récupère un provider de transcription par ID
   */
  getTranscriberProvider(id: string): TranscriberProvider {
    const provider = this.transcriberProviders.get(id);
    if (!provider) {
      throw ProviderError.providerNotFound(id, 'transcriber');
    }
    return provider;
  }

  /**
   * Récupère un provider de résumé par ID
   */
  getSummarizerProvider(id: string): SummarizerProvider {
    const provider = this.summarizerProviders.get(id);
    if (!provider) {
      throw ProviderError.providerNotFound(id, 'summarizer');
    }
    return provider;
  }

  /**
   * Récupère tous les providers d'un type donné
   */
  getAllProviders(type: ProviderType): Provider[] {
    switch (type) {
      case 'transcriber':
        return Array.from(this.transcriberProviders.values());
      case 'summarizer':
        return Array.from(this.summarizerProviders.values());
      default:
        throw new ProviderError(
          ProviderErrorCode.INVALID_PROVIDER_TYPE,
          `Type de provider non supporté: ${type}`
        );
    }
  }

  /**
   * Récupère tous les providers enregistrés
   */
  getAllProvidersList(): { type: ProviderType; providers: Provider[] }[] {
    return [
      { type: 'transcriber', providers: Array.from(this.transcriberProviders.values()) },
      { type: 'summarizer', providers: Array.from(this.summarizerProviders.values()) },
    ];
  }

  /**
   * Vérifie si un provider est enregistré
   */
  isProviderRegistered(id: string): boolean {
    return (
      this.transcriberProviders.has(id) ||
      this.summarizerProviders.has(id)
    );
  }

  /**
   * Supprime un provider du registry
   */
  unregisterProvider(id: string): boolean {
    let removed = false;
    
    if (this.transcriberProviders.delete(id)) removed = true;
    if (this.summarizerProviders.delete(id)) removed = true;
    
    return removed;
  }

  /**
   * Vide tous les providers du registry
   */
  clear(): void {
    this.transcriberProviders.clear();
    this.summarizerProviders.clear();
  }

  /**
   * Récupère le nombre de providers enregistrés par type
   */
  getProviderCount(): Record<ProviderType, number> {
    return {
      transcriber: this.transcriberProviders.size,
      summarizer: this.summarizerProviders.size,
    };
  }

  /**
   * Récupère la liste des IDs de providers par type
   */
  getProviderIds(type: ProviderType): string[] {
    switch (type) {
      case 'transcriber':
        return Array.from(this.transcriberProviders.keys());
      case 'summarizer':
        return Array.from(this.summarizerProviders.keys());
      default:
        throw new ProviderError(
          ProviderErrorCode.INVALID_PROVIDER_TYPE,
          `Type de provider non supporté: ${type}`
        );
    }
  }

  /**
   * Vérifie si un provider est de type TranscriberProvider
   */
  private isTranscriberProvider(provider: Provider): provider is TranscriberProvider {
    return 'transcribe' in provider && typeof provider.transcribe === 'function';
  }

  /**
   * Vérifie si un provider est de type SummarizerProvider
   */
  private isSummarizerProvider(provider: Provider): provider is SummarizerProvider {
    return 'summarize' in provider && typeof provider.summarize === 'function';
  }
}

// Instance singleton du registry
const providerRegistry = new ProviderRegistry();

/**
 * Enregistre un provider dans le registry global
 */
export function registerProvider(provider: Provider): void {
  providerRegistry.registerProvider(provider);
}

/**
 * Récupère un provider de transcription par ID
 */
export function getTranscriberProvider(id: string): TranscriberProvider {
  return providerRegistry.getTranscriberProvider(id);
}

/**
 * Récupère un provider de résumé par ID
 */
export function getSummarizerProvider(id: string): SummarizerProvider {
  return providerRegistry.getSummarizerProvider(id);
}

/**
 * Récupère tous les providers d'un type donné
 */
export function getAllProviders(type: ProviderType): Provider[] {
  return providerRegistry.getAllProviders(type);
}

/**
 * Récupère tous les providers enregistrés
 */
export function getAllProvidersList(): { type: ProviderType; providers: Provider[] }[] {
  return providerRegistry.getAllProvidersList();
}

/**
 * Vérifie si un provider est enregistré
 */
export function isProviderRegistered(id: string): boolean {
  return providerRegistry.isProviderRegistered(id);
}

/**
 * Supprime un provider du registry
 */
export function unregisterProvider(id: string): boolean {
  return providerRegistry.unregisterProvider(id);
}

/**
 * Vide tous les providers du registry
 */
export function clearRegistry(): void {
  providerRegistry.clear();
}

/**
 * Récupère le nombre de providers enregistrés par type
 */
export function getProviderCount(): Record<ProviderType, number> {
  return providerRegistry.getProviderCount();
}

/**
 * Récupère la liste des IDs de providers par type
 */
export function getProviderIds(type: ProviderType): string[] {
  return providerRegistry.getProviderIds(type);
}

/**
 * Factory pour créer et configurer des providers
 */
export class ProviderFactory {
  /**
   * Crée et enregistre un provider de transcription
   */
  static createTranscriberProvider(
    id: string,
    name: string,
    type: 'cloud' | 'local',
    implementation: Omit<TranscriberProvider, 'id' | 'name' | 'type'>
  ): TranscriberProvider {
    const provider: TranscriberProvider = {
      id,
      name,
      type,
      ...implementation,
    };
    
    registerProvider(provider);
    return provider;
  }

  /**
   * Crée et enregistre un provider de résumé
   */
  static createSummarizerProvider(
    id: string,
    name: string,
    type: 'cloud' | 'local',
    implementation: Omit<SummarizerProvider, 'id' | 'name' | 'type'>
  ): SummarizerProvider {
    const provider: SummarizerProvider = {
      id,
      name,
      type,
      ...implementation,
    };
    
    registerProvider(provider);
    return provider;
  }
}

// Export de l'instance du registry pour les tests
export { providerRegistry };