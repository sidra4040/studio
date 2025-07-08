"use server";

import {
  answerVulnerabilityQuestions as answerVulnerabilityQuestionsFlow,
  type AnswerVulnerabilityQuestionsInput,
  type AnswerVulnerabilityQuestionsOutput,
} from "@/ai/flows/answer-vulnerability-questions";

export async function answerVulnerabilityQuestions(
  input: AnswerVulnerabilityQuestionsInput
): Promise<AnswerVulnerabilityQuestionsOutput> {
  return await answerVulnerabilityQuestionsFlow(input);
}
