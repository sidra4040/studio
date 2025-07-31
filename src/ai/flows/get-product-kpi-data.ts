
'use server';
/**
 * @fileOverview A flow to get detailed KPI data for a specific product.
 *
 * - getProductKpiData - A function that aggregates vulnerability metrics for one product.
 * - ProductKpiData - The return type for the getProductKpiData function.
 */
import {z} from 'genkit';
import { getVulnerabilityCountsByProduct, getFindings } from '@/services/defectdojo';
import { getProductInfoByName } from '@/services/defectdojo';

const ProductKpiDataSchema = z.object({
  severityCounts: z.object({
    Critical: z.number(),
    High: z.number(),
    Medium: z.number(),
    Low: z.number(),
    Info: z.number(),
    Total: z.number(),
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

// This is no longer a Genkit flow, but a standard async function.
export async function getProductKpiData(input: ProductKpiInput): Promise<ProductKpiData> {
    const { productName } = input;
    
    // 1. Get severity counts for the product
    const severityCounts = await getVulnerabilityCountsByProduct(productName);

    // 2. Get top 5 critical findings
    const productInfo = await getProductInfoByName(productName);
    if (!productInfo) {
        throw new Error(`Product ${productName} not found`);
    }

    const criticalFindingsRaw = await getFindings({
        productName: productName,
        severity: 'Critical',
        limit: 5
    });

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
