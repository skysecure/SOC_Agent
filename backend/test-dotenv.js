import dotenv from 'dotenv';

console.log('Before dotenv.config():');
console.log('AI_PROVIDER:', process.env.AI_PROVIDER || 'undefined');

console.log('\nLoading dotenv...');
dotenv.config();

console.log('\nAfter dotenv.config():');
console.log('AI_PROVIDER:', process.env.AI_PROVIDER || 'undefined');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

console.log('\n.env file path:', process.cwd() + '/.env');
console.log('Current working directory:', process.cwd());
