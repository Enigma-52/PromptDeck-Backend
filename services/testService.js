import { defaultOpenAIClient } from '../aiClient/index.js';
import { defaultPgDao } from '../dao/index.js';

export async function getGreeting(name) {
    const greetingName = name || 'World';
    const response = await defaultOpenAIClient.chatCompletion([
        { role: 'system', content: 'You are a friendly assistant that provides greetings.' },
        { role: 'user', content: `Generate a greeting message for ${greetingName}.` }
    ], {
        model: 'gpt-5-nano',
    });
    return response;
}