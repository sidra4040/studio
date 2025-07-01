
'use server';

import { z } from 'zod';
import { TOOL_ENGAGEMENT_MAP, PRODUCT_MAP, KNOWN_COMPONENTS } from './defectdojo-maps';


const API_URL = process.env.DEFECTDOJO_API_URL;
const API_KEY = process.env.DEFECTDOJO_API_KEY;

// Schemas for API responses
const ProductSchema = z.object({
    id: z.number(),
    name: z.string(),
});

const EngagementSchema = z.object({
    id: z.number(),
    name: z.string(),
});

const TestTypeSchema = z.object({
    id: z.number(),
    name: z.string(),
});

const FindingCountSchema = z.object({
    count: z.number(),
});

// A more detailed schema to handle prefetched data for in-memory filtering
const FindingSchema = z.object({
    id: z.number(),
    title: z.string(),
    severity: z.string(),
    description: z.string(),
    mitigation: z.string().nullable().optional(),
    active: z.boolean(),
    cwe: z.number().nullable(),
    cve: z.string().nullable().optional(),
    cvssv3_score: z.union([z.string(), z.number()]).nullable().optional(),
    test: z.object({
        id: z.number(),
        test_type: z.object({ 
            id: z.number(),
            name: z.string() 
        }).optional(),
        engagement: z.object({ 
            id: z.number(),
            name: z.string(),
            product: z.object({ id: z.number(), name: z.string() })
        }).optional(),
    }).optional(),
});

const FindingListSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    results: z.array(FindingSchema),
});

// A simple in-memory cache for findings to improve performance
const findingsCache = {
    findings: [] as z.infer<typeof FindingSchema>[],
    lastFetched: 0,
    ttl: 5 * 60 * 1000, // 5 minute cache
};


