
'use server';
/**
 * @fileOverview A flow to get detailed KPI data for a specific product.
 *
 * - getProductKpiData - A function that aggregates vulnerability metrics for one product.
 * - ProductKpiData - The return type for the getProductKpiData function.
 */
import {z} from 'genkit';
import {ai} from '@/ai/genkit';
import { getVulnerabilityCountsByProduct, getFindings } from '@/services/defectdojo';

const ProductKpiDataSchema = z.object({
  severityCounts: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
    info: z.number(),
    total: z.number(),
  }),
  topCriticalFindings: z.array(z.object({
      id: z.number(),
      title: z.string(),
      severity: z.string(),
      cwe: z.string(),
  }))
});
export type ProductKpiData = z.infer<typeof ProductKpiDataSchema>;

const ProductKpiInputSchema = z.object({
    productName: z.string(),
});
export type ProductKpiInput = z.infer<typeof ProductKpiInputSchema>;


export async function getProductKpiData(input: ProductKpiInput): Promise<ProductKpiData> {
  return getProductKpiDataFlow(input);
}

const getProductKpiDataFlow = ai.defineFlow(
  {
    name: 'getProductKpiDataFlow',
    inputSchema: ProductKpiInputSchema,
    outputSchema: ProductKpiDataSchema,
  },
  async ({productName}) => {
    
    // 1. Get severity counts for the product
    const severityCounts = await getVulnerabilityCountsByProduct(productName);

    // 2. Get top 5 critical findings
    const criticalFindingsRaw = await getFindings(productName, 'Critical', true, 5);
    const criticalFindingsData = JSON.parse(criticalFindingsRaw);

    const topCriticalFindings = criticalFindingsData.findings ? criticalFindingsData.findings.map((f: any) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        cwe: f.cwe
    })) : [];

    return {
        severityCounts,
        topCriticalFindings
    };
  }
);
