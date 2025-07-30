"use server";

import {
  answerVulnerabilityQuestions as answerVulnerabilityQuestionsFlow,
  type AnswerVulnerabilityQuestionsInput,
  type AnswerVulnerabilityQuestionsOutput,
} from "@/ai/flows/answer-vulnerability-questions";
import {
    getKpiData as getKpiDataFlow,
    type KpiData,
} from "@/ai/flows/get-kpi-data";
import {
    getProductKpiData as getProductKpiDataFlow,
    type ProductKpiData,
    type ProductKpiInput
} from "@/ai/flows/get-product-kpi-data";


export async function answerVulnerabilityQuestions(
  input: AnswerVulnerabilityQuestionsInput
): Promise<AnswerVulnerabilityQuestionsOutput> {
  return await answerVulnerabilityQuestionsFlow(input);
}

export async function getKpiData(): Promise<KpiData> {
    return await getKpiDataFlow();
}

export async function getProductKpiData(input: ProductKpiInput): Promise<ProductKpiData> {
    return await getProductKpiDataFlow(input);
}