// A helper to make authenticated requests to the DefectDojo API
async function defectDojoFetch(endpoint: string, options: RequestInit = {}) {
    if (!API_URL || !API_KEY) {
        throw new Error('DefectDojo API URL or Key is not configured.');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL.replace(/\/$/, '')}/api/v2/${endpoint.replace(/^\//, '')}`;
    console.log(`Querying DefectDojo: ${url}`);

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'Authorization': `Token ${API_KEY}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`DefectDojo API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch from DefectDojo: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetches all results from a paginated DefectDojo endpoint efficiently.
 */
async function defectDojoFetchAll<T>(endpoint: string): Promise<T[]> {
    let results: T[] = [];
    const limit = 100; // Fetch 100 items per page instead of the default 25
    let nextUrl = endpoint.includes('limit=') ? endpoint : (endpoint.includes('?') ? `${endpoint}&limit=${limit}` : `${endpoint}?limit=${limit}`);

    while (nextUrl) {
        const data = await defectDojoFetch(nextUrl);
        results = results.concat(data.results);
        nextUrl = data.next;
    }

    return results;
}

/**
 * Fetches all active findings, using a cache to avoid repeated API calls.
 * Prefetches related data to enable in-memory filtering.
 */
async function getCachedAllFindings(): Promise<z.infer<typeof FindingSchema>[]> {
    const now = Date.now();
    if (findingsCache.findings.length > 0 && now - findingsCache.lastFetched < findingsCache.ttl) {
        console.log(`Returning ${findingsCache.findings.length} findings from cache.`);
        return findingsCache.findings;
    }

    console.log("Cache is stale or empty. Fetching fresh findings from API.");
    // Add prefetching to get all necessary data for filtering in memory
    const endpoint = 'findings/?active=true&duplicate=false&prefetch=test__engagement__product,test__test_type';
    const findings = await defectDojoFetchAll<z.infer<typeof FindingSchema>>(endpoint);
    
    // Validate findings against the schema
    const parsedFindings = z.array(FindingSchema).safeParse(findings);
    if (!parsedFindings.success) {
        console.error("Failed to parse cached findings:", parsedFindings.error.toString());
        // Return empty or handle error, to prevent caching bad data
        return []; 
    }

    findingsCache.findings = parsedFindings.data;
    findingsCache.lastFetched = now;
    console.log(`Cached ${findings.length} findings.`);
    return findingsCache.findings;
}


/**
 * Helper to safely convert CVSS to a number
 */
function cvssToNumber(score: string | number | null | undefined): number {
    if (typeof score === 'number') {
        return score;
    }
    if (typeof score === 'string') {
        const num = parseFloat(score);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

/**
 * Finds a product by name (case-insensitive) and returns its ID.
 * Uses the hardcoded map first for reliability, then falls back to an API call.
 */
async function getProductIDByName(productName: string): Promise<number | null> {
    const lowerProductName = productName.trim().toLowerCase();
    
    for (const key in PRODUCT_MAP) {
        if (key === lowerProductName || PRODUCT_MAP[key].name.toLowerCase() === lowerProductName) {
            return PRODUCT_MAP[key].id;
        }
    }
    
    try {
        const products = await defectDojoFetchAll<z.infer<typeof ProductSchema>>(`products/?name__icontains=${encodeURIComponent(lowerProductName)}`);
        return products.length > 0 ? products[0].id : null;
    } catch (error) {
        console.error(`Error fetching product ID for "${productName}":`, error);
        return null;
    }
}

/**
 * Gets a list of all products from DefectDojo.
 */
export async function getProductList() {
    try {
        const products = await defectDojoFetchAll<z.infer<typeof ProductSchema>>('products/?limit=1000');
        return products.map(p => p.name);
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

/**
 * Gets a list of all engagements from DefectDojo.
 */
export async function getEngagementList() {
    try {
        const engagements = await defectDojoFetchAll<z.infer<typeof EngagementSchema>>('engagements/?limit=1000');
        return engagements.map(e => e.name);
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

/**
 * Gets a list of all tools (test types) from DefectDojo.
 */
export async function getToolList() {
    try {
        return Object.values(TOOL_ENGAGEMENT_MAP).map(tool => tool.name);
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

interface GetFindingsParams {
    productName?: string;
    severity?: string;
    active?: boolean;
    limit?: number;
    toolName?: string;
}

/**
 * Fetches findings by filtering the cached data in-memory.
 */
export async function getFindings(params: GetFindingsParams): Promise<string> {
    try {
        // 1. Get all findings from the cache (fast after first call)
        let allFindings = await getCachedAllFindings();

        // 2. Filter in memory
        if (params.productName) {
            const lowerProductName = params.productName.toLowerCase().trim();
            allFindings = allFindings.filter(f => 
                f.test?.engagement?.product?.name?.toLowerCase() === lowerProductName
            );
        }

        if (params.severity) {
            allFindings = allFindings.filter(f => f.severity === params.severity);
        }

        if (params.active !== undefined) {
            allFindings = allFindings.filter(f => f.active === params.active);
        }

        if (params.toolName) {
            const lowerToolName = params.toolName.toLowerCase().trim();
            // Use `includes` for flexible matching, e.g., "rapid7" matches "Nexpose (Rapid7) Carelink"
            allFindings = allFindings.filter(f => 
                f.test?.test_type?.name?.toLowerCase().includes(lowerToolName)
            );
        }
        
        const totalCount = allFindings.length;
        const limit = params.limit || 10;
        
        // Sort by CVSS score before slicing
        const sortedFindings = allFindings.sort((a, b) => cvssToNumber(b.cvssv3_score) - cvssToNumber(a.cvssv3_score));
        const limitedFindings = sortedFindings.slice(0, limit);

        if (limitedFindings.length === 0) {
             const message = `No active ${params.severity || ''} vulnerabilities were found for the specified criteria.`;
            return JSON.stringify({ message });
        }
        
        const summary = {
            totalCount: totalCount,
            showing: limitedFindings.length,
            toolName: params.toolName || 'All Tools',
            productName: params.productName || 'All Products',
            findings: limitedFindings.map(f => ({
                id: f.id,
                title: f.title,
                cve: f.cve || 'N/A',
                cwe: f.cwe ? `CWE-${f.cwe}` : 'Unknown',
                cvssv3_score: f.cvssv3_score || 'N/A',
                severity: f.severity,
                tool: f.test?.test_type?.name || 'Unknown',
                description: f.description,
                mitigation: f.mitigation,
            })),
        };
            
        return JSON.stringify(summary, null, 2);

    } catch (error) {
        console.error('Error in getFindings:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: `An exception occurred. Details: ${errorMessage}` });
    }
}

/**
 * Gets vulnerability counts by severity for a specific product.
 */
export async function getVulnerabilityCountBySeverity(productName: string) {
    const severities = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    const counts: Record<string, number> = {};
    
    const productId = await getProductIDByName(productName);
    if (productId === null) {
        return { error: `Product '${productName}' not found.` };
    }
    const productFilter = `&test__engagement__product=${productId}&duplicate=false`;

    try {
        const countPromises = severities.map(async (severity) => {
            const data = await defectDojoFetch(`findings/?severity=${severity}&active=true&limit=1${productFilter}`);
            const parsedData = FindingCountSchema.parse(data);
            return { severity, count: parsedData.count };
        });

        const results = await Promise.all(countPromises);
        
        let total = 0;
        for (const result of results) {
            counts[result.severity] = result.count;
            total += result.count;
        }
        counts['Total'] = total;
        
        return counts;
    } catch(error) {
        console.error(`Error fetching severity counts for ${productName}:`, error);
        return { error: `Could not retrieve counts for ${productName}` };
    }
}

export async function getOpenVsClosedCounts() {
    try {
        const openData = await defectDojoFetch(`findings/?active=true&duplicate=false&limit=1`);
        const closedData = await defectDojoFetch(`findings/?active=false&duplicate=false&limit=1`);
        
        return {
            open: FindingCountSchema.parse(openData).count,
            closed: FindingCountSchema.parse(closedData).count,
        };
    } catch (error) {
        console.error("Error fetching open/closed counts:", error);
        return { error: "Failed to fetch open/closed counts", open: 0, closed: 0 };
    }
}

export async function getProductVulnerabilitySummary() {
    console.log("Fetching efficient product vulnerability summary...");
    try {
        const productList = await getProductList();
        if (!Array.isArray(productList)) {
            throw new Error("Could not fetch product list.");
        }

        const summary: Record<string, any> = {};

        const summaryPromises = productList.map(async (productName) => {
            if (!productName) return;
            const counts = await getVulnerabilityCountBySeverity(productName);
            if (!counts.error) {
                summary[productName] = counts;
            }
        });

        await Promise.all(summaryPromises);

        console.log("Finished calculating product vulnerability summary.");
        return summary;
    } catch(error) {
        console.error("Error in getProductVulnerabilitySummary:", error);
        return null;
    }
}

export async function getTotalFindingCount() {
    try {
        const data = await defectDojoFetch('findings/?duplicate=false&limit=1');
        return { count: FindingCountSchema.parse(data).count };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { error: `Failed to retrieve total finding count: ${errorMessage}` };
    }
}

export async function getTopCriticalVulnerabilityPerProduct(): Promise<string> {
    console.log("Fetching top critical vulnerability for each product...");
    try {
        const productList = await getProductList();
        if (!Array.isArray(productList) || productList.length === 0) {
            return JSON.stringify({ message: "No products found to analyze." });
        }

        const vulnerabilityPromises = productList.map(async (productName) => {
             if (!productName) return null;
            const findingResult = await getFindings({ productName, severity: 'Critical', limit: 1 });
            try {
                const findingsData = JSON.parse(findingResult);
                if (findingsData.findings && findingsData.findings.length > 0) {
                    return {
                        product: productName,
                        vulnerability: findingsData.findings[0],
                    };
                }
                return {
                    product: productName,
                    vulnerability: null,
                };
            } catch (e) {
                return {
                    product: productName,
                    vulnerability: null,
                };
            }
        });

        const results = await Promise.all(vulnerabilityPromises);
        const filteredResults = results.filter(r => r && r.vulnerability !== null);

        if (filteredResults.length === 0) {
            return JSON.stringify({ message: "No critical vulnerabilities found for any product." });
        }
        
        return JSON.stringify({ vulnerabilitiesByProduct: filteredResults }, null, 2);

    } catch (error) {
        console.error("Error in getTopCriticalVulnerabilityPerProduct:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: `An exception occurred: ${errorMessage}` });
    }
}

export async function getComponentImpact(componentName: string) {
    console.log(`Analyzing component impact for: ${componentName}`);
    try {
        const allFindingsData = await getCachedAllFindings();
        
        if (!allFindingsData || allFindingsData.length === 0) {
            return { error: 'No active findings found to analyze.' };
        }

        let totalRisk = 0;
        allFindingsData.forEach(finding => {
            totalRisk += cvssToNumber(finding.cvssv3_score);
        });

        const componentPattern = new RegExp(componentName, 'i');
        const componentFindings = allFindingsData.filter(finding => 
            componentPattern.test(finding.title) || (finding.description && componentPattern.test(finding.description))
        );

        if (componentFindings.length === 0) {
            return {
                componentName,
                vulnerabilityCount: 0,
                criticalCount: 0,
                highCount: 0,
                riskReductionPercent: 0,
                sampleVulnerabilities: [],
                message: `No vulnerabilities found for component '${componentName}'.`
            };
        }

        let componentRisk = 0;
        let criticalCount = 0;
        let highCount = 0;

        componentFindings.forEach(finding => {
            componentRisk += cvssToNumber(finding.cvssv3_score);
            if (finding.severity === 'Critical') criticalCount++;
            if (finding.severity === 'High') highCount++;
        });

        const topCriticalVulnerabilities = componentFindings
            .filter(f => f.severity === 'Critical')
            .sort((a, b) => cvssToNumber(b.cvssv3_score) - cvssToNumber(a.cvssv3_score))
            .slice(0, 5)
            .map(f => ({
                id: f.id,
                title: f.title,
                severity: f.severity,
                cve: f.cve || 'N/A',
                cvssv3_score: f.cvssv3_score || 'N/A',
                cwe: f.cwe ? `CWE-${f.cwe}` : 'Unknown',
            }));

        const riskReductionPercent = totalRisk > 0 ? (componentRisk / totalRisk) * 100 : 0;

        const result = {
            componentName,
            vulnerabilityCount: componentFindings.length,
            criticalCount,
            highCount,
            riskReductionPercent: parseFloat(riskReductionPercent.toFixed(1)),
            sampleVulnerabilities: topCriticalVulnerabilities,
        };

        console.log("Component impact analysis result:", result);
        return result;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error analyzing component impact for ${componentName}:`, errorMessage);
        return { error: `Failed to analyze component impact. Details: ${errorMessage}` };
    }
}

export async function getTopRiskyComponents(limit: number = 5) {
    console.log(`Analyzing top ${limit} risky components...`);
    try {
        const allFindingsData = await getCachedAllFindings();
        
        if (!allFindingsData || allFindingsData.length === 0) {
            return { error: 'No active findings found to analyze.' };
        }

        let totalRisk = 0;
        allFindingsData.forEach(finding => {
            totalRisk += cvssToNumber(finding.cvssv3_score);
        });
        
        if (totalRisk === 0) {
            return {
                topComponents: [],
                message: 'No vulnerabilities with CVSS scores found. Cannot calculate risk.'
            };
        }

        const componentAnalyses = [];
        for (const componentName of KNOWN_COMPONENTS) {
            const componentPattern = new RegExp(componentName, 'i');
            const componentFindings = allFindingsData.filter(finding => 
                componentPattern.test(finding.title) || (finding.description && componentPattern.test(finding.description))
            );

            if (componentFindings.length > 0) {
                let componentRisk = 0;
                let criticalCount = 0;
                let highCount = 0;

                componentFindings.forEach(finding => {
                    componentRisk += cvssToNumber(finding.cvssv3_score);
                    if (finding.severity === 'Critical') criticalCount++;
                    if (finding.severity === 'High') highCount++;
                });

                const riskReductionPercent = (componentRisk / totalRisk) * 100;

                componentAnalyses.push({
                    componentName,
                    vulnerabilityCount: componentFindings.length,
                    criticalCount,
                    highCount,
                    riskReductionPercent: parseFloat(riskReductionPercent.toFixed(1)),
                });
            }
        }
        
        const sortedComponents = componentAnalyses.sort((a, b) => b.riskReductionPercent - a.riskReductionPercent);
        
        const result = {
            topComponents: sortedComponents.slice(0, limit)
        };
        
        console.log("Top risky components analysis result:", result);
        return result;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error analyzing top risky components:`, errorMessage);
        return { error: `Failed to analyze top risky components. Details: ${errorMessage}` };
    }
}

    