
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

// A simple in-memory cache for findings to improve performance for full-dataset analysis
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
    const limit = 1000; // Fetch 1000 items per page instead of the default 25
    let nextUrl = endpoint.includes('limit=') ? endpoint : (endpoint.includes('?') ? `${endpoint}&limit=${limit}` : `${endpoint}?limit=${limit}`);

    while (nextUrl) {
        const data = await defectDojoFetch(nextUrl);
        results = results.concat(data.results);
        nextUrl = data.next;
    }

    return results;
}

/**
 * Fetches all active findings for broad analysis, using a cache to avoid repeated API calls.
 */
async function getCachedAllFindings(): Promise<z.infer<typeof FindingSchema>[]> {
    const now = Date.now();
    if (findingsCache.findings.length > 0 && now - findingsCache.lastFetched < findingsCache.ttl) {
        console.log(`Returning ${findingsCache.findings.length} findings from cache for analysis.`);
        return findingsCache.findings;
    }

    console.log("Cache is stale or empty for analysis. Fetching fresh findings from API.");
    // Add prefetching to get all necessary data for filtering in memory
    const endpoint = 'findings/?active=true&duplicate=false&prefetch=test__engagement__product,test__test_type';
    const findings = await defectDojoFetchAll<z.infer<typeof FindingSchema>>(endpoint);
    
    const parsedFindings = z.array(FindingSchema).safeParse(findings);
    if (!parsedFindings.success) {
        console.error("Failed to parse cached findings:", parsedFindings.error.toString());
        return []; 
    }

    findingsCache.findings = parsedFindings.data;
    findingsCache.lastFetched = now;
    console.log(`Cached ${findings.length} findings for analysis.`);
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
 * Fetches findings using a direct, filtered API call for performance. Does not use the full cache.
 */
export async function getFindings(params: GetFindingsParams): Promise<string> {
    try {
        const queryParams = new URLSearchParams();
        queryParams.set('duplicate', 'false');
        queryParams.set('active', params.active !== undefined ? String(params.active) : 'true');

        if (params.severity) {
            queryParams.set('severity', params.severity);
        }
        if (params.limit) {
            queryParams.set('limit', String(params.limit));
        }

        if (params.toolName) {
            const lowerToolName = params.toolName.toLowerCase().trim();
            const toolKey = Object.keys(TOOL_ENGAGEMENT_MAP).find(key => key.includes(lowerToolName));
            const tool = toolKey ? TOOL_ENGAGEMENT_MAP[toolKey] : null;
            
            if (tool) {
                queryParams.set('test__engagement', String(tool.id));
            } else {
                 return JSON.stringify({ message: `Tool '${params.toolName}' not found.` });
            }
        } else if (params.productName) {
            const productId = await getProductIDByName(params.productName);
            if (productId) {
                queryParams.set('test__engagement__product', String(productId));
            } else {
                return JSON.stringify({ message: `Product '${params.productName}' not found.` });
            }
        }

        queryParams.set('prefetch', 'test__engagement__product,test__test_type');
        
        const data = await defectDojoFetch(`findings/?${queryParams.toString()}`);
        
        const parsedFindings = FindingListSchema.safeParse(data);

        if (!parsedFindings.success || parsedFindings.data.results.length === 0) {
            const criteria = [params.severity, params.productName, params.toolName].filter(Boolean).join(', ');
            return JSON.stringify({ message: `No active vulnerabilities were found for the specified criteria: ${criteria}.` });
        }

        const responseData = {
            totalCount: parsedFindings.data.count,
            showing: parsedFindings.data.results.length,
            toolName: params.toolName || 'All Tools',
            productName: params.productName || 'All Products',
            findings: parsedFindings.data.results.map(f => ({
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
        
        return JSON.stringify(responseData, null, 2);

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
    
    try {
        const productId = await getProductIDByName(productName);
        if (!productId) {
            return { error: `Product '${productName}' not found.` };
        }

        let total = 0;
        for (const severity of severities) {
            const data = await defectDojoFetch(`findings/?test__engagement__product=${productId}&severity=${severity}&active=true&duplicate=false&limit=1`);
            const count = FindingCountSchema.parse(data).count;
            counts[severity] = count;
            total += count;
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
        const allFindings = await getCachedAllFindings();
        const productList = [...new Set(allFindings.map(f => f.test?.engagement?.product?.name).filter(p => p))];

        const summary: Record<string, any> = {};

        for (const productName of productList) {
            if (!productName) continue;
            // Use in-memory filtering for summary to avoid hammering the API
            const productFindings = allFindings.filter(f => f.test?.engagement?.product?.name === productName);
            const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, Total: 0 };
            productFindings.forEach(f => {
                if (counts[f.severity] !== undefined) {
                    counts[f.severity]++;
                }
                counts.Total++;
            });
            summary[productName] = counts;
        }

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
        const allFindings = await getCachedAllFindings();
        const criticalFindings = allFindings.filter(f => f.severity === 'Critical');
        
        const vulnerabilitiesByProduct = criticalFindings.reduce((acc, f) => {
            const productName = f.test?.engagement?.product?.name;
            if (!productName) return acc;

            const currentVulnerability = acc[productName];
            const newVulnerability = {
                id: f.id,
                title: f.title,
                cve: f.cve || 'N/A',
                cwe: f.cwe ? `CWE-${f.cwe}` : 'Unknown',
                cvssv3_score: f.cvssv3_score || 'N/A',
                severity: f.severity,
            };

            if (!currentVulnerability || cvssToNumber(f.cvssv3_score) > cvssToNumber(currentVulnerability.vulnerability.cvssv3_score)) {
                acc[productName] = { product: productName, vulnerability: newVulnerability };
            }
            
            return acc;
        }, {} as Record<string, { product: string; vulnerability: any }>);

        const results = Object.values(vulnerabilitiesByProduct);

        if (results.length === 0) {
            return JSON.stringify({ message: "No critical vulnerabilities found for any product." });
        }
        
        return JSON.stringify({ vulnerabilitiesByProduct: results }, null, 2);

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

    

    
