import { TwitterApi, TwitterApiReadWrite, ETwitterStreamEvent, TweetV2SingleStreamResult } from 'twitter-api-v2';
import { AIProcessor, ProcessorConfig } from '../ai/processor';

export interface TwitterBotConfig {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
    processorConfig: ProcessorConfig;
    autoReply?: boolean;
    replyToMentions?: boolean;
}

export class TwitterBot {
    private client: TwitterApi;
    private rwClient: TwitterApiReadWrite;
    private processor: AIProcessor;
    private config: TwitterBotConfig;
    private botUserId?: string;

    constructor(config: TwitterBotConfig) {
        this.config = {
            autoReply: true,
            replyToMentions: true,
            ...config
        };

        // Создаем клиент с полными правами (для чтения и записи)
        this.client = new TwitterApi({
            appKey: config.apiKey,
            appSecret: config.apiSecret,
            accessToken: config.accessToken,
            accessSecret: config.accessSecret,
        });

        this.rwClient = this.client.readWrite;
        this.processor = new AIProcessor(config.processorConfig);
    }

    /**
     * Инициализация бота
     */
    public async initialize(): Promise<void> {
        try {
            const user = await this.rwClient.v2.me();
            this.botUserId = user.data.id;
            console.log(`✅ Twitter бот авторизован как @${user.data.username} (ID: ${this.botUserId})`);
            
            // Проверяем работоспособность AI
            const aiHealthy = await this.processor.checkHealth();
            if (aiHealthy) {
                console.log('✅ AI модель готова к работе');
            } else {
                console.log('⚠️  AI модель может быть недоступна');
            }
        } catch (error) {
            console.error('❌ Ошибка авторизации Twitter:', error);
            throw error;
        }
    }

    /**
     * Публикация твита
     */
    public async postTweet(content: string, replyToTweetId?: string): Promise<void> {
        try {
            const tweetData: any = { text: content };
            
            if (replyToTweetId) {
                tweetData.reply = { in_reply_to_tweet_id: replyToTweetId };
            }

            const tweet = await this.rwClient.v2.tweet(tweetData);
            console.log('✅ Твит опубликован:', tweet.data.id);
        } catch (error: any) {
            console.error('❌ Ошибка публикации твита:', error.message);
            throw error;
        }
    }

    /**
     * Генерация и публикация AI-твита
     */
    public async postAITweet(prompt: string): Promise<void> {
        try {
            const tweetContent = await this.processor.processMessage(prompt);
            
            // Twitter лимит - 280 символов
            const truncatedContent = tweetContent.length > 280 
                ? tweetContent.substring(0, 277) + '...'
                : tweetContent;
            
            await this.postTweet(truncatedContent);
        } catch (error: any) {
            console.error('❌ Ошибка создания AI-твита:', error.message);
            throw error;
        }
    }

    /**
     * Начать слушать упоминания бота
     */
    public async startListening(): Promise<void> {
        if (!this.config.replyToMentions) {
            console.log('⏸️  Автоответы на упоминания отключены');
            return;
        }

        try {
            console.log('👂 Начинаю слушать упоминания...');
            
            // Получаем правила стрима
            const rules = await this.rwClient.v2.streamRules();
            
            // Удаляем старые правила
            if (rules.data?.length) {
                await this.rwClient.v2.updateStreamRules({
                    delete: { ids: rules.data.map(rule => rule.id) }
                });
            }

            // Добавляем новое правило для отслеживания упоминаний
            const user = await this.rwClient.v2.me();
            await this.rwClient.v2.updateStreamRules({
                add: [{ value: `@${user.data.username}`, tag: 'mentions' }]
            });

            // Начинаем стрим
            const stream = await this.rwClient.v2.searchStream({
                'tweet.fields': ['referenced_tweets', 'author_id'],
                'expansions': ['referenced_tweets.id']
            });

            stream.on(ETwitterStreamEvent.Data, async (tweet: TweetV2SingleStreamResult) => {
                await this.handleMention(tweet);
            });

            stream.on(ETwitterStreamEvent.Error, (error) => {
                console.error('❌ Ошибка стрима:', error);
            });

            console.log('✅ Бот слушает упоминания');
        } catch (error: any) {
            console.error('❌ Ошибка запуска прослушивания:', error.message);
            throw error;
        }
    }

    /**
     * Обработка упоминания
     */
    private async handleMention(tweet: TweetV2SingleStreamResult): Promise<void> {
        try {
            // Не отвечаем на собственные твиты
            if (tweet.data.author_id === this.botUserId) {
                return;
            }

            console.log(`📨 Получено упоминание: ${tweet.data.text}`);

            // Генерируем ответ с помощью AI
            const response = await this.processor.processMessage(tweet.data.text);
            
            // Отправляем ответ
            await this.postTweet(response, tweet.data.id);
            
            console.log(`✅ Отправлен ответ на твит ${tweet.data.id}`);
        } catch (error: any) {
            console.error('❌ Ошибка обработки упоминания:', error.message);
        }
    }

    /**
     * Получить последние твиты из таймлайна
     */
    public async getHomeTimeline(count: number = 10): Promise<any[]> {
        try {
            const timeline = await this.rwClient.v2.homeTimeline({
                max_results: count
            });
            
            return timeline.data.data || [];
        } catch (error: any) {
            console.error('❌ Ошибка получения таймлайна:', error.message);
            return [];
        }
    }
}