import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import path from 'path';
import { TwitterApi } from 'twitter-api-v2';
import { AIProcessor, ProcessorConfig } from '../ai/processor';

export interface TwitterConfig {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
}

export interface WebBotConfig {
    port?: number;
    apiKey?: string;
    processorConfig: ProcessorConfig;
    enableCors?: boolean;
    twitter?: TwitterConfig;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export class WebBot {
    private app: Express;
    private processor: AIProcessor;
    private config: WebBotConfig;
    private chatHistory: Map<string, ChatMessage[]> = new Map();
    private twitterClient?: TwitterApi;

    constructor(config: WebBotConfig) {
        this.config = {
            port: 3000,
            enableCors: true,
            ...config
        };

        this.app = express();
        this.processor = new AIProcessor(config.processorConfig);

        // Инициализируем Twitter клиент если есть ключи
        if (config.twitter?.apiKey && config.twitter.apiKey !== 'your_api_key') {
            this.twitterClient = new TwitterApi({
                appKey: config.twitter.apiKey,
                appSecret: config.twitter.apiSecret,
                accessToken: config.twitter.accessToken,
                accessSecret: config.twitter.accessSecret,
            });
            console.log('🐦 Twitter клиент подключён');
        }

        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Настройка middleware
     */
    private setupMiddleware(): void {
        this.app.use(express.json());
        
        if (this.config.enableCors) {
            this.app.use(cors());
        }

        // Middleware для проверки API ключа (если установлен)
        if (this.config.apiKey) {
            this.app.use((req, res, next) => {
                const authHeader = req.headers.authorization;
                
                if (req.path === '/health') {
                    return next();
                }

                if (!authHeader || authHeader !== `Bearer ${this.config.apiKey}`) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                
                next();
            });
        }
    }

    /**
     * Настройка маршрутов
     */
    private setupRoutes(): void {
        // Статические файлы из public папки
        // Поддержка как локального запуска, так и Vercel serverless
        const publicPath = process.env.VERCEL
            ? path.join(process.cwd(), 'public')
            : path.join(__dirname, '../../public');
        this.app.use(express.static(publicPath));

        // Главная страница - новый стильный интерфейс
        this.app.get('/', (req: Request, res: Response) => {
            res.sendFile(path.join(publicPath, 'index.html'));
        });

        // Проверка здоровья
        this.app.get('/health', async (req: Request, res: Response) => {
            const aiHealthy = await this.processor.checkHealth();
            res.json({ 
                status: 'ok', 
                ai: aiHealthy ? 'healthy' : 'degraded',
                timestamp: Date.now()
            });
        });

        // Публичная страница агента
        this.app.get('/agent', (req: Request, res: Response) => {
            res.sendFile(path.join(publicPath, 'agent.html'));
        });

        // Красивая HTML-страница манифеста
        this.app.get('/manifest', (req: Request, res: Response) => {
            res.sendFile(path.join(publicPath, 'manifest.html'));
        });

        // API: профиль + статистика + навыки
        this.app.get('/api/agent', (req: Request, res: Response) => {
            const sap = this.config.processorConfig.sapProtocol;
            if (!sap) return res.status(404).json({ error: 'SAP Protocol not enabled' });
            const profile = sap.profileManager.getProfile();
            const stats = sap.getStats();
            const skills = sap.skillManager.listSkills().map((s: any) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                category: s.category,
                usageCount: s.usageCount,
                rating: s.rating
            }));
            return res.json({ profile, stats, skills });
        });

        // API: последние задачи
        this.app.get('/api/agent/tasks', (req: Request, res: Response) => {
            const sap = this.config.processorConfig.sapProtocol;
            if (!sap) return res.status(404).json({ error: 'SAP Protocol not enabled' });
            const profile = sap.profileManager.getProfile();
            if (!profile) return res.json({ tasks: [] });
            const tasks = sap.registry.listTasksByAgent(profile.id)
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 20);
            return res.json({ tasks });
        });

        // API: OpenClaw manifest
        this.app.get('/api/agent/manifest', (req: Request, res: Response) => {
            const sap = this.config.processorConfig.sapProtocol;
            if (!sap) return res.status(404).json({ error: 'SAP Protocol not enabled' });
            return res.json(sap.exportForOpenClaw());
        });

