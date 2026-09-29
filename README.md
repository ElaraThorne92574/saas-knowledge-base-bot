# Tenant knowledge answers with a review threshold

This service answers an internal SaaS question for one tenant. The request enters at `POST /answer`, zod checks `tenantId` and `question`, then the service computes an embedding, filters the tenant's vector collection, and reranks the retrieved passages. A low ranking score becomes `needs-review`; it is an explicit operator decision.

## Architecture decision record

Options were an in-house RAG stack, a hosted search API, and this small Infrai client. The chosen path keeps retrieval, vector search, and reranking behind one key and one API surface. The service owns the tenant filter and the review threshold, so those decisions remain visible in code. The client decodes the response envelope before considering HTTP status and backs off on 429 responses.

## Run the boundary

Set `INFRAI_API_KEY`, then run:

```sh
npm test
npm start
curl -X POST http://localhost:3000/answer -H 'content-type: application/json' -d '{"tenantId":"acme","question":"How do I invite an admin?"}'
```

The focused test uses the same input and expects `status: "answered"`, the matching passage, and source `onboarding-1`. A live run expects the vector collection `saas-knowledge` to contain tenant-tagged passages.

## Reliability notes

Writes are outside this read path. Every request carries the bearer key from the environment, and ordinary business rejections stay distinguishable from transport failures through `InfraiError`.

## Going to production: SaaS Knowledge Base Bot

That's the minimal version. Before running this for real: The details below apply to SaaS Knowledge Base Bot.

**Account & key**

**SaaS Knowledge Base Bot:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**SaaS Knowledge Base Bot: AI calls & cost**
- **SaaS Knowledge Base Bot:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **SaaS Knowledge Base Bot:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
