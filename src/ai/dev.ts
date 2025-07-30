import { config } from 'dotenv';
config();

// We only need to import the chatbot flow here for local development.
// The KPI flows are now just regular functions and don't need to be registered with Genkit.
import '@/ai/flows/answer-vulnerability-questions.ts';
