/**
 * Форматирование данных в JSON строку
 */
export function formatResponse(data: any): string {
    return JSON.stringify(data, null, 2);
}

/**
 * Логирование ошибок
 */
export function logError(error: Error): void {
    console.error(`[ERROR] ${new Date().toISOString()}: ${error.message}`);
    if (error.stack) {
        console.error(error.stack);
    }
}

/**
 * Логирование информации
 */
export function logInfo(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    if (data) {
        console.log(`[INFO] ${timestamp}: ${message}`, data);
    } else {
        console.log(`[INFO] ${timestamp}: ${message}`);
    }
}

/**
 * Обрезка текста до максимальной длины
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Задержка (для rate limiting)
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Очистка текста от специальных символов
 */
export function sanitizeText(text: string): string {
    return text
        .replace(/[<>]/g, '') // Убираем HTML теги
        .replace(/\u0000/g, '') // Убираем null bytes
        .trim();
}

/**
 * Проверка, является ли строка валидным URL
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Извлечение хештегов из текста
 */
export function extractHashtags(text: string): string[] {
    const hashtags = text.match(/#[\w\u0400-\u04FF]+/g);
    return hashtags ? hashtags.map(tag => tag.toLowerCase()) : [];
}

/**
 * Извлечение упоминаний из текста
 */
export function extractMentions(text: string): string[] {
    const mentions = text.match(/@[\w]+/g);
    return mentions ? mentions.map(mention => mention.substring(1)) : [];
}

/**
 * Форматирование времени работы
 */
export function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}д`);
    if (hours > 0) parts.push(`${hours}ч`);
    if (minutes > 0) parts.push(`${minutes}м`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}с`);

    return parts.join(' ');
}

/**
 * Retry функция с экспоненциальным backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            if (attempt < maxRetries - 1) {
                const delayTime = baseDelay * Math.pow(2, attempt);
                logInfo(`Попытка ${attempt + 1} не удалась, повтор через ${delayTime}мс...`);
                await delay(delayTime);
            }
        }
    }

    throw lastError || new Error('Все попытки исчерпаны');
}