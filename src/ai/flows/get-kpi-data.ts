
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
    getCachedAllFindings,
    getProductList
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
    productList: z.array(z.object({
        id: z.number(),
        name: z.string(),
    })).describe('A list of all products for the filter dropdown.')
});

export type KpiData = z.infer<typeof KpiDataSchema>;

export async function getKpiData(): Promise<KpiData> {
    try {
        console.log("Fetching live KPI data from DefectDojo...");
        
        const [allFindings, openClosedCounts, products] = await Promise.all([
            getCachedAllFindings(),
            getOpenVsClosedCounts(),
            getProductList(),
        ]);

        const severityCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
        const productCounts: Record<string, number> = {};
        
        if (allFindings && allFindings.length > 0) {
            console.log(`Processing ${allFindings.length} findings for KPI dashboard.`);
            for (const finding of allFindings) {
                // Severity counts
                if (severityCounts[finding.severity] !== undefined) {
                    severityCounts[finding.severity]++;
                }

                // Product counts
                let productName: string | undefined | null = finding.test?.engagement?.product?.name;
                if (!productName && finding.test?.engagement?.product_id) {
                     const productInfo = products.find(p => p.id === finding.test?.engagement?.product_id);
                     if (productInfo) {
                        productName = productInfo.name;
                     }
                }
                
                if (productName) {
                    if (!productCounts[productName]) {
                        productCounts[productName] = 0;
                    }
                    productCounts[productName]++;
                }
            }
        } else {
             console.warn("No findings available from cache to generate KPI data. All counts will be zero.");
        }
        
        const topProducts = Object.entries(productCounts)
            .map(([product, vulnerabilities]) => ({ product, vulnerabilities }))
            .sort((a, b) => b.vulnerabilities - a.vulnerabilities)
            .slice(0, 5);

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
            productList: products,
        };
        
        console.log("Successfully fetched and processed KPI data.");
        return kpiData;

    } catch (error) {
        console.error("Failed to fetch KPI data from DefectDojo:", error);
        // Return default data on error
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
            productList: [],
        };
    }
}
