
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

const FindingCountSchema = z.object({
    count: z.number(),
});

const EngagementSchema = z.object({
    id: z.number(),
    name: z.string(),
    product: z.object({ id: z.number(), name: z.string() }).optional().nullable(),
    product_id: z.number().optional().nullable(),
});

const TestObjectSchema = z.object({
    id: z.number(),
    test_type: z.object({ 
        id: z.number(),
        name: z.string() 
    }).optional().nullable(),
    engagement: EngagementSchema.optional().nullable(),
});

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
    test: TestObjectSchema.optional().nullable(),
});


const FindingListSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    results: z.array(FindingSchema),
});

const findingsCache = {
    findings: [] as z.infer<typeof FindingSchema>[],
    lastFetched: 0,
    ttl: 5 * 60 * 1000, // 5 minute cache
};

// A helper to make authenticated requests to the DefectDojo API
async function defectDojoFetch(url: string, options: RequestInit = {}) {
    if (!API_URL || !API_KEY) {
        throw new Error('DefectDojo API URL or Key is not configured.');
    }

    const fullUrl = url.startsWith('http') ? url : `${API_URL.replace(/\/$/, '')}/api/v2/${url.replace(/^\//, '')}`;
    
    console.log(`Querying DefectDojo: ${fullUrl}`);

    const response = await fetch(fullUrl, {
        ...options,
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'Authorization': `Token ${API_KEY}`,
        },
        cache: 'no-store', // Ensure fresh data is fetched
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching from DefectDojo. URL: ${fullUrl}, Status: ${response.status}`);
        throw new Error(`Failed to fetch from DefectDojo: ${response.status} ${response.statusText}. Details: ${errorText}`);
    }

    return response.json();
}

/**
 * Fetches all results from a paginated DefectDojo endpoint, ensuring that
 * essential query parameters (like `prefetch`) are preserved across all pages.
 */
async function defectDojoFetchAll<T>(initialRelativeUrl: string): Promise<T[]> {
    let results: T[] = [];
    let nextUrl: string | null = initialRelativeUrl;
    
    const initialUrlObject = new URL(`${API_URL}/api/v2/${initialRelativeUrl}`);
    const prefetchParam = initialUrlObject.searchParams.get('prefetch');

    while (nextUrl) {
        let urlToFetch: string;

        // The 'next' URL from DefectDojo is a full URL. Use it directly.
        // Otherwise, construct the full URL from the relative path.
        if (nextUrl.startsWith('http')) {
            urlToFetch = nextUrl;
        } else {
            urlToFetch = `${API_URL.replace(/\/$/, '')}/api/v2/${nextUrl.replace(/^\//, '')}`;
        }
        
        const urlObj = new URL(urlToFetch);

        // Ensure the prefetch parameter is present on all subsequent requests if it was in the initial one.
        if (prefetchParam && !urlObj.searchParams.has('prefetch')) {
            urlObj.searchParams.set('prefetch', prefetchParam);
        }

        const data = await defectDojoFetch(urlObj.href);
        if (data.results) {
            results = results.concat(data.results);
        }
        
        nextUrl = data.next;
    }
    return results;
}

export async function getCachedAllFindings(): Promise<z.infer<typeof FindingSchema>[]> {
    const now = Date.now();
    if (findingsCache.findings.length > 0 && now - findingsCache.lastFetched < findingsCache.ttl) {
        console.log("Returning findings from cache.");
        return findingsCache.findings;
    }

    console.log("Cache is stale or empty. Fetching all active findings from API.");
    const endpoint = 'findings/?active=true&duplicate=false&prefetch=test__engagement__product,test__test_type&limit=100';
    
    const allRawFindings = await defectDojoFetchAll<any>(endpoint);
    
    const successfullyParsedFindings: z.infer<typeof FindingSchema>[] = [];
    const parsingErrors: any[] = [];
    
    for (const finding of allRawFindings) {
        const result = FindingSchema.safeParse(finding);
        if (result.success) {
            successfullyParsedFindings.push(result.data);
        } else {
            parsingErrors.push({
                findingId: finding.id,
                errors: result.error.issues,
            });
        }
    }
    
    if (parsingErrors.length > 0) {
        console.warn(`Encountered ${parsingErrors.length} findings with parsing errors. They will be excluded from the summary. First error:`, parsingErrors[0]);
    }

    findingsCache.findings = successfullyParsedFindings;
    findingsCache.lastFetched = now;
    console.log(`Successfully fetched and parsed ${successfullyParsedFindings.length} findings.`);
    return successfullyParsedFindings;
}

function cvssToNumber(score: string | number | null | undefined): number {
    if (typeof score === 'number') return score;
    if (typeof score === 'string') {
        const num = parseFloat(score);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

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
        return null;
    }
}

export async function getProductList(): Promise<{id: number, name: string}[]> {
    try {
        const products = await defectDojoFetchAll<z.infer<typeof ProductSchema>>('products/?limit=200');
        const productList = products.map(p => ({ id: p.id, name: p.name })).filter(p => !!p.name);
        productList.sort((a, b) => a.name.localeCompare(b.name));
        return productList;
    } catch (error) {
        console.error("Failed to fetch product list", error);
        return [];
    }
}

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

export async function getFindings(params: GetFindingsParams): Promise<string> {
    try {
        const queryParams = new URLSearchParams();
        queryParams.set('duplicate', 'false');
        queryParams.set('active', params.active !== undefined ? String(params.active) : 'true');

        if (params.severity) queryParams.set('severity', params.severity);
        if (params.limit) queryParams.set('limit', String(params.limit));
        
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

        return JSON.stringify({
            totalCount: parsedFindings.data.count,
            showing: parsedFindings.data.results.length,
            findings: parsedFindings.data.results.map(f => ({
                id: f.id,
                title: f.title,
                cve: f.cve || 'N/A',
                cwe: f.cwe ? `CWE-${f.cwe}` : 'Unknown',
                cvssv3_score: f.cvssv3_score || 'N/A',
                severity: f.severity,
                tool: (typeof f.test === 'object' && f.test?.test_type?.name) || 'Unknown',
                description: f.description,
                mitigation: f.mitigation,
            })),
        }, null, 2);

    } catch (error) {
        return JSON.stringify({ error: `An exception occurred. Details: ${error instanceof Error ? error.message : String(error)}` });
    }
}

export async function getVulnerabilityCountsByProduct(productName: string): Promise<Record<string, number>> {
    const severities = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
    
    try {
        const targetProductId = await getProductIDByName(productName);
        if (!targetProductId) {
            console.error(`Product '${productName}' not found.`);
            return counts;
        }

        // We can use the cached findings to avoid another network call
        const allFindings = await getCachedAllFindings();
        
        const productFindings = allFindings.filter(f => {
            const engagement = f.test?.engagement;
            if (!engagement) return false;

            // Check direct product link first
            if (engagement.product?.id === targetProductId) {
                return true;
            }
            // Fallback to product_id on engagement
            if (engagement.product_id === targetProductId) {
                return true;
            }
            return false;
        });

        for (const finding of productFindings) {
            if (counts[finding.severity] !== undefined) {
                counts[finding.severity]++;
            }
        }
        
        return counts;
    } catch(error) {
        console.error(`Could not retrieve counts for ${productName}:`, error);
        return counts;
    }
}


export async function getOpenVsClosedCounts() {
    try {
        const [openData, closedData] = await Promise.all([
            defectDojoFetch(`findings/?active=true&duplicate=false&limit=1`),
            defectDojoFetch(`findings/?active=false&duplicate=false&limit=1`)
        ]);
        
        return {
            open: FindingCountSchema.parse(openData).count,
            closed: FindingCountSchema.parse(closedData).count,
        };
    } catch (error) {
        console.error("Failed to fetch open/closed counts", error);
        return { error: "Failed to fetch open/closed counts", open: 0, closed: 0 };
    }
}

export async function getProductVulnerabilitySummary() {
    try {
        const allFindings = await getCachedAllFindings();
        if (!allFindings || allFindings.length === 0) {
            return {};
        }
        
        const PRODUCT_ID_MAP: Record<number, string> = Object.values(PRODUCT_MAP).reduce((acc, product) => {
            acc[product.id] = product.name;
            return acc;
        }, {} as Record<number, string>);

        const summary: Record<string, Record<string, number>> = {};
        
        for (const finding of allFindings) {
            let productName: string | undefined | null = finding.test?.engagement?.product?.name;
            if (!productName && finding.test?.engagement?.product_id) {
                productName = PRODUCT_ID_MAP[finding.test.engagement.product_id];
            }

            if (productName) {
                if (!summary[productName]) {
                    summary[productName] = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, Total: 0 };
                }
                const severity = finding.severity;
                if (summary[productName][severity] !== undefined) {
                    summary[productName][severity]++;
                }
                summary[productName].Total++;
            }
        }
        
        return summary;
    } catch(error) {
        console.error("Failed to get product vulnerability summary", error);
        return {};
    }
}

