import { SolanaAgent } from './agent';
import { AIProcessor } from '../ai/processor';
import { SAPProtocol } from '../agent-protocol';

export interface SolanaCommandResult {
    success: boolean;
    message: string;
    data?: any;
}

export class SolanaCommandHandler {
    private solanaAgent: SolanaAgent;
    private sapProtocol?: SAPProtocol;

    constructor(solanaConfig?: any, sapProtocol?: SAPProtocol) {
        this.solanaAgent = new SolanaAgent(solanaConfig);
        this.sapProtocol = sapProtocol;
    }

    /**
     * Определить, является ли сообщение командой Solana
     */
    isSolanaCommand(message: string): boolean {
        const lowerMessage = message.toLowerCase();
        
        const keywords = [
            // Wallet / Balance
            'кошелек', 'кошелёк', 'wallet', 'баланс', 'balance',
            // Tokens
            'токен', 'token',
            // Transactions
            'транзакц', 'transaction', 'история', 'history',
            // Solana / NFT
            'solana', 'sol', 'nft',
            // Prices (цен = prefix for цена/цены/курс)
            'цен', 'price', 'курс',
            // Address
            'адрес', 'address',
            // Network / Status
            'сеть', 'network', 'статус', 'status', 'slot',
            // SAP Protocol keywords
            'protocol', 'протокол', 'agent', 'агент',
            'skill', 'навык', 'openclaw', 'sap'
        ];

        return keywords.some(keyword => lowerMessage.includes(keyword));
    }

