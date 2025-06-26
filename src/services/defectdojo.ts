'use server';

import { z } from 'zod';

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


const FindingSchema = z.object({
    id: z.number(),
    title: z.string(),
    severity: z.string(),
    description: z.string(),
    mitigation: z.string().nullable().optional(),
    active: z.boolean(),
    product: z.object({
        id: z.number(),
        name: z.string(),
    }).optional(), // For prefetched data
    cwe: z.number().nullable(),
    cve: z.string().nullable().optional(),
    cvssv3_score: z.union([z.string(), z.number()]).nullable().optional(),
    test: z.any().optional(),
});

const FindingListSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    results: z.array(FindingSchema),
});

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
 * Fetches all results from a paginated DefectDojo endpoint.
 * @param endpoint The initial endpoint to query.
 * @returns A flattened array of all results.
 */
async function defectDojoFetchAll<T>(endpoint: string): Promise<T[]> {
    let results: T[] = [];
    let nextUrl: string | null = endpoint;

    while (nextUrl) {
        const data = await defectDojoFetch(nextUrl);
        results = results.concat(data.results);
        nextUrl = data.next;
    }

    return results;
}


/**
 * Finds a product by name (case-insensitive) and returns its ID.
 * @param productName The name of the product to find.
 * @returns The product ID, or null if not found.
 */
async function getProductIDByName(productName: string): Promise<number | null> {
    try {
        const products = await defectDojoFetchAll<z.infer<typeof ProductSchema>>('products/?limit=1000');
        const product = products.find(p => p.name.trim().toLowerCase() === productName.trim().toLowerCase());
        return product ? product.id : null;
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


interface GetFindingsParams {
    productName?: string;
    severity?: string;
    active?: boolean;
    limit?: number;
    toolName?: string;
}
/**
 * Fetches findings from DefectDojo and returns a detailed summary.
 * Correctly filters by product using test__engagement__product.
 */
export async function getFindings(params: GetFindingsParams): Promise<string> {
    try {
        const queryParts: string[] = [`duplicate=false`];
        
        if (params.active !== undefined) {
            queryParts.push(`active=${params.active}`);
        }
        if (params.severity) {
            queryParts.push(`severity=${params.severity}`);
        }
        if (params.limit) {
            queryParts.push(`limit=${params.limit}`);
        }

        if (params.productName) {
            const productId = await getProductIDByName(params.productName);
            if (productId === null) {
                return JSON.stringify({ message: `Product with name '${params.productName}' not found.` });
            }
            queryParts.push(`test__engagement__product=${productId}`);
        }
       
        if (params.toolName) {
            queryParts.push(`test__test_type__name=${params.toolName}`);
        }

        // Prefetch related data to get tool name and product info
        queryParts.push('prefetch=product', 'prefetch=test__test_type');

        const queryParams = queryParts.join('&');
        const data = await defectDojoFetch(`findings/?${queryParams}`);
        const parsedData = FindingListSchema.safeParse(data);

        if (!parsedData.success) {
            console.error('Failed to parse DefectDojo API findings response:', parsedData.error);
            return JSON.stringify({ error: 'Invalid data structure received from DefectDojo API.' });
        }

        if (parsedData.data.results.length === 0) {
             const message = `No active ${params.severity || ''} vulnerabilities were found for the product "${params.productName || 'any product'}" ${params.toolName ? `from the tool "${params.toolName}"` : ''}.`;
            return JSON.stringify({ message });
        }
        
        const summary = {
            totalCount: parsedData.data.count,
            showing: parsedData.data.results.length,
            productName: params.productName || 'All Products',
            findings: parsedData.data.results.map(f => ({
                id: f.id,
                title: f.title,
                cve: f.cve || 'N/A',
                cwe: f.cwe ? `CWE-${f.cwe}` : 'Unknown',
                cvssv3_score: f.cvssv3_score || 'N/A',
                severity: f.severity,
                tool: (f.test && typeof f.test === 'object' && !Array.isArray(f.test) && f.test.test_type?.name) || 'Unknown',
                description: f.description,
                mitigation: f.mitigation || 'Not specified.',
            })),
        };
            
        return JSON.stringify(summary, null, 2);
    } catch (error) {
        console.error('Error calling DefectDojo API for findings:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: `An exception occurred while contacting DefectDojo. Details: ${errorMessage}` });
    }
}

/**
 * Gets vulnerability counts by severity for a specific product.
 * Correctly filters by product using test__engagement__product.
 */
export async function getVulnerabilityCountBySeverity(productName: string) {
    const severities = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    const counts: Record<string, number> = {};
    
    const productId = await getProductIDByName(productName);
    if (productId === null) {
        return { error: `Product '${productName}' not found.` };
    }
    const productFilter = `&test__engagement__product=${productId}&duplicate=false`;

    // Use Promise.all to fetch counts in parallel for better performance
    const countPromises = severities.map(async (severity) => {
        const data = await defectDojoFetch(`findings/?severity=${severity}&active=true&limit=1${productFilter}`);
        const parsedData = FindingListSchema.parse(data);
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
}

// For KPI Dashboard & Aggregate Queries
export async function getOpenVsClosedCounts() {
    const openData = await defectDojoFetch(`findings/?active=true&limit=1&duplicate=false`);
    const closedData = await defectDojoFetch(`findings/?active=false&limit=1&duplicate=false`);
    return {
        open: FindingListSchema.parse(openData).count,
        closed: FindingListSchema.parse(closedData).count,
    };
}

export async function getProductVulnerabilitySummary() {
    // Fetches all active findings using pagination and aggregates counts by product.
    const allFindings = await defectDojoFetchAll<z.infer<typeof FindingSchema>>(
        'findings/?active=true&duplicate=false&limit=1000&prefetch=product'
    );

    const summary: Record<string, { Critical: number, High: number, Medium: number, Low: number, Info: number, Total: number }> = {};

    for (const finding of allFindings) {
        if (finding.product) {
            const productName = finding.product.name;
            if (!summary[productName]) {
                summary[productName] = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, Total: 0 };
            }
            const severity = finding.severity as keyof typeof summary[string];
            if (summary[productName][severity] !== undefined) {
                summary[productName][severity]++;
            }
            summary[productName].Total++;
        }
    }

    return summary;
}

export async function getTotalFindingCount() {
    try {
        const data = await defectDojoFetch('findings/?limit=1&duplicate=false');
        return { count: FindingListSchema.parse(data).count };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { error: `Failed to retrieve total finding count: ${errorMessage}` };
    }
}
