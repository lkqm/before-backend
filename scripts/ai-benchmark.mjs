import { readFileSync } from "node:fs";
import OpenAI from "openai";

function parseEnv(file) {
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function parseJsonResult(content) {
  try {
    const parsed = JSON.parse(content);
    return {
      parseOk: Array.isArray(parsed.items),
      itemCount: Array.isArray(parsed.items) ? parsed.items.length : 0,
    };
  } catch {
    return { parseOk: false, itemCount: 0 };
  }
}

const env = parseEnv(".env");
const apiKey = env.TEXT_AI_API_KEY || env.AI_API_KEY || env.OPENAI_API_KEY;
const baseURL = env.TEXT_AI_BASE_URL || env.AI_BASE_URL;
const configuredTextModel = env.TEXT_AI_MODEL || env.AI_MODEL;
const configuredGlobalModel = env.AI_MODEL;
const models = Array.from(
  new Set([configuredTextModel, configuredGlobalModel].filter(Boolean)),
);

if (!apiKey || !baseURL || models.length === 0) {
  throw new Error("AI apiKey, baseURL, or model is not configured");
}

const client = new OpenAI({
  apiKey,
  baseURL,
  maxRetries: 0,
  timeout: Number(env.TEXT_AI_TIMEOUT_MS || env.AI_TIMEOUT_MS || 30000),
});

const input =
  process.argv.slice(2).join(" ") ||
  "今天来到海边旅游，这里风景优美，让我感受到了生活的美好。";

const currentSystem =
  "你是一个朋友圈文案编辑，只输出自然、日常、克制的中文朋友圈表达。不要像广告，不要像小红书，不要解释。";
const currentUser = `把下面这段话改写成 3 条更有朋友圈感的文案。每条尽量短，自然，不要过度抒情。\n\n${input}\n\n只返回 JSON，格式：{"items":[{"style":"natural","text":"..."},{"style":"daily","text":"..."},{"style":"minimal","text":"..."}]}`;

const shortSystem =
  "你是朋友圈文案编辑。输出自然、日常、克制的中文短句，不解释。";
const shortUser = `改写为3条朋友圈文案，只返回JSON：{"items":[{"style":"natural","text":""},{"style":"daily","text":""},{"style":"minimal","text":""}]}\n原文：${input}`;

const tests = models.flatMap((model) => [
  {
    name: "current-json-240-t0.7-thinking-default",
    model,
    system: currentSystem,
    user: currentUser,
    json: true,
    maxTokens: 240,
    temperature: 0.7,
    disableThinking: false,
  },
  {
    name: "rewrite-json-120-t0.7-thinking-off",
    model,
    system: currentSystem,
    user: currentUser,
    json: true,
    maxTokens: 120,
    temperature: 0.7,
    disableThinking: true,
  },
  {
    name: "short-json-120-t0.7-thinking-off",
    model,
    system: shortSystem,
    user: shortUser,
    json: true,
    maxTokens: 120,
    temperature: 0.7,
    disableThinking: true,
  },
  {
    name: "short-nojson-120-t0.7-thinking-off",
    model,
    system: shortSystem,
    user: shortUser,
    json: false,
    maxTokens: 120,
    temperature: 0.7,
    disableThinking: true,
  },
]);

console.log(
  JSON.stringify(
    {
      baseURL,
      models,
      timeoutMs: client.timeout,
      inputLength: input.length,
      testCount: tests.length,
    },
    null,
    2,
  ),
);

const results = [];
for (const test of tests) {
  const startedAt = Date.now();
  try {
    const params = {
      model: test.model,
      max_tokens: test.maxTokens,
      temperature: test.temperature,
      messages: [
        { role: "system", content: test.system },
        { role: "user", content: test.user },
      ],
    };
    if (test.json) params.response_format = { type: "json_object" };
    if (test.disableThinking) params.thinking = { type: "disabled" };

    const completion = await client.chat.completions.create(params);
    const content = completion.choices[0]?.message?.content || "";
    const parsed = parseJsonResult(content);

    results.push({
      model: test.model,
      test: test.name,
      ok: true,
      latencyMs: Date.now() - startedAt,
      inputTokens: completion.usage?.prompt_tokens ?? null,
      outputTokens: completion.usage?.completion_tokens ?? null,
      reasoningTokens:
        completion.usage?.completion_tokens_details?.reasoning_tokens ?? null,
      ...parsed,
      sample: content.replace(/\s+/g, " ").slice(0, 120),
    });
  } catch (error) {
    results.push({
      model: test.model,
      test: test.name,
      ok: false,
      latencyMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      providerStatus: error?.status ?? "",
      providerCode: error?.code ?? "",
      providerType: error?.type ?? "",
    });
  }
}

console.table(
  results.map(({ sample, ...result }) => ({
    ...result,
    sample: sample ? `${sample.slice(0, 40)}...` : "",
  })),
);

console.log(JSON.stringify(results, null, 2));
