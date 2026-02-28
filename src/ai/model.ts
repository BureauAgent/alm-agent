import axios from 'axios';

export interface AIModelConfig {
    provider: 'ollama' | 'openai' | 'local';
    modelName: string;
    apiKey?: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class AIModel {
    private config: AIModelConfig;

    constructor(config: AIModelConfig) {
        this.config = {
            temperature: 0.7,
            maxTokens: 1000,
            ...config
        };
    }

    /**
     * Основной метод: чат с историей и system prompt
     */
    public async generateChat(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
        switch (this.config.provider) {
            case 'openai':
                return await this.chatWithOpenAI(systemPrompt, messages);
            case 'ollama':
                return await this.chatWithOllama(systemPrompt, messages);
            case 'local':
                return await this.chatWithLocal(systemPrompt, messages);
            default:
                throw new Error(`Unknown provider: ${this.config.provider}`);
        }
    }

    /**
     * OpenAI — правильный chat completions с историей
     */
    private async chatWithOpenAI(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
        if (!this.config.apiKey) {
            throw new Error('OpenAI API key required. Set OPENAI_API_KEY in .env');
        }

        const payload = {
            model: this.config.modelName || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens
        };

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return response.data.choices[0].message.content.trim();
    }

    /**
     * Ollama — локальный модель
     */
    private async chatWithOllama(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
        const baseUrl = this.config.baseUrl || 'http://localhost:11434';

        // Ollama /api/chat supports messages array
        const response = await axios.post(`${baseUrl}/api/chat`, {
            model: this.config.modelName || 'llama3',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            stream: false,
            options: {
                temperature: this.config.temperature,
                num_predict: this.config.maxTokens
            }
        }, { timeout: 60000 });

        return response.data.message?.content?.trim() || '';
    }

    /**
     * Демо-режим (без AI ключа)
     */
    private async chatWithLocal(_systemPrompt: string, messages: ChatMessage[]): Promise<string> {
        const last = messages[messages.length - 1]?.content?.toLowerCase() || '';
        if (last.includes('привет') || last.includes('hello') || last.includes('hi')) {
            return 'Привет! Я AgentPass — AI-агент для Solana. Спрашивай баланс, цены, транзакции или статус сети.';
        }
        if (last.includes('что') && (last.includes('умеешь') || last.includes('можешь') || last.includes('can you') || last.includes('what can'))) {
            return 'Я могу:\n\n• Проверить баланс кошелька (SOL + токены)\n• Показать цены токенов (SOL, BONK, JUP...)\n• Проанализировать транзакции\n• Проверить статус сети Solana\n\nУстанови OPENAI_API_KEY в .env для полноценных ответов.';
        }
        return 'Это демо-режим. Добавь OPENAI_API_KEY в .env чтобы агент ожил.';
    }

    /**
     * Обратная совместимость
     */
    public async generateResponse(prompt: string, _context?: string): Promise<string> {
        return this.generateChat('', [{ role: 'user', content: prompt }]);
    }

    /**
     * Проверяет доступность модели
     */
    public async checkHealth(): Promise<boolean> {
        try {
            if (this.config.provider === 'ollama') {
                const url = (this.config.baseUrl || 'http://localhost:11434') + '/api/tags';
                await axios.get(url, { timeout: 3000 });
            }
            return true;
        } catch {
            return false;
        }
    }
}