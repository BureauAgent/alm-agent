import { TwitterBot } from '../src/bot/twitter';
import { WebBot } from '../src/bot/web';

describe('Bot Integration Tests', () => {
    let twitterBot: TwitterBot;
    let webBot: WebBot;

    beforeAll(() => {
        twitterBot = new TwitterBot();
        webBot = new WebBot();
    });

    test('TwitterBot should authenticate successfully', async () => {
        const result = await twitterBot.authenticate();
        expect(result).toBe(true);
    });

    test('TwitterBot should post a tweet successfully', async () => {
        const tweet = 'Hello, Twitter!';
        const result = await twitterBot.postTweet(tweet);
        expect(result).toBe(true);
    });

    test('WebBot should make a successful API call', async () => {
        const response = await webBot.callApi('https://api.example.com/data');
        expect(response).toHaveProperty('data');
    });

    test('WebBot should handle API errors gracefully', async () => {
        await expect(webBot.callApi('https://api.example.com/invalid')).rejects.toThrow('API call failed');
    });
});