"use server";

import {
  answerVulnerabilityQuestions as answerVulnerabilityQuestionsFlow,
  type AnswerVulnerabilityQuestionsInput,
  type AnswerVulnerabilityQuestionsOutput,
} from "@/ai/flows/answer-vulnerability-questions";
import {
  generateDefectDojoQueries as generateDefectDojoQueriesFlow,
  type GenerateDefectDojoQueriesInput,
  type GenerateDefectDojoQueriesOutput,
} from "@/ai/flows/generate-defectdojo-queries";
import {
    getKpiData as getKpiDataFlow,
    type KpiData,
} from "@/ai/flows/get-kpi-data";
import {
    getProductKpiData as getProductKpiDataFlow,
    type ProductKpiData,
    type ProductKpiDataInput,
} from "@/ai/flows/get-product-kpi-data";
import {
    getProductAnalysis as getProductAnalysisFlow,
    type GetProductAnalysisInput,
    type GetProductAnalysisOutput,
} from "@/ai/flows/get-product-analysis";

export async function answerVulnerabilityQuestions(
  input: AnswerVulnerabilityQuestionsInput
): Promise<AnswerVulnerabilityQuestionsOutput> {
  return await answerVulnerabilityQuestionsFlow(input);
}

export async function generateDefectDojoQueries(
  input: GenerateDefectDojoQueriesInput
): Promise<GenerateDefectDojoQueriesOutput> {
  return await generateDefectDojoQueriesFlow(input);
}

export async function getKpiData(): Promise<KpiData> {
    return await getKpiDataFlow();
}

export async function getProductKpiData(
    input: ProductKpiDataInput
): Promise<ProductKpiData> {
    return await getProductKpiDataFlow(input);
}

export async function getProductAnalysis(
    input: GetProductAnalysisInput
): Promise<GetProductAnalysisOutput> {
    return await getProductAnalysisFlow(input);
}
