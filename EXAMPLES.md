# Примеры использования AI Bot

Этот файл содержит практические примеры использования бота в различных сценариях.

## Пример 1: Локальный AI бот (самый простой)

### Создайте .env файл:
```env
BOT_MODE=web
AI_PROVIDER=local
WEB_PORT=3000
```

### Запустите:
```bash
npm install
npm run dev
```

Откройте http://localhost:3000 и начните общаться с демо-ботом!

---

## Пример 2: Ollama бот (локальный, мощный)

### 1. Установите Ollama

**Windows:**
- Скачайте с https://ollama.ai

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl https://ollama.ai/install.sh | sh
```

### 2. Запустите Ollama и скачайте модель

```bash
# Запустите сервер Ollama
ollama serve

# В другом терминале скачайте модель
ollama pull llama2
```

### 3. Настройте .env

```env
BOT_MODE=web
AI_PROVIDER=ollama
AI_MODEL_NAME=llama2
OLLAMA_BASE_URL=http://localhost:11434
WEB_PORT=3000
```

### 4. Запустите бота

```bash
npm run dev
```

---

## Пример 3: OpenAI бот (облачный)

### 1. Получите API ключ

Зарегистрируйтесь на https://platform.openai.com и создайте API ключ

### 2. Настройте .env

```env
BOT_MODE=web
AI_PROVIDER=openai
AI_MODEL_NAME=gpt-3.5-turbo
OPENAI_API_KEY=sk-your-api-key-here
WEB_PORT=3000
```

### 3. Запустите

```bash
npm run dev
```

---

## Пример 4: Twitter бот с Ollama

### 1. Получите Twitter API ключи

1. Зайдите на https://developer.twitter.com
2. Создайте новое приложение
3. Получите API Key, API Secret, Access Token, Access Secret
4. Установите права на чтение и запись

### 2. Настройте .env

```env
BOT_MODE=twitter
AI_PROVIDER=ollama
AI_MODEL_NAME=llama2

TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
TWITTER_REPLY_MENTIONS=true
```

### 3. Запустите

```bash
# Для прослушивания упоминаний
npm run dev:twitter

# Или для публикации одного твита
npm start -- --post "Расскажи интересный факт о TypeScript"
```

---

## Пример 5: Программное использование

### Создайте файл `my-bot.ts`:

```typescript
import { AIProcessor } from './src/ai/processor';
import { TwitterBot } from './src/bot/twitter';
import { WebBot } from './src/bot/web';

// Пример 1: Простой AI процессор
async function simpleAI() {
    const processor = new AIProcessor({
        modelConfig: {
            provider: 'ollama',
            modelName: 'llama2'
        },
        systemPrompt: 'Ты дружелюбный помощник'
    });

    const response = await processor.processMessage('Привет, как дела?');
    console.log(response);
}

// Пример 2: Кастомный веб-бот
async function customWebBot() {
    const bot = new WebBot({
        port: 4000,
        apiKey: 'my-secret-key',
        processorConfig: {
            modelConfig: {
                provider: 'openai',
                modelName: 'gpt-4',
                apiKey: process.env.OPENAI_API_KEY
            },
            systemPrompt: 'Ты эксперт по TypeScript'
        }
    });

    await bot.start();
}

// Пример 3: Twitter бот
async function twitterBot() {
    const bot = new TwitterBot({
        apiKey: process.env.TWITTER_API_KEY!,
        apiSecret: process.env.TWITTER_API_SECRET!,
        accessToken: process.env.TWITTER_ACCESS_TOKEN!,
        accessSecret: process.env.TWITTER_ACCESS_SECRET!,
        processorConfig: {
            modelConfig: {
                provider: 'ollama',
                modelName: 'mistral'
            }
        },
        replyToMentions: true
    });

    await bot.initialize();
    await bot.startListening();
}

// Запуск
simpleAI();
```

### Запустите:
```bash
ts-node my-bot.ts
```

---

## Пример 6: GitHub Actions автоматизация

### 1. Добавьте секреты в GitHub

`Settings → Secrets and variables → Actions → New repository secret`

Добавьте:
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`
- `OPENAI_API_KEY` (если используете OpenAI)

### 2. Workflow автоматически запустится

Файл `.github/workflows/twitter-integration.yml` настроен на:
- Запуск при каждом push в main
- Запуск каждый час (cron)
- Ручной запуск с кастомным сообщением

### 3. Ручной запуск с GitHub UI

1. Зайдите в Actions
2. Выберите "Twitter Bot Integration"
3. Нажмите "Run workflow"
4. Введите текст промпта
5. Бот создаст и опубликует AI-твит!

---

## Пример 7: Разные модели для разных задач

```typescript
// Для кода
const codeBot = new AIProcessor({
    modelConfig: {
        provider: 'ollama',
        modelName: 'codellama'  // Специализирован на коде
    }
});

// Для общения
const chatBot = new AIProcessor({
    modelConfig: {
        provider: 'ollama',
        modelName: 'mistral'  // Быстрый и универсальный
    }
});

// Для сложных задач
const smartBot = new AIProcessor({
    modelConfig: {
        provider: 'openai',
        modelName: 'gpt-4'  // Самый умный
    }
});
```

---

## Пример 8: Мультиплатформенный бот

```typescript
// Один AI процессор для всех платформ
const processor = new AIProcessor({
    modelConfig: {
        provider: 'ollama',
        modelName: 'llama2'
    }
});

// Twitter
const twitterBot = new TwitterBot({
    // ... config
    processorConfig: { modelConfig: processor.config }
});

// Веб
const webBot = new WebBot({
    // ... config
    processorConfig: { modelConfig: processor.config }
});

// Запуск обоих
await Promise.all([
    twitterBot.initialize(),
    webBot.start()
]);
```

---

## Полезные команды

```bash
# Разработка
npm run dev              # Запуск в режиме разработки
npm run dev:web          # Только веб-сервер
npm run dev:twitter      # Только Twitter бот

# Продакшн
npm run build            # Компиляция TypeScript
npm start                # Запуск скомпилированного кода

# Ollama
ollama list              # Список установленных моделей
ollama pull llama2       # Скачать модель
ollama rm llama2         # Удалить модель

# Тестирование API
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

---

## Troubleshooting

### Проблема: "Ollama connection refused"
```bash
# Убедитесь, что Ollama запущен
ollama serve

# Проверьте доступность
curl http://localhost:11434/api/tags
```

### Проблема: "Twitter authentication failed"
- Проверьте все 4 ключа в .env
- Убедитесь, что у приложения есть права на чтение и запись
- Попробуйте пересоздать токены

### Проблема: "Port 3000 already in use"
```bash
# Измените порт в .env
WEB_PORT=3001
```

### Проблема: OpenAI rate limit
```typescript
// Добавьте задержку между запросами
import { delay } from './src/utils/helpers';

await processor.processMessage('message 1');
await delay(1000);  // 1 секунда
await processor.processMessage('message 2');
```

---

## Дополнительные ресурсы

- [Ollama Models](https://ollama.ai/library) - каталог локальных моделей
- [Twitter API Docs](https://developer.twitter.com/en/docs) - документация Twitter API
- [OpenAI Docs](https://platform.openai.com/docs) - документация OpenAI
- [Express.js Guide](https://expressjs.com/en/guide/routing.html) - работа с веб-сервером
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - изучение TypeScript