    /**
     * Обработать команду Solana
     */
    async handleCommand(message: string): Promise<SolanaCommandResult> {
        const lowerMessage = message.toLowerCase();

        try {
            // Проверка баланса кошелька
            if (lowerMessage.includes('баланс') || lowerMessage.includes('balance') || lowerMessage.includes('кошелек') || lowerMessage.includes('кошелёк') || lowerMessage.includes('wallet')) {
                const address = this.extractAddress(message);
                if (!address) {
                    return {
                        success: false,
                        message: 'Пожалуйста, укажите адрес кошелька. Например: "Покажи баланс 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"'
                    };
                }

                if (!this.solanaAgent.isValidAddress(address)) {
                    return {
                        success: false,
                        message: 'Неверный адрес кошелька. Проверьте правильность адреса.'
                    };
                }

                const walletInfo = await this.solanaAgent.getWalletInfo(address);
                const formattedInfo = this.solanaAgent.formatWalletInfoForAI(walletInfo);

                return {
                    success: true,
                    message: formattedInfo,
                    data: walletInfo
                };
            }

            // Получение транзакций
            if (lowerMessage.includes('транзакц') || lowerMessage.includes('transaction') || lowerMessage.includes('история')) {
                const address = this.extractAddress(message);
                if (!address) {
                    return {
                        success: false,
                        message: 'Укажите адрес для просмотра транзакций.'
                    };
                }

                if (!this.solanaAgent.isValidAddress(address)) {
                    return {
                        success: false,
                        message: 'Неверный адрес кошелька.'
                    };
                }

                const transactions = await this.solanaAgent.getRecentTransactions(address, 10);
                const formattedTxs = this.solanaAgent.formatTransactionsForAI(transactions);

                return {
                    success: true,
                    message: formattedTxs,
                    data: transactions
                };
            }

            // Получение цен популярных токенов
            if (lowerMessage.includes('цен') || lowerMessage.includes('price') || lowerMessage.includes('курс')) {
                const prices = await this.solanaAgent.getPopularTokens();
                
                // Проверяем, доступны ли реальные цены
                const hasPrices = prices.some(token => token.price > 0);
                
                let message = '**Popular Solana Tokens:**\n\n';
                
                if (!hasPrices) {
                    message += '_Prices temporarily unavailable (API unreachable)_\n\n';
                    message += 'Supported tokens:\n';
                    prices.forEach(token => {
                        message += `• **${token.symbol}** - Solana ecosystem token\n`;
                    });
                } else {
                    prices.forEach(token => {
                        message += `**${token.symbol}**: $${token.price.toFixed(4)}`;
                        if (token.priceChange24h !== undefined && token.priceChange24h !== 0) {
                            const sign = token.priceChange24h > 0 ? '+' : '';
                            message += ` (${sign}${token.priceChange24h.toFixed(2)}%)`;
                        }
                        message += '\n';
                    });
                }

                return {
                    success: true,
                    message,
                    data: prices
                };
            }

            // Статус сети
            if (lowerMessage.includes('сеть') || lowerMessage.includes('network') || lowerMessage.includes('статус')) {
                const status = await this.solanaAgent.getNetworkStatus();
                
                return {
                    success: true,
                    message: `**Solana Network Status:**\n\nCurrent slot: ${status.slot}\nBlock time: ${new Date(status.blockTime * 1000).toLocaleString('ru-RU')}`,
                    data: status
                };
            }

            // SAP Protocol - информация о протоколе
            if (this.sapProtocol && (lowerMessage.includes('protocol info') || lowerMessage.includes('протокол инфо') || lowerMessage.includes('sap info'))) {
                const summary = this.sapProtocol.getSummary();
                return {
                    success: true,
                    message: summary
                };
            }

            // SAP Protocol - список навыков
            if (this.sapProtocol && (lowerMessage.includes('list skills') || lowerMessage.includes('список навыков') || lowerMessage.includes('навыки агента'))) {
                const skillsSummary = this.sapProtocol.skillManager.getSummary();
                return {
                    success: true,
                    message: skillsSummary
                };
            }

            // SAP Protocol - профиль агента
            if (this.sapProtocol && (lowerMessage.includes('agent profile') || lowerMessage.includes('профиль агента') || lowerMessage.includes('мой агент'))) {
                const profileSummary = this.sapProtocol.profileManager.getSummary();
                return {
                    success: true,
                    message: profileSummary
                };
            }

            // SAP Protocol - экспорт для OpenClaw
            if (this.sapProtocol && (lowerMessage.includes('openclaw export') || lowerMessage.includes('экспорт openclaw') || lowerMessage.includes('openclaw skill'))) {
                const manifest = this.sapProtocol.createOpenClawManifest();
                return {
                    success: true,
                    message: `**OpenClaw Skill Manifest:**\n\n\`\`\`javascript\n${manifest}\n\`\`\`\n\nSave this file as \`solana-agent.js\` in your OpenClaw skills directory.`,
                    data: this.sapProtocol.exportForOpenClaw()
                };
            }

            // SAP Protocol - статистика
            if (this.sapProtocol && (lowerMessage.includes('protocol stats') || lowerMessage.includes('статистика протокол') || lowerMessage.includes('sap stats'))) {
                const stats = this.sapProtocol.getStats();
                return {
                    success: true,
                    message: `**SAP Protocol Stats:**\n\n` +
                        `Agents total: ${stats.totalAgents}\n` +
                        `Skills total: ${stats.totalSkills}\n` +
                        `Tasks total: ${stats.totalTasks}\n` +
                        `Active tasks: ${stats.activeTasks}\n` +
                        `Completed tasks: ${stats.completedTasks}\n` +
                        `Avg reputation: ${stats.averageReputation.toFixed(1)}/100`,
                    data: stats
                };
            }

            // Если команда не распознана, но похожа на Solana запрос
            const sapCommands = this.sapProtocol ? `\n**SAP Protocol команды:**\n` +
                `• "protocol info" - информация о протоколе\n` +
                `• "list skills" - список навыков агента\n` +
                `• "agent profile" - профиль агента\n` +
                `• "openclaw export" - экспорт для OpenClaw\n` +
                `• "protocol stats" - статистика протокола\n` : '';

            return {
                success: false,
                message: `**Доступные команды Solana:**\n\n` +
                    `• "Покажи баланс [адрес]" - информация о кошельке\n` +
                    `• "Транзакции [адрес]" - последние транзакции\n` +
                    `• "Цены токенов" - курсы популярных токенов\n` +
                    `• "Статус сети" - информация о сети Solana\n` +
                    sapCommands +
                    `\nПример: "Покажи баланс 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"`
            };

        } catch (error: any) {
            return {
                success: false,
                message: `Ошибка выполнения команды: ${error.message}`
            };
        }
    }

    /**
     * Извлечь Solana адрес из сообщения
     */
    private extractAddress(message: string): string | null {
        // Solana адреса это base58 строки длиной 32-44 символа
        const addressRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
        const matches = message.match(addressRegex);
        
        if (matches && matches.length > 0) {
            // Проверяем валидность найденного адреса
            for (const match of matches) {
                if (this.solanaAgent.isValidAddress(match)) {
                    return match;
                }
            }
        }

        return null;
    }

    /**
     * Получить примеры команд
     */
    getExamples(): string[] {
        return [
            'Покажи баланс 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            'Транзакции 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            'Цены токенов Solana',
            'Статус сети Solana',
            'Какой курс SOL?'
        ];
    }
}
