
'use server';

import { z } from 'zod';
import { PRODUCT_MAP, KNOWN_COMPONENTS } from './defectdojo-maps';


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

const TestTypeSchema = z.object({
    id: z.number(),
    name: z.string(),
});

const TestObjectSchema = z.object({
    id: z.number(),
    test_type: z.union([TestTypeSchema, z.number()]).optional().nullable(),
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
    found_by: z.array(z.number()),
    date: z.string(), // ISO date string
    component_name: z.string().nullable().optional(),
    component_version: z.string().nullable().optional(),
    product_name: z.string().optional().nullable(), 
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

    console.log(`[DefectDojo Fetch] Calling API: ${fullUrl}`);

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
        console.error(`[DefectDojo Fetch] Error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch from DefectDojo: ${response.status} ${response.statusText}. Details: ${errorText}`);
    }
    
    console.log(`[DefectDojo Fetch] Successfully fetched data from: ${fullUrl}`);
    return response.json();
}

/**
 * Fetches all results from a paginated DefectDojo endpoint.
 */
async function defectDojoFetchAll<T>(initialRelativeUrl: string): Promise<T[]> {
    const allResults: T[] = [];
    let nextUrl: string | null = initialRelativeUrl;
    
    while (nextUrl) {
        const data = await defectDojoFetch(nextUrl);
        // Handle both paginated (results property) and non-paginated (direct array) responses
        const results = Array.isArray(data) ? data : (data.results as T[] | undefined);

        if (results && results.length > 0) {
            allResults.push(...results);
        } else if (!('next' in data)) {
            // Handle single object responses which are not in an array
            if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0 && !data.results) {
                return [data as T];
            }
        }

        // Only paginated responses have a 'next' property
        nextUrl = ('next' in data && data.next) ? data.next : null;
    }
    return allResults;
}


