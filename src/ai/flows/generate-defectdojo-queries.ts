'use server';
/**
 * @fileOverview AI agent that generates customized DefectDojo queries based on past successful queries and user-specific parameters.
 *
 * - generateDefectDojoQueries - A function that generates DefectDojo queries.
 * - GenerateDefectDojoQueriesInput - The input type for the generateDefectDojoQueries function.
 * - GenerateDefectDojoQueriesOutput - The return type for the generateDefectDojoQueries function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDefectDojoQueriesInputSchema = z.object({
  pastQueries: z.array(z.string()).describe('An array of past successful DefectDojo queries.'),
  userParameters: z.record(z.string()).describe('A record of user-specific parameters to customize the query.'),
  queryDescription: z.string().describe('The description of the query to generate.')
});
export type GenerateDefectDojoQueriesInput = z.infer<typeof GenerateDefectDojoQueriesInputSchema>;

const GenerateDefectDojoQueriesOutputSchema = z.object({
  query: z.string().describe('The generated DefectDojo query.'),
});
export type GenerateDefectDojoQueriesOutput = z.infer<typeof GenerateDefectDojoQueriesOutputSchema>;

export async function generateDefectDojoQueries(input: GenerateDefectDojoQueriesInput): Promise<GenerateDefectDojoQueriesOutput> {
  return generateDefectDojoQueriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDefectDojoQueriesPrompt',
  input: {schema: GenerateDefectDojoQueriesInputSchema},
  output: {schema: GenerateDefectDojoQueriesOutputSchema},
  prompt: `You are an expert in generating DefectDojo queries based on past successful queries and user-specific parameters. You will use the information to generate a customized DefectDojo query.

Past Successful Queries:
{{#each pastQueries}}
- {{{this}}}
{{/each}}

User-Specific Parameters:
{{#each (Object.entries userParameters) key="@key"}}
- {{@key}}: {{{this}}}
{{/each}}

Description of the query to generate:
{{{queryDescription}}}

Generate a DefectDojo query that satisfies the description, using the user-specific parameters and drawing inspiration from past successful queries. Return only the query.
`,
});

const generateDefectDojoQueriesFlow = ai.defineFlow(
  {
    name: 'generateDefectDojoQueriesFlow',
    inputSchema: GenerateDefectDojoQueriesInputSchema,
    outputSchema: GenerateDefectDojoQueriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
