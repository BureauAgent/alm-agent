import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedAccountData } from '@solana/web3.js';
import axios from 'axios';

export interface SolanaConfig {
    rpcUrl?: string;
    network?: 'mainnet' | 'devnet' | 'testnet';
}

export interface TokenBalance {
    mint: string;
    amount: string;
    decimals: number;
    uiAmount: number;
    symbol?: string;
    name?: string;
    logo?: string;
}

export interface WalletInfo {
    address: string;
    balance: number; // SOL
    tokens: TokenBalance[];
}

export interface TokenPrice {
    symbol: string;
    price: number;
    priceChange24h?: number;
}

export class SolanaAgent {
    private connection: Connection;
    private config: SolanaConfig;

    constructor(config: SolanaConfig = {}) {
        this.config = {
            network: 'mainnet',
            rpcUrl: config.rpcUrl || 'https://api.mainnet-beta.solana.com',
            ...config
        };

        this.connection = new Connection(this.config.rpcUrl!, 'confirmed');
    }

    /**
     * Получить баланс SOL кошелька
     */
    async getBalance(address: string): Promise<number> {
        try {
            const publicKey = new PublicKey(address);
            const balance = await this.connection.getBalance(publicKey);
            return balance / LAMPORTS_PER_SOL;
        } catch (error: any) {
            throw new Error(`Ошибка получения баланса: ${error.message}`);
        }
    }

    /**
     * Получить все токены кошелька
     */
    async getTokenBalances(address: string): Promise<TokenBalance[]> {
        try {
            const publicKey = new PublicKey(address);
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                publicKey,
                { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
            );

            const tokens: TokenBalance[] = [];

            for (const { account } of tokenAccounts.value) {
                const parsedInfo = (account.data as ParsedAccountData).parsed.info;
                const tokenBalance: TokenBalance = {
                    mint: parsedInfo.mint,
                    amount: parsedInfo.tokenAmount.amount,
                    decimals: parsedInfo.tokenAmount.decimals,
                    uiAmount: parsedInfo.tokenAmount.uiAmount || 0
                };

                // Пропускаем токены с нулевым балансом
                if (tokenBalance.uiAmount > 0) {
                    tokens.push(tokenBalance);
                }
            }

            return tokens;
        } catch (error: any) {
            throw new Error(`Ошибка получения токенов: ${error.message}`);
        }
    }

    /**
     * Получить полную информацию о кошельке
     */
    async getWalletInfo(address: string): Promise<WalletInfo> {
        try {
            const [balance, tokens] = await Promise.all([
                this.getBalance(address),
                this.getTokenBalances(address)
            ]);

            return {
                address,
                balance,
                tokens
            };
        } catch (error: any) {
            throw new Error(`Ошибка получения информации о кошельке: ${error.message}`);
        }
    }

    /**
     * Получить последние транзакции
     */
    async getRecentTransactions(address: string, limit: number = 10): Promise<any[]> {
        try {
            const publicKey = new PublicKey(address);
            const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
            
            const transactions = [];
            for (const sig of signatures) {
                transactions.push({
                    signature: sig.signature,
                    slot: sig.slot,
                    timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
                    status: sig.err ? 'failed' : 'success'
                });
            }

            return transactions;
        } catch (error: any) {
            throw new Error(`Ошибка получения транзакций: ${error.message}`);
        }
    }

    /**
     * Получить цену токена от Jupiter API v6
     */
    async getTokenPrice(mintAddress: string): Promise<TokenPrice | null> {
        try {
            const response = await axios.get(
                `https://api.jup.ag/price/v2?ids=${mintAddress}`,
                { timeout: 5000 }
            );
            
            if (response.data && response.data.data && response.data.data[mintAddress]) {
                const priceData = response.data.data[mintAddress];
                return {
                    symbol: priceData.mintSymbol || 'Unknown',
                    price: parseFloat(priceData.price) || 0,
                    priceChange24h: 0
                };
            }

            return null;
        } catch (error: any) {
            console.error(`Ошибка Jupiter API: ${error.message}`);
            return null;
        }
    }

