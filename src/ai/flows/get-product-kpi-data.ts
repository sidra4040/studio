'use server';
/**
 * @fileOverview An AI flow to retrieve product-specific KPI data for the dashboard.
 *
 * - getProductKpiData - A function that fetches data for a specific product.
 * - ProductKpiDataInput - The input type for the getProductKpiData function.
 * - ProductKpiData - The return type for the getProductKpiData function.
 */

import { z } from 'genkit';
import { getVulnerabilityCountBySeverity, getFindings } from '@/services/defectdojo';

const ProductKpiDataInputSchema = z.object({
  productName: z.string().describe('The name of the product to fetch data for.'),
});
export type ProductKpiDataInput = z.infer<typeof ProductKpiDataInputSchema>;

const VulnerabilitySchema = z.object({
    id: z.number(),
    title: z.string(),
    severity: z.string(),
    cve: z.string().optional().nullable(),
    cvssv3_score: z.union([z.string(), z.number()]).optional().nullable(),
});

const ProductKpiDataSchema = z.object({
    severityDistribution: z.record(z.string(), z.number()).describe('Vulnerability counts by severity for the product.'),
    topCriticalVulnerabilities: z.array(VulnerabilitySchema).describe('A list of top 5 critical vulnerabilities for the product.'),
});

export type ProductKpiData = z.infer<typeof ProductKpiDataSchema>;

function parseFindings(jsonString: string, limit: number): z.infer<typeof VulnerabilitySchema>[] {
    try {
        const data = JSON.parse(jsonString);
        if (data.error || !data.findings) {
            return [];
        }
        return data.findings.slice(0, limit).map((f: any) => ({
            id: f.id,
            title: f.title,
            severity: f.severity,
            cve: f.cve,
            cvssv3_score: f.cvssv3_score,
        }));
    } catch (e) {
        console.error("Failed to parse findings JSON", e);
        return [];
    }
}

export async function getProductKpiData(input: ProductKpiDataInput): Promise<ProductKpiData> {
    const { productName } = input;
    
    if (!productName) {
        return {
            severityDistribution: {},
            topCriticalVulnerabilities: [],
        }
    }

    try {
        console.log(`Fetching product-specific KPI data for ${productName}`);
        
        const [severityCounts, criticalDataString] = await Promise.all([
            getVulnerabilityCountBySeverity(productName),
            getFindings({ productName, severity: 'Critical', limit: 5 }),
        ]);

        if (severityCounts.error) {
            console.error(`Error fetching severity counts for ${productName}:`, severityCounts.error);
            throw new Error(severityCounts.error);
        }

        const topCriticalVulnerabilities = parseFindings(criticalDataString, 5);

        // We don't need the 'Total' for the chart
        const severityDistribution = { ...severityCounts };
        delete severityDistribution.Total;


        return {
            severityDistribution,
            topCriticalVulnerabilities: topCriticalVulnerabilities,
        };

    } catch (error) {
        console.error(`Failed to fetch KPI data for product ${productName}:`, error);
        return {
            severityDistribution: {},
            topCriticalVulnerabilities: [],
        };
    }
}
