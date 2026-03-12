import { Injectable } from '@angular/core';
import { SettingsService, LLMProvider } from './settings.service';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  text: string;
  provider: LLMProvider;
  model: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class LLMService {
  constructor(private settingsService: SettingsService) {}

  async chat(messages: LLMMessage[], maxTokens = 500): Promise<LLMResponse> {
    const settings = this.settingsService.settings();
    const model = this.settingsService.getDefaultModel();

    if (settings.llmProvider === 'none' || !settings.apiKey) {
      return {
        text: '',
        provider: 'none',
        model: '',
        error: 'no_api_key',
      };
    }

    try {
      if (settings.llmProvider === 'openai') {
        return await this.callOpenAI(settings.apiKey, model, messages, maxTokens);
      } else {
        return await this.callAnthropic(settings.apiKey, model, messages, maxTokens);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        text: '',
        provider: settings.llmProvider,
        model,
        error: msg,
      };
    }
  }

  private async callOpenAI(
    apiKey: string,
    model: string,
    messages: LLMMessage[],
    maxTokens: number
  ): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${body}`);
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      provider: 'openai',
      model,
    };
  }

  private async callAnthropic(
    apiKey: string,
    model: string,
    messages: LLMMessage[],
    maxTokens: number
  ): Promise<LLMResponse> {
    // Anthropic uses a different format: system is separate, messages are user/assistant only
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMsgs = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: chatMsgs,
    };
    if (systemMsg) {
      body['system'] = systemMsg.content;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const text =
      data.content
        ?.filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('') ?? '';

    return {
      text,
      provider: 'anthropic',
      model,
    };
  }
}
