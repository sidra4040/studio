
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
    product: z.union([ProductSchema, z.number()]).optional().nullable(),
    product_id: z.number().optional().nullable(),
});

const TestObjectSchema = z.object({
    id: z.number(),
    test_type: z.object({
        id: z.number(),
        name: z.string()
    }).optional().nullable(),
    engagement: z.union([EngagementSchema, z.number()]).optional().nullable(),
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
    test: z.union([TestObjectSchema, z.number()]).optional().nullable(),
});


const FindingListSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    results: z.array(FindingSchema),
});

// A helper to make authenticated requests to the DefectDojo API
async function defectDojoFetch(url: string, options: RequestInit = {}) {
    if (!API_URL || !API_KEY) {
        throw new Error('DefectDojo API URL or Key is not configured.');
    }

    const fullUrl = url.startsWith('http') ? url : `${API_URL.replace(/\/$/, '')}/api/v2/${url.replace(/^\//, '')}`;

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
        throw new Error(`Failed to fetch from DefectDojo: ${response.status} ${response.statusText}. Details: ${errorText}`);
    }

    return response.json();
}

/**
 * Fetches all results from a paginated DefectDojo endpoint.
 */
async function defectDojoFetchAll<T>(initialRelativeUrl: string): Promise<T[]> {
    const allResults: T[] = [];
    let nextUrl: string | null = initialRelativeUrl;
    
    while (nextUrl) {
        // The 'next' URL from DefectDojo is absolute, so we can use it directly.
        const data = await defectDojoFetch(nextUrl);
        const results = data.results as T[] | undefined;

        if (results && results.length > 0) {
            allResults.push(...results);
        }

        nextUrl = data.next;
    }
    return allResults;
}

let allFindingsCache: z.infer<typeof FindingSchema>[] | null = null;
async function getCachedAllFindings(): Promise<z.infer<typeof FindingSchema>[]> {
     if (allFindingsCache) {
        return allFindingsCache;
    }
    const endpoint = 'findings/?active=true&duplicate=false&prefetch=test,test__engagement,test__engagement__product,test__test_type&limit=100';

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
        console.warn(`Encountered ${parsingErrors.length} findings with parsing errors. They will be excluded from the summary. First error:`, JSON.stringify(parsingErrors[0], null, 2));
    }
    
    allFindingsCache = successfullyParsedFindings;
    return allFindingsCache;
}


