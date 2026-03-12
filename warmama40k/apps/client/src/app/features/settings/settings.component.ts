import { Component, signal, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { SettingsService, LLMProvider } from '../../core/services/settings.service';
import { LLMService } from '../../core/services/llm.service';

@Component({
  selector: 'app-settings',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatSnackBarModule,
    FormsModule,
  ],
  template: `
    <div class="settings-container">
      <h1 class="page-title">
        <mat-icon>settings</mat-icon>
        Einstellungen
      </h1>

      <!-- LLM Provider Section -->
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>smart_toy</mat-icon>
          <mat-card-title>KI-Assistent</mat-card-title>
          <mat-card-subtitle>Taktik-Tipps und Missions-Generator</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="info-text">
            Optional: Verbinde einen KI-Dienst fuer personalisierte Taktik-Tipps
            waehrend des Spiels. Ohne API-Key gibt es trotzdem hilfreiche Standard-Tipps!
          </p>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>KI-Anbieter</mat-label>
            <mat-select
              [value]="selectedProvider()"
              (selectionChange)="selectedProvider.set($event.value)"
            >
              <mat-option value="none">Keiner (Standard-Tipps)</mat-option>
              <mat-option value="openai">OpenAI (ChatGPT)</mat-option>
              <mat-option value="anthropic">Anthropic (Claude)</mat-option>
            </mat-select>
          </mat-form-field>

          @if (selectedProvider() !== 'none') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>API-Key</mat-label>
              <input
                matInput
                [type]="showKey() ? 'text' : 'password'"
                [value]="apiKey()"
                (input)="apiKey.set(toInputValue($event))"
                [placeholder]="selectedProvider() === 'openai' ? 'sk-...' : 'sk-ant-...'"
              />
              <button
                mat-icon-button
                matSuffix
                (click)="showKey.set(!showKey())"
              >
                <mat-icon>{{ showKey() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Modell (optional)</mat-label>
              <input
                matInput
                [value]="model()"
                (input)="model.set(toInputValue($event))"
                [placeholder]="getDefaultModelHint()"
              />
              <mat-hint>Leer lassen fuer Standard-Modell</mat-hint>
            </mat-form-field>
          }

          <div class="action-row">
            <button
              mat-raised-button
              color="primary"
              (click)="saveSettings()"
            >
              <mat-icon>save</mat-icon>
              Speichern
            </button>

            @if (selectedProvider() !== 'none' && apiKey()) {
              <button
                mat-stroked-button
                (click)="testConnection()"
                [disabled]="isTesting()"
              >
                <mat-icon>{{ isTesting() ? 'hourglass_empty' : 'wifi' }}</mat-icon>
                {{ isTesting() ? 'Teste...' : 'Verbindung testen' }}
              </button>
            }

            @if (settingsService.hasApiKey()) {
              <button mat-button color="warn" (click)="clearKey()">
                <mat-icon>delete</mat-icon>
                Key loeschen
              </button>
            }
          </div>

          @if (testResult()) {
            <div
              class="test-result"
              [class.success]="testResult() === 'success'"
              [class.error]="testResult() !== 'success'"
            >
              <mat-icon>{{ testResult() === 'success' ? 'check_circle' : 'error' }}</mat-icon>
              <span>{{ testResultMessage() }}</span>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Info Card -->
      <mat-card class="settings-card info-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>info</mat-icon>
          <mat-card-title>Ueber die KI-Funktion</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="info-grid">
            <div class="info-item">
              <mat-icon>lightbulb</mat-icon>
              <div>
                <strong>Mit KI</strong>
                <p>Personalisierte Taktik-Tipps basierend auf eurer aktuellen Spielsituation, Einheiten und Phase.</p>
              </div>
            </div>
            <div class="info-item">
              <mat-icon>auto_awesome</mat-icon>
              <div>
                <strong>Ohne KI</strong>
                <p>Allgemeine Tipps pro Phase und hilfreiche Erinnerungen. Funktioniert komplett offline!</p>
              </div>
            </div>
            <div class="info-item">
              <mat-icon>lock</mat-icon>
              <div>
                <strong>Datenschutz</strong>
                <p>Euer API-Key wird nur lokal auf diesem Geraet gespeichert. Nichts wird an unsere Server gesendet.</p>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .settings-container { max-width: 700px; margin: 0 auto; }
    .page-title {
      display: flex; align-items: center; gap: 8px;
      color: #c9a84c; margin-bottom: 16px;
    }
    .page-title mat-icon { font-size: 28px; width: 28px; height: 28px; }

    .settings-card { margin-bottom: 16px; }
    mat-icon[mat-card-avatar] {
      color: #c9a84c; font-size: 28px; width: 36px; height: 36px;
    }

    .info-text { color: #aaa; font-size: 0.9em; margin-bottom: 16px; }
    .full-width { width: 100%; }

    .action-row {
      display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;
    }

    .test-result {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 8px; margin-top: 12px;
      font-size: 0.9em;
    }
    .test-result.success {
      background: rgba(76, 175, 80, 0.1); color: #4caf50;
    }
    .test-result.error {
      background: rgba(244, 67, 54, 0.1); color: #f44336;
    }
    .test-result mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* Info Card */
    .info-card mat-icon[mat-card-avatar] { color: #2196f3; }
    .info-grid {
      display: flex; flex-direction: column; gap: 12px;
    }
    .info-item {
      display: flex; gap: 12px; align-items: flex-start;
    }
    .info-item mat-icon {
      color: #c9a84c; font-size: 22px; width: 22px; height: 22px;
      margin-top: 2px;
    }
    .info-item p { color: #aaa; font-size: 0.85em; margin: 2px 0 0; }
  `,
})
export class SettingsComponent {
  readonly settingsService = inject(SettingsService);
  private readonly llmService = inject(LLMService);
  private readonly snackBar = inject(MatSnackBar);

