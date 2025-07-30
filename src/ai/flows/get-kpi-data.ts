
'use server';
/**
 * @fileOverview A flow to gather Key Performance Indicator (KPI) data from DefectDojo.
 *
 * - getKpiData - A function that aggregates various vulnerability metrics.
 * - KpiData - The return type for the getKpiData function.
 */
import {z} from 'genkit';
import {ai} from '@/ai/genkit';
import {getProductList, getTotalFindingCount, getVulnerabilityCountsByProduct} from '@/services/defectdojo';

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

export async function getKpiData(): Promise<KpiData> {
  return getKpiDataFlow();
}

const getKpiDataFlow = ai.defineFlow(
  {
    name: 'getKpiDataFlow',
    outputSchema: KpiDataSchema,
  },
  async () => {
    console.log("Fetching live KPI data from DefectDojo...");
    
    // 1. Get Severity Counts
    const allProducts = await getProductList();
    let totalSeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    let totalOpenFindings = 0;

    const productPromises = allProducts.map(async (product) => {
        const counts = await getVulnerabilityCountsByProduct(product.name);
        return { name: product.name, total: counts.Total };
    });

    const productVulnerabilities = await Promise.all(productPromises);
    
    // This is inefficient but necessary for now to get overall severity counts
    const allCounts = await getProductVulnerabilitySummary();
    for (const productName in allCounts) {
        const counts = allCounts[productName];
        totalSeverityCounts.critical += counts.Critical;
        totalSeverityCounts.high += counts.High;
        totalSeverityCounts.medium += counts.Medium;
        totalSeverityCounts.low += counts.Low;
        totalSeverityCounts.info += counts.Info;
        totalOpenFindings += counts.Total;
    }

    // 2. Get Open vs Closed Counts
    const totalFindingsData = await getTotalFindingCount();
    const totalFindings = totalFindingsData.count || 0;
    const closedFindings = totalFindings - totalOpenFindings;

    // 3. Get Top 5 Vulnerable Products
    const topVulnerableProducts = productVulnerabilities
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(p => ({name: p.name, count: p.total}));

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
);


// We need to re-add this function as it's used by the KPI flow
async function getProductVulnerabilitySummary(): Promise<Record<string, Record<string, number>>> {
    try {
        const allProducts = await getProductList();
        const summary: Record<string, Record<string, number>> = {};

        const promises = allProducts.map(async (product) => {
             if (!product.name) return;
             const counts = await getVulnerabilityCountsByProduct(product.name);
             summary[product.name] = counts;
        });
        await Promise.all(promises);
        
        return summary;

    } catch(error) {
        console.error("Failed to get product vulnerability summary", error);
        return {};
    }
}
