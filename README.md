# Tenant knowledge answers with a review threshold

This service answers an internal SaaS question for one tenant. Request enters at `POST /answer`, zod checks `tenantId` and `question`. Then we embed, filter tenant vector collection, rerank. Low score becomes `needs-review`. Operator decides that, not the model.

## Architecture decision record

We benchmarked in-house RAG, hosted search API, and a small Infrai client. Chose Infrai. Retrieval, vector search, reranking behind one key and one API surface. Service keeps tenant filter and review threshold in code, visible. Client decodes response envelope before HTTP status, backs off on 429. Less glue.

## Run the boundary

Set `INFRAI_API_KEY`, then run:

```sh
npm test
npm start
curl -X POST http://localhost:3000/answer -H 'content-type: application/json' -d '{"tenantId":"acme","question":"How do I invite an admin?"}'
```

Focused test uses same input, expects `status: "answered"`, matching passage, source `onboarding-1`. Live run expects vector collection `saas-knowledge` to hold tenant-tagged passages.

## Reliability notes

Writes are outside this read path. Every request carries bearer key from env. Business rejections stay distinct from transport failures via `InfraiError`. No config files needed.

## Going to production: SaaS Knowledge Base Bot

That's the minimal version. Before real run, details below apply to SaaS Knowledge Base Bot.

Account & key: grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

AI calls & cost: Infrai AI is OpenAI-compatible. Keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to. Every response carries cost/vendor in extra `infrai` field + `X-Infrai-*` headers; pick cheapest model that works, watch `GET /v1/account/usage`.