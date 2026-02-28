# Архитектура проекта

Подробное описание архитектуры AI Bot проекта и как он работает.

## 📐 Общая архитектура

```
┌─────────────────────────────────────────────────────────┐
│                     Пользователь                         │
└────────────┬──────────────────────────┬─────────────────┘
             │                          │
             │ HTTP                     │ Twitter API
             ▼                          ▼
    ┌────────────────┐         ┌────────────────┐
    │   Web Server   │         │  Twitter Bot    │
    │  (Express.js)  │         │  (twitter-api)  │
    └────────┬───────┘         └────────┬────────┘
             │                          │
             └──────────┬───────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   AI Processor    │
              │  (Orchestrator)   │
              └─────────┬─────────┘
                        │
                        ▼
              ┌──────────────────┐
              │    AI Model       │
              │  (Provider Layer) │
              └─────────┬─────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌────────┐     ┌─────────┐    ┌──────────┐
   │ Ollama │     │ OpenAI  │    │  Local   │
   │ (Local)│     │(Cloud)  │    │  (Demo)  │
   └────────┘     └─────────┘    └──────────┘
```

## 🏗️ Слоистая архитектура

### Layer 1: Interface Layer (Интерфейсы)

**Файлы:** `src/bot/twitter.ts`, `src/bot/web.ts`

Отвечает за:
- Получение входящих сообщений от пользователей
- Отправку ответов обратно
- Специфичные для платформы функции (API вызовы)

**Пример:**
```typescript
// Twitter Bot получает упоминание
tweet → TwitterBot.handleMention() → AIProcessor → Twitter API
```

### Layer 2: Processing Layer (Обработка)

**Файлы:** `src/ai/processor.ts`

Отвечает за:
- Валидацию и очистку входных данных
- Формирование промптов для AI
- Обработку ответов от AI
- Кеширование и логирование

**Пример:**
```typescript
"Привет" → cleanInput() → formPrompt() → model.generate() → cleanOutput() → "Привет! ..."
```

### Layer 3: AI Model Layer (AI модели)

**Файлы:** `src/ai/model.ts`

Отвечает за:
- Абстракцию различных AI провайдеров
- Единый интерфейс для всех моделей
- Обработку ошибок API
- Retry логику

**Провайдеры:**
```typescript
interface AIModel {
    generateResponse(prompt: string): Promise<string>
}

// Реализации:
- OllamaModel
- OpenAIModel
- LocalModel
```

### Layer 4: Configuration Layer (Конфигурация)

**Файлы:** `src/config/index.ts`

Отвечает за:
- Загрузку переменных окружения
- Валидацию конфигурации
- Предоставление конфигов всем компонентам

## 🔄 Поток данных

### Веб-чат сценарий

```
1. Пользователь → POST /api/chat
   Body: { message: "Привет" }

2. WebBot.handleChatRequest()
   - Извлекает message из req.body
   - Получает sessionId

3. AIProcessor.processMessage("Привет")
   - cleanInput("Привет") → "привет"
   - формирует промпт с системным контекстом
   - вызывает model.generateResponse()

4. AIModel.generateResponse()
   - определяет провайдера (ollama/openai/local)
   - отправляет HTTP запрос к API
   - получает ответ

5. AIProcessor
   - очищает ответ
   - сохраняет в историю
   - возвращает WebBot

6. WebBot
   - формирует JSON response
   - отправляет пользователю
```

### Twitter бот сценарий

```
1. Twitter webhook → упоминание бота
   "@mybot расскажи шутку"

2. TwitterBot.handleMention(tweet)
   - проверяет, не собственный твит
   - извлекает текст

3. AIProcessor.processMessage(tweet.text)
   - обрабатывает сообщение
   - генерирует ответ

4. TwitterBot.postTweet(response, tweet.id)
   - обрезает до 280 символов
   - публикует ответ
```

## 🧩 Ключевые компоненты

### 1. AIModel (src/ai/model.ts)

```typescript
class AIModel {
    private config: AIModelConfig
    
    // Основной метод
    async generateResponse(prompt: string): Promise<string>
    
    // Провайдер-специфичные методы
    private async generateWithOllama()
    private async generateWithOpenAI()
    private async generateWithLocalModel()
}
```

**Ответственность:**
- Единая точка входа для всех AI операций
- Абстракция различий между провайдерами
- Обработка ошибок API

### 2. AIProcessor (src/ai/processor.ts)

```typescript
class AIProcessor {
    private model: AIModel
    private config: ProcessorConfig
    
    // Основной метод
    async processMessage(message: string): Promise<string>
    
    // Вспомогательные методы
    private cleanInput(text: string): string
    private cleanOutput(text: string): string
}
```

