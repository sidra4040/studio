
'use server';
/**
 * @fileOverview An AI flow to retrieve and aggregate KPI data for the dashboard.
 * 
 * - getKpiData - A function that fetches data for the KPI dashboard from DefectDojo.
 * - KpiData - The return type for the getKpiData function.
 */

import { z } from 'genkit';
import { 
    getOpenVsClosedCounts,
    getCachedAllFindings
} from '@/services/defectdojo';

const KpiDataSchema = z.object({
    vulnerabilitiesBySeverity: z.array(z.object({
        severity: z.string(),
        count: z.number(),
    })).describe('Data for vulnerabilities by severity chart.'),
    openVsClosed: z.array(z.object({
        name: z.string(),
        value: z.number(),
        fill: z.string(),
    })).describe('Data for open vs. closed findings chart.'),
    topVulnerableProducts: z.array(z.object({
        product: z.string(),
        vulnerabilities: z.number(),
    })).describe('Data for top 5 vulnerable products chart.'),
});

export type KpiData = z.infer<typeof KpiDataSchema>;

export async function getKpiData(): Promise<KpiData> {
    try {
        console.log("Fetching live KPI data from DefectDojo...");
        
        // Fetch all data in parallel
        const [allFindings, openClosedCounts] = await Promise.all([
            getCachedAllFindings(),
            getOpenVsClosedCounts(),
        ]);

        if (!allFindings || allFindings.length === 0) {
            console.warn("No findings available from cache to generate KPI data. Returning default data.");
            return {
                vulnerabilitiesBySeverity: [
                    { severity: 'Critical', count: 0 },
                    { severity: 'High', count: 0 },
                    { severity: 'Medium', count: 0 },
                    { severity: 'Low', count: 0 },
                    { severity: 'Info', count: 0 },
                ],
                openVsClosed: [
                    { name: 'Open', value: 0, fill: 'hsl(var(--destructive))' },
                    { name: 'Closed', value: 0, fill: 'hsl(var(--chart-2))' },
                ],
                topVulnerableProducts: [],
            };
        }
        
        console.log(`Processing ${allFindings.length} findings for KPI dashboard.`);

        const severityCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
        const productSummary: Record<string, { Total: number }> = {};

        for (const finding of allFindings) {
            if (severityCounts[finding.severity] !== undefined) {
                severityCounts[finding.severity]++;
            }

            if (finding.test && typeof finding.test === 'object' && finding.test.engagement?.product?.name) {
                const productName = finding.test.engagement.product.name;
                if (!productSummary[productName]) {
                    productSummary[productName] = { Total: 0 };
                }
                productSummary[productName].Total++;
            }
        }

        const productTotals = Object.entries(productSummary).map(([product, counts]) => ({
            product,
            vulnerabilities: counts.Total || 0,
        }));
        productTotals.sort((a, b) => b.vulnerabilities - a.vulnerabilities);
        const topProducts = productTotals.slice(0, 5);


        const kpiData: KpiData = {
            vulnerabilitiesBySeverity: Object.entries(severityCounts).map(([severity, count]) => ({
                severity,
                count,
            })),
            openVsClosed: [
                { name: 'Open', value: openClosedCounts.open, fill: 'hsl(var(--destructive))' },
                { name: 'Closed', value: openClosedCounts.closed, fill: 'hsl(var(--chart-2))' },
            ],
            topVulnerableProducts: topProducts,
        };
        
        console.log("Successfully fetched and processed KPI data.", JSON.stringify(kpiData.vulnerabilitiesBySeverity));
        return kpiData;

    } catch (error) {
        console.error("Failed to fetch KPI data from DefectDojo:", error);
        return {
            vulnerabilitiesBySeverity: [
                { severity: 'Critical', count: 0 },
                { severity: 'High', count: 0 },
                { severity: 'Medium', count: 0 },
                { severity: 'Low', count: 0 },
                { severity: 'Info', count: 0 },
            ],
            openVsClosed: [
                { name: 'Open', value: 0, fill: 'hsl(var(--destructive))' },
                { name: 'Closed', value: 0, fill: 'hsl(var(--chart-2))' },
            ],
            topVulnerableProducts: [],
        };
    }
}