async function getProductInfoByName(productName: string): Promise<{ id: number; name: string } | null> {
    const lowerProductName = productName.trim().toLowerCase();
    
    const idNumber = parseInt(lowerProductName, 10);
    if (!isNaN(idNumber)) {
        const productById = Object.values(PRODUCT_MAP).find(p => p.id === idNumber);
        if (productById) return productById;
    }

    for (const key in PRODUCT_MAP) {
        if (key === lowerProductName || PRODUCT_MAP[key].name.toLowerCase() === lowerProductName || PRODUCT_MAP[key].name.toLowerCase().replace(/ /g, '') === lowerProductName) {
            return PRODUCT_MAP[key];
        }
    }
    
    try {
        const products = await defectDojoFetchAll<z.infer<typeof ProductSchema>>(`products/?limit=1000`);
        const foundProduct = products.find(p => p.name.toLowerCase() === lowerProductName || String(p.id) === lowerProductName);
        if (foundProduct) {
            return { id: foundProduct.id, name: foundProduct.name };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching product info for ${productName}:`, error);
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

export async function getFindings(productName?: string, severity?: string, active?: boolean, limit?: number, toolName?: string): Promise<string> {
    try {
        const queryParams = new URLSearchParams({
            duplicate: 'false',
            active: active !== undefined ? String(active) : 'true',
            limit: String(limit || 10),
            prefetch: 'product,test__test_type',
        });

        if (severity) {
            queryParams.set('severity', severity);
        }

        let productId: number | null = null;
        if (productName) {
            const productInfo = await getProductInfoByName(productName);
            if (productInfo) {
                productId = productInfo.id;
                queryParams.set('test__engagement__product', String(productId));
            } else {
                return JSON.stringify({ message: `Product '${productName}' not found.` });
            }
        }

        if (toolName) {
            const lowerToolName = toolName.toLowerCase().trim();
            const toolKey = Object.keys(TOOL_ENGAGEMENT_MAP).find(key => key.includes(lowerToolName));
            const tool = toolKey ? TOOL_ENGAGEMENT_MAP[toolKey] : null;

            if (tool) {
                queryParams.set('test__engagement', String(tool.id));
            } else {
                return JSON.stringify({ message: `Tool '${toolName}' not found.` });
            }
        }

        const endpoint = `findings/?${queryParams.toString()}`;
        const data = await defectDojoFetch(endpoint);
        const parsedFindings = FindingListSchema.parse(data);

        if (parsedFindings.results.length === 0) {
            const criteria = [severity, productName, toolName].filter(Boolean).join(', ');
            return JSON.stringify({ message: `No active vulnerabilities were found for the specified criteria: ${criteria}.` });
        }

        return JSON.stringify({
            totalCount: parsedFindings.count,
            showing: parsedFindings.results.length,
            findings: parsedFindings.results.map(f => ({
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
        return JSON.stringify({ error: `An exception occurred during getFindings. Details: ${error instanceof Error ? error.message : String(error)}` });
    }
}

export async function getVulnerabilityCountsByProduct(productName: string): Promise<Record<string, number>> {
    const severities = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, Total: 0 };
    
    try {
        const productInfo = await getProductInfoByName(productName);
        if (!productInfo) {
            console.error(`Product '${productName}' not found for counts.`);
            return counts;
        }

        for (const severity of severities) {
            const data = await defectDojoFetch(`findings/?test__engagement__product=${productInfo.id}&severity=${severity}&active=true&duplicate=false&limit=1`);
            const parsedData = z.object({ count: z.number() }).parse(data);
            counts[severity] = parsedData.count;
            counts.Total += parsedData.count;
        }

        return counts;
    } catch(error) {
        console.error(`Could not retrieve counts for ${productName}:`, error);
        return counts; // Return empty counts on error
    }
}


export async function getTotalFindingCount() {
    try {
        const data = await defectDojoFetch(`findings/?duplicate=false&limit=1`);
        const parsedData = z.object({ count: z.number() }).parse(data);
        return { count: parsedData.count };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { error: `Failed to retrieve total finding count: ${errorMessage}` };
    }
}

export async function getProductVulnerabilitySummary() {
    try {
        const allProducts = await getProductList();
        const summary: Record<string, Record<string, number>> = {};

        for (const product of allProducts) {
             if (!product.name) continue;
             summary[product.name] = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, Total: 0 };
             const counts = await getVulnerabilityCountsByProduct(product.name);
             summary[product.name] = counts;
        }
        return summary;

    } catch(error) {
        console.error("Failed to get product vulnerability summary", error);
        return {};
    }
}


export async function getTopCriticalVulnerabilityPerProduct(): Promise<string> {
    try {
        const allProducts = await getProductList();
        const vulnerabilitiesByProduct = [];

        for (const product of allProducts) {
            if (!product.id || !product.name) continue;

            const data = await defectDojoFetch(`findings/?test__engagement__product=${product.id}&severity=Critical&active=true&duplicate=false&limit=1&ordering=-cvssv3_score`);
            const parsedFindings = FindingListSchema.parse(data);

            if (parsedFindings.results.length > 0) {
                const f = parsedFindings.results[0];
                 vulnerabilitiesByProduct.push({
                    product: product.name,
                    vulnerability: {
                        id: f.id,
                        title: f.title,
                        cve: f.cve || 'N/A',
                        cwe: f.cwe ? `CWE-${f.cwe}` : 'Unknown',
                        cvssv3_score: f.cvssv3_score || 'N/A',
                        severity: f.severity,
                    }
                });
            }
        }

        if (vulnerabilitiesByProduct.length === 0) {
            return JSON.stringify({ message: "No critical vulnerabilities found for any product." });
        }

        return JSON.stringify({ vulnerabilitiesByProduct }, null, 2);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: `An exception occurred: ${errorMessage}` });
    }
}

// THIS FUNCTION IS NO LONGER USED AND WILL BE REMOVED
export async function getComponentImpact(componentName: string) {
    return { error: "This function is deprecated." };
}

// THIS FUNCTION IS NO LONGER USED AND WILL BE REMOVED
export async function getTopRiskyComponents(limit: number = 5, productName?: string) {
    // Re-implement this to be efficient if needed in the future,
    // for now, the AI will use get_findings.
    return { error: "This function is deprecated." };
}
