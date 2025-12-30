import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const OPENAI_API_KEY = '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';

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API key...');
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: 'Hello, are you working?',
    });
    console.log('Success! Response:', text);
  } catch (error) {
    console.error('Error testing OpenAI API:', error);
  }
}

testOpenAI();
