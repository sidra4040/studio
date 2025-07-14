
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


function cvssToNumber(score: string | number | null | undefined): number {
    if (typeof score === 'number') return score;
    if (typeof score === 'string') {
        const num = parseFloat(score);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

async function getProductInfoByName(productName: string): Promise<{ id: number; name: string } | null> {
    const lowerProductName = productName.trim().toLowerCase();
    
    const idNumber = parseInt(lowerProductName, 10);
    if (!isNaN(idNumber)) {
        const productById = Object.values(PRODUCT_MAP).find(p => p.id === idNumber);
        if (productById) return productById;
    }

    for (const key in PRODUCT_MAP) {
        if (key === lowerProductName || PRODUCT_MAP[key].name.toLowerCase() === lowerProductName) {
            return PRODUCT_MAP[key];
        }
    }

    try {
        const products = await defectDojoFetchAll<z.infer<typeof ProductSchema>>(`products/?name__icontains=${encodeURIComponent(lowerProductName)}`);
        if (products.length > 0) {
            return { id: products[0].id, name: products[0].name };
        }
        return null;
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

export async function getFindings(productName?: string, severity?: string, active?: boolean, limit?: number, toolName?: string): Promise<string> {
    try {
        const queryParams = new URLSearchParams({
            duplicate: 'false',
            active: active !== undefined ? String(active) : 'true',
            limit: String(limit || 10),
            prefetch: 'test__test_type',
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
            console.error(`Product '${productName}' not found.`);
            return counts;
        }

        const allFindings = await getCachedAllFindings();
        
        const productFindings = allFindings.filter(f => {
            if (typeof f.test !== 'object' || !f.test || !f.test.engagement) return false;
            const engagement = f.test.engagement;
            if (typeof engagement.product === 'object' && engagement.product?.id === productInfo.id) {
                return true;
            }
            if (engagement.product_id === productInfo.id) {
                return true;
            }
            // Fallback for when product isn't directly linked but is in engagement name
            if (engagement.name.toLowerCase().includes(productInfo.name.toLowerCase())) {
                 return true;
            }
            return false;
        });

        for (const finding of productFindings) {
            if (counts[finding.severity] !== undefined) {
                counts[finding.severity]++;
                counts.Total++;
            }
        }

        return counts;
    } catch(error) {
        console.error(`Could not retrieve counts for ${productName}:`, error);
        return counts;
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
            if (typeof finding.test !== 'object' || !finding.test || !finding.test.engagement) continue;
            
            let productName: string | undefined | null = null;
            if(typeof finding.test.engagement.product === 'object' && finding.test.engagement.product) {
                productName = finding.test.engagement.product.name;
            } else if (finding.test.engagement.product_id) {
                productName = PRODUCT_ID_MAP[finding.test.engagement.product_id];
            }
            
            if (!productName) {
                const engagementName = finding.test.engagement.name.toLowerCase();
                for (const key in PRODUCT_MAP) {
                    if (engagementName.includes(key) || engagementName.includes(PRODUCT_MAP[key].name.toLowerCase())) {
                        productName = PRODUCT_MAP[key].name;
                        break;
                    }
                }
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

export async function getTopCriticalVulnerabilityPerProduct(): Promise<string> {
    try {
        const allFindings = await getCachedAllFindings();
        const criticalFindings = allFindings.filter(f => f.severity === 'Critical');

        const PRODUCT_ID_MAP: Record<number, string> = Object.values(PRODUCT_MAP).reduce((acc, product) => {
            acc[product.id] = product.name;
            return acc;
        }, {} as Record<number, string>);

        const vulnerabilitiesByProduct = criticalFindings.reduce((acc, f) => {
            if (typeof f.test !== 'object' || !f.test || !f.test.engagement) return acc;

            let productName: string | undefined | null = null;
            if(typeof f.test.engagement.product === 'object' && f.test.engagement.product) {
                productName = f.test.engagement.product.name;
            } else if (f.test.engagement.product_id) {
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

export async function getTopRiskyComponents(limit: number = 5, productName?: string) {
    try {
        let allFindingsData = await getCachedAllFindings();
        let productInfo: { id: number; name: string } | null = null;

        if (productName) {
            productInfo = await getProductInfoByName(productName);
            if (productInfo) {
                allFindingsData = allFindingsData.filter(f => {
                    if (typeof f.test !== 'object' || !f.test || !f.test.engagement) return false;
                    const engagement = f.test.engagement;
                    if (typeof engagement.product === 'object' && engagement.product?.id === productInfo.id) {
                        return true;
                    }
                    if (engagement.product_id === productInfo.id) {
                        return true;
                    }
                    // Fallback for when product isn't directly linked but is in engagement name
                    if (engagement.name.toLowerCase().includes(productInfo.name.toLowerCase())) {
                        return true;
                    }
                    return false;
                });
            } else {
                 return { error: `Product '${productName}' not found.` };
            }
        }

        if (!allFindingsData || allFindingsData.length === 0) {
            return { error: `No active findings found to analyze for ${productName || 'any product'}.` };
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
            const componentPattern = new RegExp(`\\b${componentName}\\b`, 'i');
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
