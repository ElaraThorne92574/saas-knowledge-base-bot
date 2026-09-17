import { z } from "zod";
import { InfraiClient } from "./infra_client.ts";

export const Question = z.object({ tenantId: z.string().min(1), question: z.string().min(3) });
export type QuestionInput = z.infer<typeof Question>;

export async function answerQuestion(input: QuestionInput, client = new InfraiClient()) {
  const request = Question.parse(input);
  const embedded = await client.embedding(request.question);
  const vector = embedded.data[0]?.embedding;
  if (!vector) throw new Error("embedding response contained no vector");
  const found = await client.query({ collection: "saas-knowledge", embedding: vector, top_k: 8, filter: { tenantId: request.tenantId }, include_metadata: true });
  const candidates = found.matches.map(match => match.text);
  if (candidates.length === 0) return { status: "needs-review" as const, answer: null, sources: [] };
  const ranked = await client.rerank({ query: request.question, candidates, top_k: 3, model: "auto", vendor: "auto" });
  const best = ranked.results[0];
  return { status: best && best.score >= 0.55 ? "answered" as const : "needs-review" as const, answer: best && best.score >= 0.55 ? candidates[best.index] : null, sources: best ? [found.matches[best.index]?.id].filter(Boolean) : [] };
}