**Ответственность:**
- Оркестратор между ботами и AI моделью
- Предобработка и постобработка текста
- Управление контекстом и историей

### 3. TwitterBot (src/bot/twitter.ts)

```typescript
class TwitterBot {
    private client: TwitterApi
    private processor: AIProcessor
    
    // Публичные методы
    async initialize()
    async postTweet(content: string)
    async postAITweet(prompt: string)
    async startListening()
    
    // Приватные методы
    private async handleMention(tweet)
}
```

**Ответственность:**
- Интеграция с Twitter API
- Обработка упоминаний и стрима
- Публикация твитов

### 4. WebBot (src/bot/web.ts)

```typescript
class WebBot {
    private app: Express
    private processor: AIProcessor
    private chatHistory: Map<string, ChatMessage[]>
    
    // Публичные методы
    async start()
    
    // Приватные методы
    private setupMiddleware()
    private setupRoutes()
    private getWebInterface(): string
}
```

**Ответственность:**
- HTTP сервер и API endpoints
- Веб-интерфейс чата
- Управление сессиями

## 🔐 Безопасность

### 1. Валидация входных данных

```typescript
// В AIProcessor
private cleanInput(text: string): string {
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s\p{L}\p{N}?!.,;:()\-]/gu, '');
}
```

### 2. Ограничение длины

```typescript
if (cleanedMessage.length > this.config.maxInputLength!) {
    return `Сообщение слишком длинное...`;
}
```

### 3. API ключи в переменных окружения

```typescript
// Никогда не коммитим .env файл!
// Только .env.example
```

### 4. Rate limiting (можно добавить)

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100 // максимум 100 запросов
});

app.use('/api/', limiter);
```

## ⚡ Оптимизация

### 1. Кеширование ответов

```typescript
class AIProcessor {
    private cache = new Map<string, string>();
    
    async processMessage(message: string): Promise<string> {
        const cacheKey = message.toLowerCase();
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }
        
        const response = await this.model.generateResponse(message);
        this.cache.set(cacheKey, response);
        
        return response;
    }
}
```

### 2. Retry с backoff

```typescript
// В utils/helpers.ts
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
): Promise<T> {
    // ... реализация экспоненциального backoff
}
```

### 3. Streaming responses (для будущего)

```typescript
// Для больших ответов можно использовать streaming
app.get('/api/chat/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    
    const stream = await model.generateStream(prompt);
    for await (const chunk of stream) {
        res.write(`data: ${chunk}\n\n`);
    }
    
    res.end();
});
```

## 🧪 Тестирование

### Unit тесты

```typescript
// tests/ai.test.ts
describe('AIModel', () => {
    it('should generate response with Ollama', async () => {
        const model = new AIModel({
            provider: 'ollama',
            modelName: 'llama2'
        });
        
        const response = await model.generateResponse('Hello');
        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
    });
});
```

### Integration тесты

```typescript
// tests/bot.test.ts
describe('WebBot', () => {
    it('should handle chat request', async () => {
        const bot = new WebBot(config);
        await bot.start();
        
        const response = await request(bot.app)
            .post('/api/chat')
            .send({ message: 'Hello' });
            
        expect(response.status).toBe(200);
        expect(response.body.response).toBeDefined();
    });
});
```

## 📊 Мониторинг

### Health check endpoint

```typescript
app.get('/health', async (req, res) => {
    const aiHealthy = await processor.checkHealth();
    
    res.json({
        status: 'ok',
        ai: aiHealthy ? 'healthy' : 'degraded',
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});
```

### Логирование

```typescript
import { logInfo, logError } from './utils/helpers';

logInfo('Bot started', { mode: config.mode });
logError(error); // автоматически логирует stack trace
```

## 🚀 Деплой

### Docker (будущая функция)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/bot/index.js"]
```

### Environment variables

```bash
# Production
BOT_MODE=web
AI_PROVIDER=openai
OPENAI_API_KEY=secret
WEB_PORT=8080
```

## 🔮 Будущие улучшения

1. **Database persistence**
   - PostgreSQL для истории чатов
   - Redis для кеширования

2. **Websockets**
   - Real-time чат без polling

3. **Multiple AI models**
   - Выбор модели на лету
   - Сравнение ответов

4. **Analytics**
   - Статистика использования
   - Популярные запросы

5. **Admin панель**
   - Управление ботом через UI
   - Просмотр логов

6. **Multi-language**
   - Определение языка
   - Ответы на языке пользователя

---

**Эта архитектура позволяет легко:**
- Добавлять новых AI провайдеров
- Интегрировать с новыми платформами
- Масштабировать и оптимизировать
- Тестировать компоненты изолированно
