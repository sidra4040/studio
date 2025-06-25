'use server';

import { z } from 'zod';

// A simplified schema for demonstration. A real app might have a more detailed one.
const FindingSchema = z.object({
    id: z.number(),
    title: z.string(),
    severity: z.string(),
    description: z.string(),
    mitigation: z.string().nullable(),
    active: z.boolean(),
});

const ApiResponseSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(FindingSchema),
});

/**
 * Fetches findings from the DefectDojo API and returns a summary.
 * @param queryParams - The query string parameters for the API request (e.g., 'severity=Critical').
 * @returns A JSON string summary of the findings for the LLM to process.
 */
export async function getDefectDojoFindings(queryParams: string): Promise<string> {
    const apiUrl = process.env.DEFECTDOJO_API_URL;
    const apiKey = process.env.DEFECTDOJO_API_KEY;

    if (!apiUrl || !apiKey) {
        console.error('DefectDojo API URL or Key is not configured.');
        return JSON.stringify({ error: 'DefectDojo API credentials are not configured on the server.' });
    }

    const fullUrl = `${apiUrl}/api/v2/findings/?${queryParams}`;

    try {
        console.log(`Querying DefectDojo: ${fullUrl}`);
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${apiKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`DefectDojo API Error: ${response.status}`, errorText);
            return JSON.stringify({ error: `Failed to fetch data from DefectDojo. Status: ${response.status}` });
        }

        const data = await response.json();
        const parsedData = ApiResponseSchema.safeParse(data);

        if (!parsedData.success) {
            console.error('Failed to parse DefectDojo API response:', parsedData.error);
            return JSON.stringify({ error: 'Invalid data structure received from DefectDojo API.' });
        }

        if (parsedData.data.results.length === 0) {
            return JSON.stringify({ message: 'No findings found for the specified query.' });
        }
        
        // Return a summary as a JSON string for the LLM to process.
        // Summarize to avoid overly large payloads. We'll take the top 10.
        const summary = {
            totalCount: parsedData.data.count,
            showing: parsedData.data.results.length,
            findings: parsedData.data.results.slice(0, 10).map(f => ({
                title: f.title,
                severity: f.severity,
                active: f.active,
            })),
        };
            
        return JSON.stringify(summary, null, 2);

    } catch (error) {
        console.error('Error calling DefectDojo API:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: `An exception occurred while contacting DefectDojo. Details: ${errorMessage}` });
    }
}