export async function getTotalFindingCount() {
    try {
        const data = await defectDojoFetch(`findings/?duplicate=false&limit=1`);
        return { count: FindingCountSchema.parse(data).count };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { error: `Failed to retrieve total finding count: ${errorMessage}` };
    }
}

export async function getTopCriticalVulnerabilityPerProduct(): Promise<string> {
    try {
        const allFindings = await getCachedAllFindings();
        const criticalFindings = allFindings.filter(f => f.severity === 'Critical');
        
        const PRODUCT_ID_MAP: Record<number, string> = Object.values(PRODUCT_MAP).reduce((acc, product) => {
            acc[product.id] = product.name;
            return acc;
        }, {} as Record<number, string>);
        
        const vulnerabilitiesByProduct = criticalFindings.reduce((acc, f) => {
            let productName: string | undefined | null = f.test?.engagement?.product?.name;
            if (!productName && f.test?.engagement?.product_id) {
                productName = PRODUCT_ID_MAP[f.test.engagement.product_id];
            }

            if (!productName) {
                return acc;
            }
            
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: `An exception occurred: ${errorMessage}` });
    }
}

export async function getComponentImpact(componentName: string) {
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

        return {
            componentName,
            vulnerabilityCount: componentFindings.length,
            criticalCount,
            highCount,
            riskReductionPercent: parseFloat(riskReductionPercent.toFixed(1)),
            sampleVulnerabilities: topCriticalVulnerabilities,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { error: `Failed to analyze component impact. Details: ${errorMessage}` };
    }
}

export async function getTopRiskyComponents(limit: number = 5) {
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
        
        return {
            topComponents: sortedComponents.slice(0, limit)
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { error: `Failed to analyze top risky components. Details: ${errorMessage}` };
    }
}
