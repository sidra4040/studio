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
