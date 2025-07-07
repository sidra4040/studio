'use server';
/**
 * @fileOverview An AI flow to retrieve KPI data for a specific product.
 * 
 * - getProductKpiData - A function that fetches severity data for a specific product.
 * - ProductKpiData - The return type for the getProductKpiData function.
 */

import { z } from 'genkit';
import { getVulnerabilityCountsByProduct } from '@/services/defectdojo';

const ProductKpiDataInputSchema = z.object({
    productName: z.string().describe('The name of the product to analyze.'),
});

export type ProductKpiDataInput = z.infer<typeof ProductKpiDataInputSchema>;

const ProductKpiDataSchema = z.object({
    vulnerabilitiesBySeverity: z.array(z.object({
        severity: z.string(),
        count: z.number(),
    })).describe('Data for vulnerabilities by severity chart for a specific product.'),
});

export type ProductKpiData = z.infer<typeof ProductKpiDataSchema>;

export async function getProductKpiData(input: ProductKpiDataInput): Promise<ProductKpiData> {
    try {
        console.log(`Fetching KPI data for product: ${input.productName}`);
        
        const severityCounts = await getVulnerabilityCountsByProduct(input.productName);
        
        const vulnerabilitiesBySeverity = Object.entries(severityCounts).map(([severity, count]) => ({
            severity,
            count,
        }));

        console.log(`Successfully fetched KPI data for product: ${input.productName}`);
        return { vulnerabilitiesBySeverity };

    } catch (error) {
        console.error(`Failed to fetch KPI data for product ${input.productName}:`, error);
        return {
            vulnerabilitiesBySeverity: [],
        };
    }
}
