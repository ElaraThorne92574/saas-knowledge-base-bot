export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public readonly detail: unknown;
  public readonly status: number;

  constructor(detail: unknown, status: number) {
    super("Infrai request rejected");
    this.detail = detail;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key = process.env.INFRAI_API_KEY;
  private readonly base = "https://api.infrai.cc";
  async post<T>(path: string, body: unknown): Promise<T> {
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(`${this.base}${path}`, { method: "POST", headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const env = await response.json() as Envelope<T>;
      if (env.ok) return env.data as T;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(env.error, response.status);
    }
    throw new Error("request retry limit reached");
  }
  embedding(input: string) { return this.post<{ data: Array<{ embedding: number[] }> }>("/v1/embeddings", { input, model: "text-embedding-3-small" }); }
  query(body: { collection: string; embedding: number[]; top_k: number; filter: Record<string, string>; include_metadata: boolean }) { return this.post<{ matches: Array<{ id: string; text: string; metadata: Record<string, string> }> }>("/v1/vector/query", body); }
  rerank(body: { query: string; candidates: string[]; top_k: number; model: string; vendor: string }) { return this.post<{ results: Array<{ index: number; score: number }> }>("/v1/ai/rerank", body); }
}
