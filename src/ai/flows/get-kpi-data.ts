
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
    getProductVulnerabilitySummary,
    getProductList,
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
    productList: z.array(z.string()).describe('A list of all product names.'),
});

export type KpiData = z.infer<typeof KpiDataSchema>;

export async function getKpiData(): Promise<KpiData> {
    try {
        console.log("Fetching live KPI data from DefectDojo...");
        // Fetch all data in parallel, including the product list for the dropdown.
        const [productSummary, openClosedData, productListData] = await Promise.all([
            getProductVulnerabilitySummary(),
            getOpenVsClosedCounts(),
            getProductList(),
        ]);
        
        const openClosedCounts = openClosedData.error ? { open: 0, closed: 0 } : openClosedData;
        const productList = Array.isArray(productListData) ? productListData : [];


        // Calculate overall severity counts from the product summary
        const severityCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
        if (productSummary) {
            Object.values(productSummary).forEach(product => {
                severityCounts.Critical += product.Critical || 0;
                severityCounts.High += product.High || 0;
                severityCounts.Medium += product.Medium || 0;
                severityCounts.Low += product.Low || 0;
                severityCounts.Info += product.Info || 0;
            });
        }


        // Calculate top 5 vulnerable products from the summary
        const topProducts = productSummary ? Object.entries(productSummary).map(([product, counts]) => ({
            product,
            vulnerabilities: counts.Total || 0,
        })).sort((a, b) => b.vulnerabilities - a.vulnerabilities).slice(0, 5) : [];


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
        
        console.log("Successfully fetched KPI data.");
        return kpiData;
    } catch (error) {
        console.error("Failed to fetch KPI data from DefectDojo:", error);
        // Return empty/default data on error so the page doesn't crash
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
