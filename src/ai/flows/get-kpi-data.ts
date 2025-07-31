
'use server';
/**
 * @fileOverview A flow to gather Key Performance Indicator (KPI) data from DefectDojo.
 *
 * - getKpiData - A function that aggregates various vulnerability metrics.
 * - KpiData - The return type for the getKpiData function.
 */
import {z} from 'zod';
import { getProductList, defectDojoFetchAll } from '@/services/defectdojo';
import type { FindingSchema } from '@/services/defectdojo-types';


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
    
    // 1. Get All Products and All Active/Closed Findings in parallel
    const [allProducts, allActiveFindings, allClosedFindings] = await Promise.all([
        getProductList(),
        defectDojoFetchAll<z.infer<typeof FindingSchema>>('findings/?active=true&duplicate=false&limit=2000&prefetch=test__engagement__product'),
        defectDojoFetchAll<z.infer<typeof FindingSchema>>('findings/?active=false&verified=true&duplicate=false&limit=2000') // Assuming closed means inactive but verified
    ]);
    
    const productMap = new Map(allProducts.map(p => [p.id, p.name]));
    
    let totalSeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const productVulnCounts: Record<string, number> = {};

    for (const p of allProducts) {
        productVulnCounts[p.name] = 0;
    }

    for (const f of allActiveFindings) {
        // Increment severity counts
        const severity = f.severity.toLowerCase();
        if (severity in totalSeverityCounts) {
            (totalSeverityCounts as any)[severity]++;
        }

        // Increment product counts
        if (f.test && f.test.engagement) {
            const productName = productMap.get(f.test.engagement.product);
            if (productName && productVulnCounts.hasOwnProperty(productName)) {
                productVulnCounts[productName]++;
            }
        }
    }
    
    // 3. Get Open vs Closed Counts
    const openFindingsCount = allActiveFindings.length;
    const closedFindingsCount = allClosedFindings.length;

    // 4. Get Top 5 Vulnerable Products
    const topVulnerableProducts = Object.entries(productVulnCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const result = {
        severityCounts: totalSeverityCounts,
        openVsClosedCounts: {
            open: openFindingsCount,
            closed: closedFindingsCount,
        },
        topVulnerableProducts: topVulnerableProducts,
        allProducts: allProducts
    };
    
    console.log("Successfully fetched and processed KPI data.");
    return result;
}
