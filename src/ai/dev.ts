import { config } from 'dotenv';
config();

import '@/ai/flows/answer-vulnerability-questions.ts';
import '@/ai/flows/generate-defectdojo-queries.ts';
import '@/ai/flows/get-kpi-data.ts';
import '@/ai/flows/get-product-kpi-data.ts';
