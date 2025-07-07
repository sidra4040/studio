
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
});

export type KpiData = z.infer<typeof KpiDataSchema>;

export async function getKpiData(): Promise<KpiData> {
    try {
        console.log("Fetching live KPI data from DefectDojo...");
        
        // Fetch data for dynamic parts of the dashboard
        const [allFindings, openClosedCounts] = await Promise.all([
            getCachedAllFindings(),
            getOpenVsClosedCounts(),
        ]);

        const severityCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };

        if (allFindings && allFindings.length > 0) {
            console.log(`Processing ${allFindings.length} findings for KPI dashboard.`);
            for (const finding of allFindings) {
                if (severityCounts[finding.severity] !== undefined) {
                    severityCounts[finding.severity]++;
                }
            }
        } else {
             console.warn("No findings available from cache to generate KPI data. Severity counts will be zero.");
        }
        
        // Use hardcoded data for the Top 5 Vulnerable Products as requested
        const topProducts = [
            { product: 'MyCareLink Relay', vulnerabilities: 6276 },
            { product: 'Carelink Network', vulnerabilities: 1239 },
            { product: 'MyCareLink Patient Monitor', vulnerabilities: 547 },
            { product: 'CLEM', vulnerabilities: 269 },
            { product: 'MCLS', vulnerabilities: 269 },
        ];


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
        
        console.log("Successfully processed KPI data with static top products.");
        return kpiData;

    } catch (error) {
        console.error("Failed to fetch KPI data from DefectDojo:", error);
        // Return default data on error, with the static top products
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
            topVulnerableProducts: [
                { product: 'MyCareLink Relay', vulnerabilities: 6276 },
                { product: 'Carelink Network', vulnerabilities: 1239 },
                { product: 'MyCareLink Patient Monitor', vulnerabilities: 547 },
                { product: 'CLEM', vulnerabilities: 269 },
                { product: 'MCLS', vulnerabilities: 269 },
            ],
        };
    }
}
