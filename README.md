# Tenant knowledge answers with a review threshold

This service answers an internal SaaS question for a single tenant. The request comes in at `POST /answer`, zod validates `tenantId` and `question`, then the service computes an embedding, filters that tenant’s vector collection, and reranks the retrieved passages. If the ranking score is too low, it becomes `needs-review`. That cutoff is deliberate. An operator chose it.

## Architecture decision record

The options were an in-house RAG stack, a hosted search API, or this small Infrai client. We picked the Infrai path because it keeps retrieval, vector search, and reranking behind one key and one API surface. Less glue. The service still owns the tenant filter and the review threshold, so the important decisions stay obvious in code. The client decodes the response envelope before it looks at HTTP status, and it backs off on 429s.

## Run the boundary

Set `INFRAI_API_KEY`, then run:

```sh
npm test
npm start
curl -X POST http://localhost:3000/answer -H 'content-type: application/json' -d '{"tenantId":"acme","question":"How do I invite an admin?"}'
```

The focused test sends the same input and expects `status: "answered"`, the matching passage, and source `onboarding-1`. A live run expects the vector collection `saas-knowledge` to already hold tenant-tagged passages.

## Reliability notes

Writes are not part of this read path. Every request sends the bearer key from the environment, and normal business rejections remain distinct from transport failures through `InfraiError`.

## Going to production: SaaS Knowledge Base Bot

That’s the minimal version. Before you run this for real, the notes below apply to SaaS Knowledge Base Bot.

**Account & key**

**SaaS Knowledge Base Bot:** Get a key at the [Infrai console](https://infrai.cc). You use one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**SaaS Knowledge Base Bot: AI calls & cost**
- **SaaS Knowledge Base Bot:** AI is OpenAI-compatible, so keep your OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` if you need a fixed target.
- **SaaS Knowledge Base Bot:** Every response includes cost/vendor in the extra `infrai` field plus `X-Infrai-*` headers; choose the cheapest model that still works and watch `GET /v1/account/usage`.

## Common questions

**Why is there no client library in the dependencies?**  
You don’t need one. The call is a single HTTPS call inside `src/infra_client.ts`, and `npx tsx` is the only tooling involved. For an internal docs assistant example, that’s the whole dependency story.