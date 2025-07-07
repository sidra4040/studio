
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
import { PRODUCT_MAP } from '@/services/defectdojo-maps';

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
    })).describe('List of all products for the deep dive dropdown.')
});

export type KpiData = z.infer<typeof KpiDataSchema>;

// Create a reverse map for ID to Name lookups, this is more efficient
const PRODUCT_ID_MAP: Record<number, string> = Object.values(PRODUCT_MAP).reduce((acc, product) => {
    acc[product.id] = product.name;
    return acc;
}, {} as Record<number, string>);


export async function getKpiData(): Promise<KpiData> {
    try {
        console.log("Fetching live KPI data from DefectDojo...");
        
        // Fetch all data in parallel
        const [allFindings, openClosedCounts, productList] = await Promise.all([
            getCachedAllFindings(),
            getOpenVsClosedCounts(),
            getProductList(),
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
                productList: [],
            };
        }
        
        console.log(`Processing ${allFindings.length} findings for KPI dashboard.`);

        const severityCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
        const productSummary: Record<string, { Total: number }> = {};

        for (const finding of allFindings) {
            if (severityCounts[finding.severity] !== undefined) {
                severityCounts[finding.severity]++;
            }

            let productName: string | undefined | null = finding.test?.engagement?.product?.name;
            
            // Fallback logic inspired by the Python script
            if (!productName && finding.test?.engagement?.product_id) {
                productName = PRODUCT_ID_MAP[finding.test.engagement.product_id];
            }

            if (productName) {
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
            productList: productList,
        };
        
        console.log("Successfully fetched and processed KPI data.");
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
            productList: [],
        };
    }
}
