import { config as dotenvConfig } from 'dotenv';
import { AIModelConfig } from '../ai/model';
import { ProcessorConfig } from '../ai/processor';

// Загружаем переменные окружения
dotenvConfig();

export interface BotConfig {
    mode: 'twitter' | 'web';
    ai: AIModelConfig;
    solana?: {
        enabled: boolean;
        rpcUrl?: string;
        network?: 'mainnet' | 'devnet' | 'testnet';
    };
    sap?: {
        enabled: boolean;
        agentName: string;
        agentDescription: string;
        agentVersion: string;
    };
    twitter?: {
        apiKey: string;
        apiSecret: string;
        accessToken: string;
        accessSecret: string;
        autoReply: boolean;
        replyToMentions: boolean;
    };
    web?: {
        port: number;
        apiKey?: string;
        enableCors: boolean;
    };
}

export function loadConfig(): BotConfig {
    // Определяем режим работы
    const mode = (process.env.BOT_MODE as 'twitter' | 'web') || 'web';

    // Определяем провайдера AI
    const aiProvider = (process.env.AI_PROVIDER as 'ollama' | 'openai' | 'local') || 'local';

    // Конфигурация AI
    const aiConfig: AIModelConfig = {
        provider: aiProvider,
        modelName: process.env.AI_MODEL_NAME || (aiProvider === 'openai' ? 'gpt-4o-mini' : aiProvider === 'ollama' ? 'llama3' : 'local'),
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000', 10)
    };

    // Конфигурация Solana
    const solanaConfig = {
        enabled: process.env.SOLANA_ENABLED !== 'false', // По умолчанию включено
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        network: (process.env.SOLANA_NETWORK as 'mainnet' | 'devnet' | 'testnet') || 'mainnet'
    };

    // Конфигурация Solana Agent Protocol (SAP)
    const sapConfig = {
        enabled: process.env.SAP_ENABLED !== 'false', // По умолчанию включено
        agentName: process.env.SAP_AGENT_NAME || 'Solana AI Agent',
        agentDescription: process.env.SAP_AGENT_DESCRIPTION || 'Advanced AI agent for Solana blockchain interactions',
        agentVersion: process.env.SAP_AGENT_VERSION || '1.0.0'
    };

    // Конфигурация Twitter (всегда загружается, чтобы веб-режим тоже мог публиковать твиты)
    const twitterConfig = {
        apiKey: process.env.TWITTER_API_KEY || '',
        apiSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
        autoReply: process.env.TWITTER_AUTO_REPLY !== 'false',
        replyToMentions: process.env.TWITTER_REPLY_MENTIONS !== 'false'
    };

    // Конфигурация веб-сервера
    const webConfig = mode === 'web' ? {
        port: parseInt(process.env.WEB_PORT || '3000', 10),
        apiKey: process.env.WEB_API_KEY,
        enableCors: process.env.WEB_ENABLE_CORS !== 'false'
    } : undefined;

    return {
        mode,
        ai: aiConfig,
        solana: solanaConfig,
        sap: sapConfig,
        twitter: twitterConfig,
        web: webConfig
    };
}

export function validateConfig(config: BotConfig): string[] {
    const errors: string[] = [];

    if (config.mode === 'twitter' && config.twitter) {
        if (!config.twitter.apiKey) errors.push('TWITTER_API_KEY is required');
        if (!config.twitter.apiSecret) errors.push('TWITTER_API_SECRET is required');
        if (!config.twitter.accessToken) errors.push('TWITTER_ACCESS_TOKEN is required');
        if (!config.twitter.accessSecret) errors.push('TWITTER_ACCESS_SECRET is required');
    }

    if (config.ai.provider === 'openai' && !config.ai.apiKey) {
        errors.push('OPENAI_API_KEY is required when using OpenAI provider');
    }

    return errors;
}