  selectedProvider = signal<LLMProvider>(this.settingsService.settings().llmProvider);
  apiKey = signal(this.settingsService.settings().apiKey);
  model = signal(this.settingsService.settings().model);
  showKey = signal(false);
  isTesting = signal(false);
  testResult = signal<'success' | 'error' | ''>('');
  testResultMessage = signal('');

  toInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  getDefaultModelHint(): string {
    switch (this.selectedProvider()) {
      case 'openai': return 'Standard: gpt-4o-mini';
      case 'anthropic': return 'Standard: claude-sonnet-4-20250514';
      default: return '';
    }
  }

  async saveSettings(): Promise<void> {
    await this.settingsService.save({
      llmProvider: this.selectedProvider(),
      apiKey: this.apiKey(),
      model: this.model(),
    });
    this.snackBar.open('Einstellungen gespeichert!', '', { duration: 2000 });
  }

  async clearKey(): Promise<void> {
    await this.settingsService.clearApiKey();
    this.selectedProvider.set('none');
    this.apiKey.set('');
    this.model.set('');
    this.testResult.set('');
    this.snackBar.open('API-Key geloescht', '', { duration: 2000 });
  }

  async testConnection(): Promise<void> {
    this.isTesting.set(true);
    this.testResult.set('');

    // Temporarily save settings for the test
    await this.settingsService.save({
      llmProvider: this.selectedProvider(),
      apiKey: this.apiKey(),
      model: this.model(),
    });

    const response = await this.llmService.chat(
      [
        { role: 'system', content: 'You are a test assistant. Reply in exactly 5 words.' },
        { role: 'user', content: 'Say hello in German.' },
      ],
      20,
    );

    this.isTesting.set(false);

    if (response.error) {
      this.testResult.set('error');
      this.testResultMessage.set(`Fehler: ${response.error}`);
    } else {
      this.testResult.set('success');
      this.testResultMessage.set(`Verbindung OK! Antwort: "${response.text}"`);
    }
  }
}
