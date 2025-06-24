"use server";

import {
  answerVulnerabilityQuestions as answerVulnerabilityQuestionsFlow,
  type AnswerVulnerabilityQuestionsInput,
  type AnswerVulnerabilityQuestionsOutput,
} from "@/ai/flows/answer-vulnerability-questions";
import {
  generateDefectDojoQueries as generateDefectDojoQueriesFlow,
  type GenerateDefectDojoQueriesInput,
  type GenerateDojoQueriesOutput,
} from "@/ai/flows/generate-defectdojo-queries";

export async function answerVulnerabilityQuestions(
  input: AnswerVulnerabilityQuestionsInput
): Promise<AnswerVulnerabilityQuestionsOutput> {
  return await answerVulnerabilityQuestionsFlow(input);
}

export async function generateDefectDojoQueries(
  input: GenerateDojoQueriesInput
): Promise<GenerateDojoQueriesOutput> {
  return await generateDojoQueriesFlow(input);
}
