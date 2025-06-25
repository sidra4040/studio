'use server';

import { z } from 'zod';

const API_URL = process.env.DEFECTDOJO_API_URL;
const API_KEY = process.env.DEFECTDOJO_API_KEY;

// Schemas for API responses
const ProductSchema = z.object({
    id: z.number(),
    name: z.string(),
});

const ProductListSchema = z.object({
    count: z.number(),
    results: z.array(ProductSchema),
});

const EngagementSchema = z.object({
    id: z.number(),
    name: z.string(),
});

const EngagementListSchema = z.object({
    count: z.number(),
    results: z.array(EngagementSchema),
});


const FindingSchema = z.object({
    id: z.number(),
    title: z.string(),
    severity: z.string(),
    description: z.string(),
    mitigation: z.string().nullable(),
    active: z.boolean(),
    product: z.object({
        id: z.number(),
        name: z.string(),
    }).optional(), // For prefetched data
});

const FindingListSchema = z.object({
    count: z.number(),
    results: z.array(FindingSchema),
});

// A helper to make authenticated requests to the DefectDojo API
async function defectDojoFetch(endpoint: string, options: RequestInit = {}) {
    if (!API_URL || !API_KEY) {
        throw new Error('DefectDojo API URL or Key is not configured.');
    }

    const url = `${API_URL}${endpoint}`;
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
 * Gets a list of all products from DefectDojo.
 */
export async function getProductList() {
    try {
        const data = await defectDojoFetch('/api/v2/products/?limit=1000'); // Assume max 1000 products
        const parsedData = ProductListSchema.safeParse(data);
        if (!parsedData.success) {
            throw new Error('Failed to parse product list from DefectDojo.');
        }
        return parsedData.data.results.map(p => p.name);
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

/**
 * Gets a list of all engagements from DefectDojo.
 */
export async function getEngagementList() {
    try {
        const data = await defectDojoFetch('/api/v2/engagements/?limit=1000');
        const parsedData = EngagementListSchema.safeParse(data);
        if (!parsedData.success) {
            throw new Error('Failed to parse engagement list from DefectDojo.');
        }
        return parsedData.data.results.map(e => e.name);
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}


interface GetFindingsParams {
    productName?: string;
    severity?: string;
    active?: boolean;
    limit?: number;
}
/**
 * Fetches findings from DefectDojo and returns a detailed summary.
 * @param params - The structured parameters for the API request.
 * @returns A JSON string summary of the findings for the LLM to process.
 */
export async function getFindings(params: GetFindingsParams): Promise<string> {
    try {
        let queryParts: string[] = [];
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
            // Filter directly by the product name using the Django REST Framework's double underscore for related fields.
            // This is more efficient and reliable than fetching the product ID first.
            queryParts.push(`product__name=${encodeURIComponent(params.productName)}`);
        }

        const queryParams = queryParts.join('&');
        const data = await defectDojoFetch(`/api/v2/findings/?${queryParams}`);
        const parsedData = FindingListSchema.safeParse(data);

        if (!parsedData.success) {
            console.error('Failed to parse DefectDojo API findings response:', parsedData.error);
            return JSON.stringify({ error: 'Invalid data structure received from DefectDojo API.' });
        }

        if (parsedData.data.results.length === 0) {
            return JSON.stringify({ message: 'No findings found for the specified query.' });
        }
        
        // Return a detailed summary for the LLM to process.
        const summary = {
            totalCount: parsedData.data.count,
            showing: parsedData.data.results.length,
            findings: parsedData.data.results.map(f => ({
                id: f.id,
                title: f.title,
                severity: f.severity,
                active: f.active,
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
 * Gets vulnerability counts by severity for a specific product or all products.
 */
export async function getVulnerabilityCountBySeverity(productName?: string) {
    const severities = ['Critical', 'High', 'Medium', 'Low', 'Info'];
    const counts: Record<string, number> = {};
    let productQuery = '';

    if (productName) {
        // Filter directly by product name. This is more efficient and reliable.
        productQuery = `&product__name=${encodeURIComponent(productName)}`;
    }

    for (const severity of severities) {
        const data = await defectDojoFetch(`/api/v2/findings/?severity=${severity}&active=true&limit=1${productQuery}`);
        counts[severity] = FindingListSchema.parse(data).count;
    }
    return counts;
}

// For KPI Dashboard
export async function getOpenVsClosedCounts() {
    const openData = await defectDojoFetch(`/api/v2/findings/?active=true&limit=1`);
    const closedData = await defectDojoFetch(`/api/v2/findings/?active=false&limit=1`);
    return {
        open: FindingListSchema.parse(openData).count,
        closed: FindingListSchema.parse(closedData).count,
    };
}

export async function getTopVulnerableProducts() {
    const data = await defectDojoFetch('/api/v2/findings/?active=true&limit=1000&prefetch=product');
    const parsedData = FindingListSchema.safeParse(data);
    if (!parsedData.success) {
        throw new Error('Failed to parse top products data from DefectDojo.');
    }

    const counts: Record<string, number> = {};
    for (const finding of parsedData.data.results) {
        if (finding.product) {
            counts[finding.product.name] = (counts[finding.product.name] || 0) + 1;
        }
    }

    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([product, vulnerabilities]) => ({ product, vulnerabilities }));
}