    /**
     * Получить цены популярных токенов через CoinGecko (бесплатно, без ключа)
     */
    async getPopularTokens(): Promise<TokenPrice[]> {
        // Попытка 1: CoinGecko API
        try {
            const cgIds = 'solana,usd-coin,tether,bonk,jupiter-exchange-solana';
            const response = await axios.get(
                `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`,
                { timeout: 8000 }
            );
            
            const data = response.data;
            const mapping: Record<string, string> = {
                'solana': 'SOL',
                'usd-coin': 'USDC',
                'tether': 'USDT',
                'bonk': 'BONK',
                'jupiter-exchange-solana': 'JUP'
            };

            const prices: TokenPrice[] = [];
            for (const [cgId, symbol] of Object.entries(mapping)) {
                if (data[cgId]) {
                    prices.push({
                        symbol,
                        price: data[cgId].usd || 0,
                        priceChange24h: data[cgId].usd_24h_change || 0
                    });
                }
            }

            if (prices.length > 0) {
                return prices;
            }
        } catch (err: any) {
            console.error(`CoinGecko API недоступен: ${err.message}`);
        }

        // Попытка 2: Jupiter v6 API (все токены за один запрос)
        try {
            const mints = [
                'So11111111111111111111111111111111111111112',   // SOL
                'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
                'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',  // USDT
                'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  // BONK
                'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'   // JUP
            ];
            const symbols = ['SOL', 'USDC', 'USDT', 'BONK', 'JUP'];

            const response = await axios.get(
                `https://api.jup.ag/price/v2?ids=${mints.join(',')}`,
                { timeout: 8000 }
            );

            if (response.data && response.data.data) {
                const prices: TokenPrice[] = [];
                mints.forEach((mint, i) => {
                    const pd = response.data.data[mint];
                    if (pd) {
                        prices.push({
                            symbol: symbols[i],
                            price: parseFloat(pd.price) || 0,
                            priceChange24h: 0
                        });
                    }
                });

                if (prices.length > 0) return prices;
            }
        } catch (err: any) {
            console.error(`Jupiter API недоступен: ${err.message}`);
        }

        // Fallback: данные недоступны
        return [
            { symbol: 'SOL', price: 0, priceChange24h: 0 },
            { symbol: 'USDC', price: 0, priceChange24h: 0 },
            { symbol: 'USDT', price: 0, priceChange24h: 0 },
            { symbol: 'BONK', price: 0, priceChange24h: 0 },
            { symbol: 'JUP', price: 0, priceChange24h: 0 }
        ];
    }

    /**
     * Проверить валидность адреса
     */
    isValidAddress(address: string): boolean {
        try {
            new PublicKey(address);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Получить информацию о текущем блоке
     */
    async getNetworkStatus(): Promise<{ slot: number; blockTime: number }> {
        try {
            const slot = await this.connection.getSlot();
            const blockTime = await this.connection.getBlockTime(slot);
            
            return {
                slot,
                blockTime: blockTime || 0
            };
        } catch (error: any) {
            throw new Error(`Ошибка получения статуса сети: ${error.message}`);
        }
    }

    /**
     * Форматирование ответа для AI
     */
    formatWalletInfoForAI(walletInfo: WalletInfo): string {
        let response = `**Кошелёк:** \`${walletInfo.address}\`\n\n`;
        response += `**Баланс SOL:** ${walletInfo.balance.toFixed(4)} SOL\n\n`;

        if (walletInfo.tokens.length > 0) {
            response += `**Токены (${walletInfo.tokens.length}):**\n`;
            walletInfo.tokens.slice(0, 10).forEach(token => {
                response += `• ${token.uiAmount.toFixed(4)} (Mint: ${token.mint.slice(0, 8)}...)\n`;
            });

            if (walletInfo.tokens.length > 10) {
                response += `\n_...и ещё ${walletInfo.tokens.length - 10} токенов_\n`;
            }
        } else {
            response += `**Токенов не найдено**\n`;
        }

        return response;
    }

    /**
     * Форматирование транзакций для AI
     */
    formatTransactionsForAI(transactions: any[]): string {
        if (transactions.length === 0) {
            return 'Транзакций не найдено.';
        }

        let response = `**Последние ${transactions.length} транзакций:**\n\n`;
        
        transactions.forEach((tx, index) => {
            response += `${index + 1}. ${tx.status === 'success' ? '[ok]' : '[fail]'} `;
            response += `[${tx.signature.slice(0, 8)}...](https://solscan.io/tx/${tx.signature})`;
            if (tx.timestamp) {
                const date = new Date(tx.timestamp);
                response += ` - ${date.toLocaleString('ru-RU')}`;
            }
            response += `\n`;
        });

        return response;
    }
}
