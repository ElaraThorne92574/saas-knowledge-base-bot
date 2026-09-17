import { createServer } from "node:http";
import { answerQuestion } from "./knowledge_decision.ts";

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/answer") { res.writeHead(404).end(); return; }
  let raw = ""; for await (const chunk of req) raw += chunk;
  try { const result = await answerQuestion(JSON.parse(raw)); res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result)); }
  catch (error) { const status = error instanceof Error && error.message.includes("required") ? 500 : 400; res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ error: "invalid request" })); }
});
server.listen(3000, () => console.log("knowledge bot listening on http://localhost:3000"));
