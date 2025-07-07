'use server';
/**
 * @fileOverview An AI flow to retrieve KPI data for a specific product.
 * - getProductKpiData - Fetches severity breakdown for a given product.
 * - ProductKpiData - The return type.
 */
import { z } from 'genkit';
import { getVulnerabilityCountsByProduct } from '@/services/defectdojo';

const ProductKpiDataSchema = z.object({
    vulnerabilitiesBySeverity: z.array(z.object({
        severity: z.string(),
        count: z.number(),
    })).describe('Data for vulnerabilities by severity chart for a single product.'),
});
export type ProductKpiData = z.infer<typeof ProductKpiDataSchema>;

export async function getProductKpiData(productName: string): Promise<ProductKpiData> {
    const counts = await getVulnerabilityCountsByProduct(productName);
    const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    
    const vulnerabilitiesBySeverity = severityOrder.map(severity => ({
        severity,
        count: counts[severity] || 0,
    }));
    
    return { vulnerabilitiesBySeverity };
}
