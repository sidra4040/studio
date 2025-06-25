'use server';
/**
 * @fileOverview An AI flow to retrieve and aggregate KPI data for the dashboard.
 * 
 * - getKpiData - A function that fetches data for the KPI dashboard.
 * - KpiData - The return type for the getKpiData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { answerVulnerabilityQuestions } from './answer-vulnerability-questions';

const KpiDataSchema = z.object({
    vulnerabilitiesBySeverity: z.array(z.object({
        severity: z.string(),
        count: z.number(),
    })).describe('Data for vulnerabilities by severity chart.'),
    openVsClosed: z.array(z.object({
        name: z.string(),
        value: z.number(),
        fill: z.string(),
    })).describe('Data for open vs. closed findings chart.'),
    topVulnerableProducts: z.array(z.object({
        product: z.string(),
        vulnerabilities: z.number(),
    })).describe('Data for top 5 vulnerable products chart.'),
});

export type KpiData = z.infer<typeof KpiDataSchema>;

// This function simulates fetching real data. In a real-world scenario,
// you would replace this with actual calls to your data sources (e.g., DefectDojo API).
// For demonstration, we'll return static data after a short delay to simulate network latency.
async function getKpiDataFlow(): Promise<KpiData> {
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const kpiData: KpiData = {
        vulnerabilitiesBySeverity: [
            { severity: 'Critical', count: 15 },
            { severity: 'High', count: 45 },
            { severity: 'Medium', count: 120 },
            { severity: 'Low', count: 250 },
            { severity: 'Info', count: 300 },
        ],
        openVsClosed: [
            { name: 'Open', value: 180, fill: 'hsl(var(--destructive))' },
            { name: 'Closed', value: 550, fill: 'hsl(var(--chart-2))' },
        ],
        topVulnerableProducts: [
            { product: 'Legacy API', vulnerabilities: 78 },
            { product: 'Mobile App v2', vulnerabilities: 55 },
            { product: 'Data Processor', vulnerabilities: 42 },
            { product: 'WebApp Gateway', vulnerabilities: 31 },
            { product: 'Internal Dashboard', vulnerabilities: 25 },
        ]
    };
    
    return kpiData;
}

export async function getKpiData(): Promise<KpiData> {
    // In a real implementation, you might use a Genkit flow here to orchestrate
    // multiple data fetching tools. For this example, we call our simulated function.
    return getKpiDataFlow();
}
