import { Injectable, signal, computed } from '@angular/core';
import Dexie from 'dexie';

export type LLMProvider = 'openai' | 'anthropic' | 'none';

export interface AppSettings {
  id: string;
  llmProvider: LLMProvider;
  apiKey: string;
  /** Model override – empty = use default */
  model: string;
  language: 'de' | 'en';
  /** Show full German stat labels instead of abbreviations */
  verboseStats: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: 'main',
  llmProvider: 'none',
  apiKey: '',
  model: '',
  language: 'de',
  verboseStats: false,
};

class SettingsDB extends Dexie {
  settings!: Dexie.Table<AppSettings, string>;

  constructor() {
    super('warmama40k_settings');
    this.version(1).stores({
      settings: 'id',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private db = new SettingsDB();

  readonly settings = signal<AppSettings>(DEFAULT_SETTINGS);

  readonly hasApiKey = computed(() => {
    const s = this.settings();
    return s.llmProvider !== 'none' && s.apiKey.length > 0;
  });

  readonly provider = computed(() => this.settings().llmProvider);
  readonly verboseStats = computed(() => this.settings().verboseStats);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const stored = await this.db.settings.get('main');
      if (stored) {
        this.settings.set(stored);
      }
    } catch {
      // First load or DB error – use defaults
    }
  }

  async save(updates: Partial<AppSettings>): Promise<void> {
    const current = this.settings();
    const updated = { ...current, ...updates, id: 'main' };
    await this.db.settings.put(updated);
    this.settings.set(updated);
  }

  async clearApiKey(): Promise<void> {
    await this.save({ apiKey: '', llmProvider: 'none', model: '' });
  }

  getDefaultModel(): string {
    const s = this.settings();
    if (s.model) return s.model;
    switch (s.llmProvider) {
      case 'openai': return 'gpt-4o-mini';
      case 'anthropic': return 'claude-sonnet-4-20250514';
      default: return '';
    }
  }
}