        // Twitter: статус
        this.app.get('/api/twitter/status', (req: Request, res: Response) => {
            return res.json({ connected: !!this.twitterClient });
        });

        // Twitter: опубликовать готовый твит
        this.app.post('/api/twitter/post', async (req: Request, res: Response) => {
            if (!this.twitterClient) {
                return res.status(503).json({ error: 'Twitter не подключён. Добавь ключи в .env' });
            }
            const { text } = req.body;
            if (!text) return res.status(400).json({ error: 'text is required' });
            if (text.length > 280) return res.status(400).json({ error: 'Твит слишком длинный (макс 280 символов)' });
            try {
                const tweet = await this.twitterClient.readWrite.v2.tweet({ text });
                return res.json({ success: true, id: tweet.data.id, text });
            } catch (err: any) {
                return res.status(500).json({ error: err.message });
            }
        });

        // Twitter: сгенерировать AI-твит и опубликовать
        this.app.post('/api/twitter/generate', async (req: Request, res: Response) => {
            if (!this.twitterClient) {
                return res.status(503).json({ error: 'Twitter не подключён. Добавь ключи в .env' });
            }
            const { topic } = req.body;
            if (!topic) return res.status(400).json({ error: 'topic is required' });
            try {
                const prompt = `Write a tweet about: ${topic}. Max 260 characters. Confident builder tone. About AgentPass or Solana AI agents. No hashtag spam.`;
                const generated = await this.processor.processMessage(prompt);
                const tweetText = generated.substring(0, 280);
                const tweet = await this.twitterClient.readWrite.v2.tweet({ text: tweetText });
                return res.json({ success: true, id: tweet.data.id, text: tweetText });
            } catch (err: any) {
                return res.status(500).json({ error: err.message });
            }
        });

        // Twitter: только сгенерировать текст (без публикации — для превью)
        this.app.post('/api/twitter/preview', async (req: Request, res: Response) => {
            const { topic } = req.body;
            if (!topic) return res.status(400).json({ error: 'topic is required' });
            try {
                const prompt = `Write a tweet about: ${topic}. Max 260 characters. Confident builder tone. About AgentPass or Solana AI agents. No hashtag spam. Return ONLY the tweet text, nothing else.`;
                const text = await this.processor.processMessage(prompt);
                return res.json({ text: text.substring(0, 280) });
            } catch (err: any) {
                return res.status(500).json({ error: err.message });
            }
        });

