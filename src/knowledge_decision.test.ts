import assert from "node:assert/strict";
import { answerQuestion } from "./knowledge_decision.ts";

const fake = { embedding: async () => ({ data: [{ embedding: [1, 0] }] }), query: async () => ({ matches: [{ id: "onboarding-1", text: "Invite an admin from Settings.", metadata: {} }] }), rerank: async () => ({ results: [{ index: 0, score: 0.9 }] }) };
const result = await answerQuestion({ tenantId: "acme", question: "How do I invite an admin?" }, fake as never);
assert.deepEqual(result, { status: "answered", answer: "Invite an admin from Settings.", sources: ["onboarding-1"] });
console.log("business decision test passed");
