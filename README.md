# 🤖 AI Bot Project

Мощный AI-бот с поддержкой локальных моделей (Ollama) и интеграцией с Twitter и веб-чатом. Идеальный проект для изучения и создания AI-ботов с GitHub Actions.

## ✨ Возможности

- 🧠 **Поддержка нескольких AI провайдеров:**
  - **Ollama** - локальные модели (llama2, mistral, codellama и др.)
  - **OpenAI** - GPT-3.5, GPT-4
  - **Local** - простая демо-модель для тестирования

- 🐦 **Twitter интеграция:**
  - Публикация AI-генерированных твитов
  - Автоматические ответы на упоминания
  - Мониторинг упоминаний в реальном времени

- 🌐 **Веб-интерфейс:**
  - Красивый чат с AI
  - REST API для интеграций
  - История сообщений

- ⚙️ **GitHub Actions:**
  - Автоматическая публикация твитов
  - CI/CD для деплоя
  - Запланированные задачи

## 📁 Структура проекта

```
ai-bot-project/
├── src/
│   ├── ai/
│   │   ├── model.ts         # AI модели (Ollama, OpenAI, Local)
│   │   └── processor.ts     # Обработка сообщений
│   ├── bot/
│   │   ├── index.ts         # Главный файл
│   │   ├── twitter.ts       # Twitter бот
│   │   └── web.ts           # Веб-сервер с чатом
│   ├── config/
│   │   └── index.ts         # Конфигурация
│   └── utils/
│       └── helpers.ts       # Вспомогательные функции
├── .github/
│   └── workflows/
│       ├── twitter-integration.yml  # GitHub Actions для Twitter
│       └── web-integration.yml      # GitHub Actions для веба
├── tests/
│   ├── bot.test.ts
│   └── ai.test.ts
├── .env.example             # Пример конфигурации
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Быстрый старт

### 1. Установка

```bash
# Клонируйте репозиторий
git clone https://github.com/yourusername/ai-bot-project.git
cd ai-bot-project

# Установите зависимости
npm install

# Скопируйте пример конфигурации
cp .env.example .env
```

### 2. Настройка локального AI (Ollama)

**Самый простой способ - использовать локальную AI модель:**

```bash
# Установите Ollama (https://ollama.ai)
# Windows: скачайте установщик с сайта
# macOS: brew install ollama
# Linux: curl https://ollama.ai/install.sh | sh

# Запустите Ollama
ollama serve

# Скачайте модель (в другом терминале)
ollama pull llama2
```

Настройте `.env`:
```env
BOT_MODE=web
AI_PROVIDER=ollama
AI_MODEL_NAME=llama2
```

### 3. Запуск

```bash
# Режим разработки (веб-чат)
npm run dev

# Или скомпилировать и запустить
npm run build
npm start
```

Откройте браузер: http://localhost:3000

## 🎯 Режимы работы

### Веб-чат (рекомендуется для начала)

```bash
# В .env установите:
BOT_MODE=web
AI_PROVIDER=ollama  # или local для демо

# Запустите
npm run dev:web
```

Функции:
- Красивый UI для общения с AI
- REST API endpoints
- История чатов

### Twitter бот

```bash
# Получите API ключи на https://developer.twitter.com
# В .env установите:
BOT_MODE=twitter
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_token_secret

# Запустите
npm run dev:twitter

# Опубликовать AI-твит
npm start -- --post "Напиши интересный факт о космосе"
```

## 🔧 Конфигурация AI

### Ollama (локально, бесплатно) ⭐ Рекомендуется

```env
AI_PROVIDER=ollama
AI_MODEL_NAME=llama2  # или mistral, codellama, phi
OLLAMA_BASE_URL=http://localhost:11434
```

**Доступные модели:**
- `llama2` - универсальная модель (7GB)
- `mistral` - быстрая и умная (4GB)
- `codellama` - для программирования (7GB)
- `phi` - маленькая, но эффективная (1.6GB)

```bash
# Скачать другие модели
ollama pull mistral
ollama pull codellama
ollama pull phi
```

### OpenAI (платно, но мощно)

```env
AI_PROVIDER=openai
AI_MODEL_NAME=gpt-3.5-turbo  # или gpt-4
OPENAI_API_KEY=sk-...
```

### Local (демо, для тестирования)

```env
AI_PROVIDER=local
```

Простая модель на правилах, не требует ничего.

## 🐙 GitHub Actions

### Настройка секретов

Добавьте в GitHub: `Settings → Secrets and variables → Actions`

**Для Twitter бота:**
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`
- `AI_PROVIDER` (опционально: ollama, openai, local)

