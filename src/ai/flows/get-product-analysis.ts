'use server';
/**
 * @fileOverview An AI flow to generate a detailed analysis of a single product's vulnerabilities.
 *
 * - getProductAnalysis - A function that creates a detailed summary for a product.
 * - GetProductAnalysisInput - The input type for the getProductAnalysis function.
 * - GetProductAnalysisOutput - The return type for the getProductAnalysis function.
 */

import { ai } from '@/ai/genkit';
import { getFindings } from '@/services/defectdojo';
import { z } from 'genkit';

const GetProductAnalysisInputSchema = z.object({
  productName: z.string().describe('The name of the product to analyze.'),
});
export type GetProductAnalysisInput = z.infer<typeof GetProductAnalysisInputSchema>;

const GetProductAnalysisOutputSchema = z.object({
  analysis: z.string().describe('A detailed, AI-generated analysis of the product vulnerabilities in Markdown format.'),
});
export type GetProductAnalysisOutput = z.infer<typeof GetProductAnalysisOutputSchema>;

const AnalysisPromptInputSchema = z.object({
  productName: z.string(),
  findingsJson: z.string(),
});

/**
 * Wraps the Genkit flow to be used as a Server Action.
 */
export async function getProductAnalysis(input: GetProductAnalysisInput): Promise<GetProductAnalysisOutput> {
  return getProductAnalysisFlow(input);
}

const analysisPrompt = ai.definePrompt({
  name: 'productAnalysisPrompt',
  input: { schema: AnalysisPromptInputSchema },
  output: { format: 'markdown' },
  prompt: `You are an expert cybersecurity analyst. Your task is to create a high-level summary and action plan for a given product based on a JSON list of its vulnerabilities.

**Product Name**: {{{productName}}}

**Vulnerabilities JSON**:
\`\`\`json
{{{findingsJson}}}
\`\`\`

**Your Task:**
1.  **Analyze and Group:** Read through all the findings. Identify common components (e.g., 'openssl', 'libxml2', 'linux_kernel') that have multiple vulnerabilities.
2.  **Summarize:** Write a narrative summary. Start with a friendly, conversational opening. State the total number of critical and high findings you were given.
3.  **Structure the Report:**
    *   Use **bold text** for headings like "**Critical & High Findings Summary**" and "**Immediate Actions Required**". Do not use Markdown '#', '##', etc.
    *   For each component (or individual finding if it's unique), create a bold, numbered list item (e.g., "**1. OpenSSL Component**").
    *   Under each component, use bullet points (-) to list the key details for each vulnerability: Finding ID, Issue/Title, CVSS score, and Impact.
    *   If you group multiple findings under one component, list each one as a sub-bullet.
4.  **Create Actionable Recommendations:** Under "**Immediate Actions Required**", provide a bulleted list of clear, high-level steps. For example: "Upgrade OpenSSL to version X.X.X or later."
5.  **Maintain Persona:** Your tone should be that of a helpful, expert security analyst presenting a clear, actionable report. Conclude with a friendly closing remark.

**Example of Perfect Output:**

Certainly! I've analyzed the vulnerabilities for **Dojo-Shop**. I found a total of 12 critical and high findings. Here is a summary:

**Critical & High Findings Summary**

**1. libcurl Component (Critical)**
- **Finding ID**: 1234
- **Issue**: Use-after-free in TLS handshake.
- **CVSS**: 9.8
- **Impact**: Potential for remote code execution.

**2. OpenSSL Component (Multiple High Vulnerabilities)**
- The following issues impact version 1.1.1g:
  - **Finding ID**: 5678 - CVE-2023-XXXX (Denial of Service) - **CVSS**: 7.5
  - **Finding ID**: 5679 - CVE-2023-YYYY (Information Disclosure) - **CVSS**: 7.5

**Immediate Actions Required**
- Upgrade **libcurl** to the latest patched version.
- Upgrade **OpenSSL** to version 1.1.1k or later to address both listed vulnerabilities.
- Review application configurations to ensure TLS 1.3 is enforced.

Let me know if you need a more detailed breakdown of any of these items!
`,
});

const getProductAnalysisFlow = ai.defineFlow(
  {
    name: 'getProductAnalysisFlow',
    inputSchema: GetProductAnalysisInputSchema,
    outputSchema: GetProductAnalysisOutputSchema,
  },
  async (input) => {
    // 1. Get critical and high findings for the product, but limit the amount to avoid token overload.
    const criticalFindingsPromise = getFindings({ productName: input.productName, severity: 'Critical', limit: 100, active: true });
    const highFindingsPromise = getFindings({ productName: input.productName, severity: 'High', limit: 100, active: true });

    const [criticalResult, highResult] = await Promise.all([criticalFindingsPromise, highFindingsPromise]);
    
    // Check for errors in the results before parsing
    let criticalData: any = { findings: [] };
    try {
        criticalData = JSON.parse(criticalResult);
        if (criticalData.error) {
            console.warn(`Could not fetch critical findings for ${input.productName}: ${criticalData.error}`);
            criticalData.findings = [];
        }
    } catch(e) { /* ignore parse error */ }
   
    let highData: any = { findings: [] };
    try {
        highData = JSON.parse(highResult);
        if (highData.error) {
            console.warn(`Could not fetch high findings for ${input.productName}: ${highData.error}`);
            highData.findings = [];
        }
    } catch(e) { /* ignore parse error */ }


    // Combine findings, ensuring they are arrays
    const allFindings = [
        ...(Array.isArray(criticalData.findings) ? criticalData.findings : []),
        ...(Array.isArray(highData.findings) ? highData.findings : [])
    ];
    
    if (allFindings.length === 0) {
        return { analysis: `No active critical or high severity vulnerabilities were found for **${input.productName}**.`};
    }

    // 2. Pass the findings to the AI for analysis
    const { output } = await analysisPrompt({
        productName: input.productName,
        findingsJson: JSON.stringify(allFindings, null, 2),
    });
    
    return {
        analysis: output || "Could not generate an analysis for the product.",
    };
  }
);
