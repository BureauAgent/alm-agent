import { loadConfig, validateConfig } from '../config';
import { TwitterBot } from './twitter';
import { WebBot } from './web';
import { SAPProtocol } from '../agent-protocol';
import { SolanaAgent } from '../solana/agent';
import { AgentCrawler } from '../monitor/crawler';

async function main() {
    console.log('🚀 Запуск AI Bot...\n');

    // Загружаем конфигурацию
    const config = loadConfig();

    // Валидируем конфигурацию
    const errors = validateConfig(config);
    if (errors.length > 0) {
        console.error('❌ Ошибки конфигурации:');
        errors.forEach(error => console.error(`  - ${error}`));
        console.error('\n💡 Создайте файл .env на основе .env.example');
        process.exit(1);
    }

    console.log(`📋 Режим работы: ${config.mode.toUpperCase()}`);
    console.log(`🤖 AI Провайдер: ${config.ai.provider}`);
    console.log(`📦 Модель: ${config.ai.modelName}\n`);

    // Инициализация SAP Protocol (Solana Agent Protocol)
    let sapProtocol: SAPProtocol | null = null;
    if (config.sap?.enabled && config.solana?.enabled) {
        console.log('🌟 Инициализация Solana Agent Protocol (SAP)...');
        
        const solanaAgent = new SolanaAgent({
            rpcUrl: config.solana.rpcUrl || 'https://api.mainnet-beta.solana.com',
            network: config.solana.network || 'mainnet'
        });
        
        sapProtocol = new SAPProtocol(
            config.solana.rpcUrl || 'https://api.mainnet-beta.solana.com',
            solanaAgent
        );
        
        await sapProtocol.initialize({
            agentName: config.sap.agentName,
            agentDescription: config.sap.agentDescription,
            agentVersion: config.sap.agentVersion
        });
        
        console.log('');
    }

    try {
        if (config.mode === 'twitter' && config.twitter) {
            // Запуск Twitter бота
            const bot = new TwitterBot({
                apiKey: config.twitter.apiKey,
                apiSecret: config.twitter.apiSecret,
                accessToken: config.twitter.accessToken,
                accessSecret: config.twitter.accessSecret,
                processorConfig: {
                    modelConfig: config.ai,
                    systemPrompt: 'Ты дружелюбный Twitter бот. Отвечай кратко (до 280 символов) и по делу.'
                },
                autoReply: config.twitter.autoReply,
                replyToMentions: config.twitter.replyToMentions
            });

            await bot.initialize();

            // Пример: публикация AI-твита
            if (process.argv.includes('--post')) {
                const prompt = process.argv[process.argv.indexOf('--post') + 1];
                if (prompt) {
                    console.log(`\n📝 Генерация твита на основе: "${prompt}"`);
                    await bot.postAITweet(prompt);
                }
            }

            // Запуск прослушивания упоминаний
            if (config.twitter.replyToMentions) {
                await bot.startListening();
            }

            console.log('\n✅ Twitter бот запущен и готов к работе');
            console.log('👉 Используйте --post "текст промпта" для публикации AI-твита\n');

        } else if (config.mode === 'web' && config.web) {
            // Запуск веб-бота
            const bot = new WebBot({
                port: config.web.port,
                apiKey: config.web.apiKey,
                processorConfig: {
                    modelConfig: config.ai,
                    enableSolana: config.solana?.enabled,
                    solanaConfig: config.solana,
                    sapProtocol: sapProtocol || undefined
                },
                enableCors: config.web.enableCors,
                twitter: config.twitter
            });

            await bot.start();

            // Start live agent crawler
            if (sapProtocol?.isInitialized()) {
                const crawler = new AgentCrawler(sapProtocol.registry);
                (bot as any).crawler = crawler;
                crawler.start();
            }
            
            if (config.solana?.enabled) {
                console.log('🔗 Solana интеграция: ВКЛЮЧЕНА');
                console.log(`   Сеть: ${config.solana.network}`);
            }
            
            if (sapProtocol?.isInitialized()) {
                console.log('🌟 SAP Protocol: АКТИВЕН');
                console.log(`   Agent ID: ${sapProtocol.profileManager.getProfile()?.id}`);
                console.log(`   Skills: ${sapProtocol.skillManager.listSkills().length}`);
                console.log(`\n💡 Команды SAP:`);
                console.log(`   - "protocol info" - информация о протоколе`);
                console.log(`   - "list skills" - список навыков`);
                console.log(`   - "openclaw export" - экспорт для OpenClaw`);
            }
            
            console.log('\n✅ Веб-бот запущен и готов к работе\n');
        }
    } catch (error: any) {
        console.error('\n❌ Ошибка запуска бота:', error.message);
        process.exit(1);
    }
}

// Обработка ошибок
process.on('unhandledRejection', (error: any) => {
    console.error('❌ Необработанная ошибка:', error.message);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n👋 Остановка бота...');
    process.exit(0);
});

// Запуск
main().catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});