**Для OpenAI:**
- `OPENAI_API_KEY`

### Автоматическая публикация твитов

Workflow запускается:
- При push в `main`
- Каждый час (cron)
- Вручную через GitHub Actions UI

```yaml
# .github/workflows/twitter-integration.yml
# Можно запустить вручную и передать текст для твита
```

## 📚 API Endpoints (веб-режим)

### GET /
Веб-интерфейс для чата

### GET /health
Проверка здоровья бота
```json
{
  "status": "ok",
  "ai": "healthy",
  "timestamp": 1234567890
}
```

### POST /api/chat
Отправить сообщение боту
```json
{
  "message": "Привет, как дела?",
  "sessionId": "optional-session-id"
}
```

Response:
```json
{
  "response": "Привет! Отлично, спасибо!",
  "sessionId": "session-123",
  "timestamp": 1234567890
}
```

### GET /api/chat/history/:sessionId
Получить историю чата

### DELETE /api/chat/history/:sessionId
Очистить историю

## 🎓 Как писать таких ботов

### 1. Основы архитектуры

Бот состоит из трех слоев:
1. **AI Layer** (`src/ai/`) - логика нейросети
2. **Bot Layer** (`src/bot/`) - интеграции (Twitter, веб)
3. **Config Layer** (`src/config/`) - настройки

### 2. Добавление нового провайдера AI

```typescript
// src/ai/model.ts
private async generateWithYourProvider(prompt: string): Promise<string> {
    // Ваша логика
    return response;
}
```

### 3. Добавление новой платформы

Создайте файл `src/bot/yourplatform.ts`:
```typescript
import { AIProcessor } from '../ai/processor';

export class YourPlatformBot {
    private processor: AIProcessor;
    
    constructor(config: YourConfig) {
        this.processor = new AIProcessor(config.processorConfig);
    }
    
    async handleMessage(message: string) {
        const response = await this.processor.processMessage(message);
        // Отправьте ответ в вашу платформу
    }
}
```

### 4. Полезные ресурсы

- **Ollama:** https://ollama.ai - локальные AI модели
- **Twitter API:** https://developer.twitter.com
- **OpenAI API:** https://platform.openai.com
- **TypeScript:** https://www.typescriptlang.org

## 🔍 Примеры использования

### Пример 1: Простой чат-бот

```typescript
import { AIProcessor } from './src/ai/processor';

const processor = new AIProcessor({
    modelConfig: {
        provider: 'ollama',
        modelName: 'llama2'
    }
});

const response = await processor.processMessage('Привет!');
console.log(response);
```

### Пример 2: Twitter бот с авто-ответами

```typescript
const bot = new TwitterBot({
    // ... ваши ключи
    replyToMentions: true,
    autoReply: true
});

await bot.initialize();
await bot.startListening();
```

### Пример 3: Веб-сервер

```typescript
const bot = new WebBot({
    port: 3000,
    processorConfig: { /* ... */ }
});

await bot.start();
```

## 🛠️ Разработка

```bash
# Установка зависимостей
npm install

# Разработка с hot-reload
npm run dev

# Линтинг
npm run lint

# Тесты
npm test

# Сборка
npm run build

# Запуск продакшн
npm start
```

## 🐛 Troubleshooting

### Ollama не подключается
```bash
# Проверьте, что Ollama запущен
curl http://localhost:11434/api/tags

# Или перезапустите
ollama serve
```

### Twitter API ошибки
- Проверьте права доступа в Twitter Developer Portal
- Нужен Elevated access для некоторых функций
- Убедитесь, что используете OAuth 1.0a

### Порт занят
```bash
# Измените порт в .env
WEB_PORT=3001
```

## 📄 Лицензия

MIT License - делайте что хотите!

## 🤝 Contributing

Pull requests приветствуются! Для больших изменений сначала создайте issue.

## 📬 Контакты

Есть вопросы? Создайте issue на GitHub!

---

**Удачи в создании своего AI-бота! 🚀**
