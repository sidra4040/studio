
'use server';
/**
 * @fileOverview A flow to gather Key Performance Indicator (KPI) data from DefectDojo.
 *
 * - getKpiData - A function that aggregates various vulnerability metrics.
 * - KpiData - The return type for the getKpiData function.
 */
import {z} from 'zod';
import {getProductList, getTotalFindingCount, getVulnerabilityCountsByProduct, getProductVulnerabilitySummary} from '@/services/defectdojo';

const KpiDataSchema = z.object({
  severityCounts: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
    info: z.number(),
  }),
  openVsClosedCounts: z.object({
    open: z.number(),
    closed: z.number(),
  }),
  topVulnerableProducts: z.array(z.object({
    name: z.string(),
    count: z.number(),
  })),
  allProducts: z.array(z.object({
      id: z.number(),
      name: z.string()
  })),
});

export type KpiData = z.infer<typeof KpiDataSchema>;

// This function is no longer a Genkit flow. It's a standard async function.
export async function getKpiData(): Promise<KpiData> {
    console.log("Fetching live KPI data from DefectDojo...");
    
    // 1. Get All Products
    const allProducts = await getProductList();
    
    // 2. Get Vulnerability Counts for each product to find totals and top products
    let totalSeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    let totalOpenFindings = 0;
    
    const productVulnerabilities = await Promise.all(
        allProducts.map(async (product) => {
            const counts = await getVulnerabilityCountsByProduct(product.name);
            totalSeverityCounts.critical += counts.Critical;
            totalSeverityCounts.high += counts.High;
            totalSeverityCounts.medium += counts.Medium;
            totalSeverityCounts.low += counts.Low;
            totalSeverityCounts.info += counts.Info;
            totalOpenFindings += counts.Total;
            return { name: product.name, count: counts.Total };
        })
    );
    
    // 3. Get Open vs Closed Counts
    const totalFindingsData = await getTotalFindingCount();
    const totalFindings = totalFindingsData.count || 0;
    const closedFindings = totalFindings - totalOpenFindings;

    // 4. Get Top 5 Vulnerable Products
    const topVulnerableProducts = productVulnerabilities
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(p => ({name: p.name, count: p.count}));

    const result = {
        severityCounts: totalSeverityCounts,
        openVsClosedCounts: {
            open: totalOpenFindings,
            closed: closedFindings,
        },
        topVulnerableProducts: topVulnerableProducts,
        allProducts: allProducts
    };
    
    console.log("Successfully fetched and processed KPI data.");
    return result;
}