async function getProductInfoByName(productName: string): Promise<{ id: number; name: string } | null> {
    const lowerProductName = productName.trim().toLowerCase().replace(/[\s\-_]/g, '');
    
    // Check hardcoded map first for performance
    for (const key in PRODUCT_MAP) {
        if (key.toLowerCase() === lowerProductName || PRODUCT_MAP[key].name.toLowerCase().replace(/[\s\-_]/g, '') === lowerProductName) {
            console.log(`[getProductInfoByName] Found product '${productName}' in cache.`);
            return PRODUCT_MAP[key];
        }
    }
    
    // If not in map, query the API dynamically
    try {
        console.log(`[getProductInfoByName] Product '${productName}' not in cache, querying API...`);
        const products = await defectDojoFetchAll<z.infer<typeof ProductSchema>>(`products/?limit=1000`);
        const foundProduct = products.find(p => 
            p.name.toLowerCase().replace(/[\s\-_]/g, '') === lowerProductName || 
            String(p.id) === lowerProductName
        );
        if (foundProduct) {
             console.log(`[getProductInfoByName] Found product '${productName}' via API.`);
            return { id: foundProduct.id, name: foundProduct.name };
        }
        console.warn(`[getProductInfoByName] Product '${productName}' not found via API.`);
        return null;
    } catch (error) {
        console.error(`[getProductInfoByName] Error fetching product info for ${productName}:`, error);
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

/**
 * Extracts a known component name from a vulnerability title.
 */
function extractComponentFromTitle(title: string): string {
    const lowerTitle = title.toLowerCase();
    for (const component of KNOWN_COMPONENTS) {
        const regex = new RegExp(`\\b${component.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lowerTitle)) {
            return component === 'golang' ? 'go' : component;
        }
    }
    return 'unknown';
}

const GetFindingsInputSchema = z.object({
    productName: z.string().optional(),
    severity: z.string().optional(),
    active: z.boolean().default(true),
    limit: z.number().default(10),
    toolName: z.string().optional(),
    cve: z.string().optional(),
    componentName: z.string().optional(),
});
type GetFindingsInput = z.infer<typeof GetFindingsInputSchema>;

export async function getFindings(input: GetFindingsInput): Promise<string> {
    const { productName, severity, active, limit, toolName, cve, componentName } = GetFindingsInputSchema.parse(input);
    try {
        const queryParams = new URLSearchParams({
            duplicate: 'false',
            active: String(active),
            limit: String(limit),
            prefetch: 'test__test_type,test__engagement__product',
        });

        if (severity) queryParams.set('severity__in', severity);
        if (cve) queryParams.set('cve', cve);

        let requestedProductName = 'All Products';
        if (productName) {
            const productInfo = await getProductInfoByName(productName);
            if (productInfo) {
                queryParams.set('test__engagement__product', String(productInfo.id));
                requestedProductName = productInfo.name;
            } else {
                return JSON.stringify({ message: `Product '${productName}' not found.` });
            }
        }
        
        if (toolName) {
             queryParams.set('test__test_type__name', toolName);
        }
        
        if (componentName) {
            queryParams.set('component_name', componentName);
        }
        
        console.log(`[getFindings] Querying with params: ${queryParams.toString()}`);
        const endpoint = `findings/?${queryParams.toString()}`;
        const data = await defectDojoFetch(endpoint);
        const parsedFindings = FindingListSchema.parse(data);

        if (parsedFindings.results.length === 0) {
            const criteria = [productName, severity, toolName, cve, componentName].filter(Boolean).join(', ');
            return JSON.stringify({ message: `No active vulnerabilities were found for the specified criteria: ${criteria}.` });
        }
        
        const allProductsList = await getProductList();

        return JSON.stringify({
            totalCount: parsedFindings.count,
            showing: parsedFindings.results.length,
            product: requestedProductName,
            findings: parsedFindings.results.map(f => {
                const test = typeof f.test === 'object' ? f.test : null;
                const engagement = typeof test?.engagement === 'object' ? test.engagement : null;
                
                let findingProduct = { id: 0, name: requestedProductName };
                if (typeof engagement?.product === 'object' && engagement.product !== null) {
                    findingProduct = {id: engagement.product.id, name: engagement.product.name};
                } else if (engagement?.product_id){
                    const p = allProductsList.find(p => p.id === engagement.product_id);
                    if(p) findingProduct = p;
                }

                let testTypeName = 'Unknown';
                 if (typeof test?.test_type === 'object' && test.test_type !== null) {
                    testTypeName = test.test_type.name;
                }
                
                return {
                    id: f.id,
                    title: f.title,
                    component: f.component_name || extractComponentFromTitle(f.title) || 'unknown',
                    product: findingProduct.name,
                    cve: f.cve || 'N/A',
                    cwe: f.cwe ? `CWE-${f.cwe}` : 'Unknown',
                    cvssv3_score: f.cvssv3_score || 'N/A',
                    severity: f.severity,
                    tool: testTypeName,
                    date: f.date,
                }
            }),
        }, null, 2);

    } catch (error) {
        return JSON.stringify({ error: `An exception occurred during getFindings. Details: ${error instanceof Error ? error.message : String(error)}` });
    }
}


export async function analyzeVulnerabilityData(analysisType: 'component_risk' | 'tool_comparison' | 'vulnerability_age' | 'cross_product_component_usage' | 'product_risk', productName?: string, severities?: string[], limit: number = 5) {
    try {
        const queryParams = new URLSearchParams({
            active: 'true',
            duplicate: 'false',
            limit: '2000', // Fetch a large batch for analysis
            prefetch: 'test__test_type,test__engagement__product'
        });
        
        console.log(`[analyzeVulnerabilityData] Starting analysis type: ${analysisType}`);

        let productsToAnalyze: {id: number, name: string}[] = [];
        let requestedProductName = 'All Products';
        
        if (productName) {
            const productNames = productName.split(',').map(p => p.trim());
            const productInfos = await Promise.all(productNames.map(name => getProductInfoByName(name)));
            
            productsToAnalyze = productInfos.filter(p => p !== null) as {id: number, name: string}[];

            if (productsToAnalyze.length > 0) {
                const productIds = productsToAnalyze.map(p => p.id);
                if (productIds.length > 1) {
                   queryParams.set('test__engagement__product__in', productIds.join(','));
                   requestedProductName = productsToAnalyze.map(p => p.name).join(', ');
                } else {
                   queryParams.set('test__engagement__product', productIds[0].toString());
                   requestedProductName = productsToAnalyze[0].name;
                }
            } else {
                 console.warn(`[analyzeVulnerabilityData] None of the specified products were found: ${productName}`);
                 return { error: `None of the specified products were found: ${productName}` };
            }
        }


        if (severities && severities.length > 0) {
            queryParams.set('severity__in', severities.join(','));
        }
        
        console.log(`[analyzeVulnerabilityData] Querying findings with params: ${queryParams.toString()}`);
        const allFindings = await defectDojoFetchAll<z.infer<typeof FindingSchema>>(`findings/?${queryParams.toString()}`);
        
        if (allFindings.length === 0) {
            console.log("[analyzeVulnerabilityData] No active findings found for the specified criteria.");
            return { message: "No active findings found for the specified criteria to analyze." };
        }
        
        const allProductsList = await getProductList();

        const findingsWithDetails = allFindings.map(f => {
            const test = typeof f.test === 'object' ? f.test : null;
            const engagement = typeof test?.engagement === 'object' ? test.engagement : null;
            
            let findingProductName = 'Unknown Product';
            let testTypeName = 'Unknown';

            if (engagement?.product_id) {
                const matchedProduct = allProductsList.find(p => p.id === engagement.product_id);
                if (matchedProduct) findingProductName = matchedProduct.name;
            }

            if (typeof test?.test_type === 'object' && test.test_type !== null) {
                testTypeName = test.test_type.name;
            }

            return {
                ...f,
                component: f.component_name || extractComponentFromTitle(f.title) || 'unknown',
                tool: testTypeName,
                product_name: findingProductName
            }
        });
        
        console.log(`[analyzeVulnerabilityData] Processing ${findingsWithDetails.length} findings.`);

        if (analysisType === 'component_risk') {
            const componentVulns: Record<string, { count: number; severities: Record<string, number> }> = {};
            
            for (const f of findingsWithDetails) {
                if (f.component === 'unknown') continue;

                if (!componentVulns[f.component]) {
                    componentVulns[f.component] = { count: 0, severities: {} };
                }
                componentVulns[f.component].count++;
                componentVulns[f.component].severities[f.severity] = (componentVulns[f.component].severities[f.severity] || 0) + 1;
            }

            const sortedComponents = Object.entries(componentVulns)
                .map(([name, data]) => {
                    const critical = data.severities['Critical'] || 0;
                    const high = data.severities['High'] || 0;
                    return { name, ...data, critical, high };
                })
                .sort((a, b) => {
                    if (b.critical !== a.critical) return b.critical - a.critical;
                    if (b.high !== a.high) return b.high - a.high;
                    return b.count - a.count;
                })
                .slice(0, limit);

            return { analysis: 'Component Risk', product: requestedProductName, results: sortedComponents };
        }

        if (analysisType === 'vulnerability_age') {
            const sortedByDate = findingsWithDetails
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, limit);

            return {
                analysis: 'Vulnerability Age',
                product: requestedProductName,
                results: sortedByDate.map(f => ({
                    title: f.title,
                    component: f.component,
                    product: f.product_name,
                    date: f.date,
                    severity: f.severity,
                    id: f.id,
                }))
            };
        }
        
        if (analysisType === 'tool_comparison') {
            const toolStats: Record<string, { count: number; components: Record<string, number>; severities: Record<string, number> }> = {};

            for (const f of findingsWithDetails) {
                if (f.tool === 'Unknown') continue;

                if (!toolStats[f.tool]) {
                    toolStats[f.tool] = { count: 0, components: {}, severities: {} };
                }

                toolStats[f.tool].count++;
                toolStats[f.tool].components[f.component] = (toolStats[f.tool].components[f.component] || 0) + 1;
                toolStats[f.tool].severities[f.severity] = (toolStats[f.tool].severities[f.severity] || 0) + 1;
            }

            const sortedTools = Object.entries(toolStats)
                .map(([name, data]) => {
                    const mostAffectedComponent = Object.entries(data.components).sort((a, b) => b[1] - a[1])[0];
                    return {
                        name,
                        count: data.count,
                        mostAffectedComponent: mostAffectedComponent ? mostAffectedComponent[0] : 'N/A',
                        severities: data.severities
                    };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);

            return { analysis: 'Tool Comparison', product: requestedProductName, results: sortedTools };
        }

        if (analysisType === 'cross_product_component_usage') {
             const componentUsage: Record<string, { products: Set<string>, count: number, critical: number, high: number }> = {};
             
             for (const f of findingsWithDetails) {
                if (f.component === 'unknown' || !f.product_name || f.product_name === 'Unknown Product') continue;
                
                if (!componentUsage[f.component]) {
                    componentUsage[f.component] = { products: new Set(), count: 0, critical: 0, high: 0 };
                }
                
                componentUsage[f.component].products.add(f.product_name);
                componentUsage[f.component].count++;
                if (f.severity === 'Critical') componentUsage[f.component].critical++;
                if (f.severity === 'High') componentUsage[f.component].high++;
             }

             const requiredProductNames = new Set(productsToAnalyze.map(p => p.name));
             const sharedComponents = Object.entries(componentUsage)
                .map(([name, data]) => ({ name, productCount: data.products.size, vuln_count: data.count, critical: data.critical, high: data.high, products: Array.from(data.products) }))
                .filter(c => requiredProductNames.size > 0 ? Array.from(requiredProductNames).every(pName => c.products.includes(pName)) : c.productCount > 1) 
                .sort((a, b) => {
                    if (b.productCount !== a.productCount) return b.productCount - a.productCount;
                    if (b.critical !== a.critical) return b.critical - a.critical;
                    if (b.high !== a.high) return b.high - a.high;
                    return b.vuln_count - a.vuln_count;
                })
                .slice(0, limit);

            return { analysis: 'Cross-Product Component Usage', results: sharedComponents };
        }
        
        if (analysisType === 'product_risk') {
            const productStats: Record<string, { count: number; severities: Record<string, number> }> = {};
            
            for (const f of findingsWithDetails) {
                if (f.product_name === 'Unknown Product') continue;

                if (!productStats[f.product_name]) {
                    productStats[f.product_name] = { count: 0, severities: {} };
                }
                productStats[f.product_name].count++;
                productStats[f.product_name].severities[f.severity] = (productStats[f.product_name].severities[f.severity] || 0) + 1;
            }

            const sortedProducts = Object.entries(productStats)
                .map(([name, data]) => {
                    const critical = data.severities['Critical'] || 0;
                    const high = data.severities['High'] || 0;
                    return { name, ...data, critical, high };
                })
                .sort((a, b) => {
                    if (b.critical !== a.critical) return b.critical - a.critical;
                    if (b.high !== a.high) return b.high - a.high;
                    return b.count - a.count;
                })
                .slice(0, limit);
            
            return { analysis: 'Product Risk', results: sortedProducts };
        }


        return { error: `Analysis type '${analysisType}' is not yet implemented.` };

    } catch (error) {
        console.error(`[analyzeVulnerabilityData] An exception occurred. Details:`, error);
        return { error: `An exception occurred during analysis. Details: ${error instanceof Error ? error.message : String(error)}` };
    }
}


export async function getVulnerabilityCountsByProduct(productName: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0, Total: 0 };
    
    try {
        const productInfo = await getProductInfoByName(productName);
        if (!productInfo) {
            console.error(`[getVulnerabilityCountsByProduct] Product '${productName}' not found.`);
            return counts;
        }

        const allFindings = await defectDojoFetchAll<z.infer<typeof FindingSchema>>(`findings/?test__engagement__product=${productInfo.id}&active=true&duplicate=false`);
        
        for (const finding of allFindings) {
            if (counts[finding.severity] !== undefined) {
                 counts[finding.severity]++;
                 counts.Total++;
            }
        }

        return counts;
    } catch(error) {
        console.error(`[getVulnerabilityCountsByProduct] Could not retrieve counts for ${productName}:`, error);
        return counts; // Return empty counts on error
    }
}


export async function getTotalFindingCount(productName?: string, severity?: string) {
    try {
        const queryParams = new URLSearchParams({
            duplicate: 'false',
            limit: '1',
            active: 'true',
        });
        
        if (productName) {
            const productInfo = await getProductInfoByName(productName);
            if (productInfo) {
                queryParams.set('test__engagement__product', String(productInfo.id));
            }
        }
        if (severity) {
            queryParams.set('severity__in', severity);
        }

        const endpoint = `findings/?${queryParams.toString()}`;
        console.log(`[getTotalFindingCount] Querying with params: ${queryParams.toString()}`);
        const data = await defectDojoFetch(endpoint);
        const parsedData = z.object({ count: z.number() }).parse(data);
        return { count: parsedData.count };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[getTotalFindingCount] Error: ${errorMessage}`);
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
            
            console.log(`[getTopCriticalVulnerabilityPerProduct] Fetching top critical for ${product.name}`);
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

    