        // API для отправки сообщения
        this.app.post('/api/chat', async (req: Request, res: Response) => {
            try {
                const { message, sessionId } = req.body;

                if (!message) {
                    return res.status(400).json({ error: 'Message is required' });
                }

                // Получаем историю сессии
                const session = sessionId || 'default';
                const history = this.chatHistory.get(session) || [];

                // Передаём историю в AI — агент помнит контекст
                const response = await this.processor.processMessage(
                    message,
                    history.map(m => ({ role: m.role, content: m.content }))
                );

                // Сохраняем в историю
                history.push({
                    role: 'user',
                    content: message,
                    timestamp: Date.now()
                });
                history.push({
                    role: 'assistant',
                    content: response,
                    timestamp: Date.now()
                });

                // Ограничиваем историю до 20 последних сообщений
                if (history.length > 20) {
                    history.splice(0, history.length - 20);
                }

                this.chatHistory.set(session, history);

                res.json({ 
                    response,
                    sessionId: session,
                    timestamp: Date.now()
                });
            } catch (error: any) {
                console.error('Error processing chat message:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // API для получения истории чата
        this.app.get('/api/chat/history/:sessionId', (req: Request, res: Response) => {
            const sessionId = req.params.sessionId;
            const history = this.chatHistory.get(sessionId) || [];
            res.json({ history });
        });

        // API для очистки истории
        this.app.delete('/api/chat/history/:sessionId', (req: Request, res: Response) => {
            const sessionId = req.params.sessionId;
            this.chatHistory.delete(sessionId);
            res.json({ message: 'History cleared' });
        });

        // ─── Open Registry ──────────────────────────────────────────────────

        // Serve registry page
        this.app.get('/registry', (_req: Request, res: Response) => {
            res.sendFile(path.join(__dirname, '../../public/registry.html'));
        });

        // List all agents with optional filters
        this.app.get('/api/registry/agents', (req: Request, res: Response) => {
            const sapProtocol = (this.processor as any).config?.sapProtocol;
            if (!sapProtocol) return res.json({ agents: [], total: 0 });

            let agents = sapProtocol.registry.listAgents() as any[];

            const { category, search, limit } = req.query as Record<string, string>;
            if (category) agents = agents.filter((a: any) => a.category === category);
            if (search) {
                const q = search.toLowerCase();
                agents = agents.filter((a: any) =>
                    a.name.toLowerCase().includes(q) ||
                    a.description.toLowerCase().includes(q) ||
                    (a.tags || []).some((t: string) => t.toLowerCase().includes(q))
                );
            }

            agents.sort((a: any, b: any) => b.reputation - a.reputation);
            const raw = limit ? agents.slice(0, parseInt(limit)) : agents;

            // Strip noisy fields for listing
            const result = raw.map((a: any) => ({
                id: a.id,
                name: a.name,
                description: a.description,
                version: a.version,
                category: a.category || 'other',
                website: a.website,
                github: a.github,
                twitter: a.twitter,
                tags: a.tags || [],
                capabilities: (a.capabilities || []).map((c: any) => c.name),
                reputation: a.reputation,
                tasksCompleted: a.tasksCompleted,
                successRate: a.successRate,
                isExternal: a.isExternal || false,
                lastActive: a.lastActive,
                liveData: a.liveData || null,
            }));

            res.json({ agents: result, total: result.length });
        });

        // Single agent detail
        this.app.get('/api/registry/agent/:id', (req: Request, res: Response) => {
            const sapProtocol = (this.processor as any).config?.sapProtocol;
            if (!sapProtocol) return res.status(503).json({ error: 'Registry not available' });

            const agent = sapProtocol.registry.getAgent(req.params.id);
            if (!agent) return res.status(404).json({ error: 'Agent not found' });

            res.json({
                ...agent,
                capabilities: agent.capabilities.map((c: any) => c.name),
                tags: agent.tags || [],
            });
        });

        // Register an external agent
        this.app.post('/api/registry/register', async (req: Request, res: Response) => {
            const sapProtocol = (this.processor as any).config?.sapProtocol;
            if (!sapProtocol) return res.status(503).json({ error: 'Registry not available' });

            const { name, description, version, category, website, github, twitter, tags, capabilities } = req.body;
            if (!name || !description) {
                return res.status(400).json({ error: 'name and description are required' });
            }

            try {
                const id = await sapProtocol.registerExternalAgent({
                    name, description, version, category, website, github, twitter, tags, capabilities
                });
                res.json({ id, message: 'Agent registered successfully' });
            } catch (err: any) {
                res.status(500).json({ error: err.message });
            }
        });

        // Registry stats
        this.app.get('/api/registry/stats', (req: Request, res: Response) => {
            const sapProtocol = (this.processor as any).config?.sapProtocol;
            if (!sapProtocol) return res.json({ error: 'Registry not available' });

            const agents = sapProtocol.registry.listAgents() as any[];
            const byCategory: Record<string, number> = {};
            agents.forEach((a: any) => {
                const cat = a.category || 'other';
                byCategory[cat] = (byCategory[cat] || 0) + 1;
            });

            res.json({
                totalAgents: agents.length,
                byCategory,
                averageReputation: +(agents.reduce((s: number, a: any) => s + a.reputation, 0) / (agents.length || 1)).toFixed(1),
                topAgent: agents.sort((a: any, b: any) => b.reputation - a.reputation)[0]?.name || null,
            });
        });

        // Crawler status
        this.app.get('/api/registry/crawler', (req: Request, res: Response) => {
            const crawler = (this as any).crawler;
            if (!crawler) return res.json({ running: false, message: 'Crawler not started' });
            res.json(crawler.getStatus());
        });

        // Manual crawler trigger
        this.app.post('/api/registry/crawler/run', async (req: Request, res: Response) => {
            const crawler = (this as any).crawler;
            if (!crawler) return res.status(503).json({ error: 'Crawler not started' });
            res.json({ message: 'Crawl cycle triggered' });
            crawler.runCycle().catch((e: any) => console.error('Manual crawl error:', e));
        });
    }

    /**
     * Простой веб-интерфейс для чата
     */
    private getWebInterface(): string {
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Bot Chat</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            width: 90%;
            max-width: 800px;
            height: 90vh;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
        }
        .header {
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 20px 20px 0 0;
            text-align: center;
        }
        .header h1 { font-size: 24px; }
        .header p { font-size: 14px; opacity: 0.9; margin-top: 5px; }
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .message {
            margin-bottom: 15px;
            display: flex;
            animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message.user { justify-content: flex-end; }
        .message.assistant { justify-content: flex-start; }
        .message-content {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
        }
        .message.user .message-content {
            background: #667eea;
            color: white;
        }
        .message.assistant .message-content {
            background: white;
            color: #333;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .input-container {
            padding: 20px;
            background: white;
            border-radius: 0 0 20px 20px;
            display: flex;
            gap: 10px;
        }
        #messageInput {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.3s;
        }
        #messageInput:focus {
            border-color: #667eea;
        }
        #sendButton {
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: transform 0.2s;
        }
        #sendButton:hover {
            transform: scale(1.05);
        }
        #sendButton:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .typing-indicator {
            display: none;
            padding: 12px 16px;
            background: white;
            border-radius: 18px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .typing-indicator.show {
            display: inline-block;
        }
        .typing-indicator span {
            height: 8px;
            width: 8px;
            background: #667eea;
            border-radius: 50%;
            display: inline-block;
            margin: 0 2px;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI Bot Chat</h1>
            <p>Задайте мне любой вопрос!</p>
        </div>
        <div class="chat-container" id="chatContainer">
            <div class="message assistant">
                <div class="message-content">
                    Привет! Я AI-бот. Чем могу помочь?
                </div>
            </div>
        </div>
        <div class="input-container">
            <input type="text" id="messageInput" placeholder="Введите сообщение..." />
            <button id="sendButton">Отправить</button>
        </div>
    </div>

    <script>
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const sessionId = 'web-' + Math.random().toString(36).substr(2, 9);

        function addMessage(role, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}\`;
            messageDiv.innerHTML = \`<div class="message-content">\${content}</div>\`;
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function showTypingIndicator() {
            const indicator = document.createElement('div');
            indicator.className = 'message assistant';
            indicator.innerHTML = '<div class="typing-indicator show"><span></span><span></span><span></span></div>';
            indicator.id = 'typingIndicator';
            chatContainer.appendChild(indicator);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function hideTypingIndicator() {
            const indicator = document.getElementById('typingIndicator');
            if (indicator) indicator.remove();
        }

        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            addMessage('user', message);
            messageInput.value = '';
            sendButton.disabled = true;
            showTypingIndicator();

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, sessionId })
                });

                const data = await response.json();
                hideTypingIndicator();
                
                if (data.error) {
                    addMessage('assistant', 'Error: ' + data.error);
                } else {
                    addMessage('assistant', data.response);
                }
            } catch (error) {
                hideTypingIndicator();
                addMessage('assistant', 'Connection error. Please try again.');
            } finally {
                sendButton.disabled = false;
                messageInput.focus();
            }
        }

        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        messageInput.focus();
    </script>
</body>
</html>`;
    }

    /**
     * Получить Express app instance (для Vercel serverless)
     */
    public getApp(): Express {
        return this.app;
    }

    /**
     * Запуск веб-сервера
     */
    public async start(): Promise<void> {
        return new Promise((resolve) => {
            this.app.listen(this.config.port, () => {
                console.log(`✅ Веб-бот запущен на http://localhost:${this.config.port}`);
                console.log(`📱 Откройте http://localhost:${this.config.port} в браузере`);
                resolve();
            });
        });
    }
}
