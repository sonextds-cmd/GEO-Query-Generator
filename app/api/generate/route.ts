import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

type GenerateRequest = {
  industry?: string;
  service?: string;
  numberOfQueries?: number;
  language?: string;
  customScenarios?: string;
};

export type ScenarioItem = {
  angle: string;
  description: string;
  queries: string[];
};

const MODEL_NAME = 'gemini-2.5-flash';
const MAX_RETRIES = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt({
  industry,
  service,
  numberOfQueries,
  language,
  customScenarios,
}: Required<GenerateRequest>) {
  return `You are a GEO (Generative Engine Optimization) expert.

Your task: for the industry "${industry}" and service "${service}", generate conversational search queries that real users ask AI assistants when looking for the best provider or brand.

Step 1 — Identify key high-intent "trigger angles": distinct user concerns, needs, or decision factors that drive search intent. Only include scenarios that are genuinely relevant. There is no fixed number of scenarios.

Step 2 — For EACH scenario, generate exactly ${numberOfQueries} unique conversational queries in ${language}.

Hard rules:
- EVERY scenario must have EXACTLY ${numberOfQueries} queries — no more, no less
- ALL text (scenario names, descriptions, and every query) MUST be written entirely in ${language}
- Queries must be natural, conversational, and realistic — as a real user would type to an AI
- Each query within a scenario must be distinct and cover a different angle or phrasing
- Custom context: ${customScenarios || 'None'}

Return valid JSON only. No markdown wrapping. Use this exact schema:
{
  "scenarios": [
    {
      "angle": "scenario name in ${language}",
      "description": "one sentence in ${language}",
      "queries": ["query 1", "query 2", ..., "query ${numberOfQueries}"]
    }
  ]
}`;
}

function cleanJsonText(text: string) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function normalizeResult(payload: unknown): ScenarioItem[] {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid AI response format');
  }

  const maybeScenarios = (payload as { scenarios?: unknown }).scenarios;
  if (!Array.isArray(maybeScenarios)) {
    throw new Error('AI response does not contain scenarios array');
  }

  const scenarios = maybeScenarios
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      angle: typeof item.angle === 'string' ? item.angle.trim() : '',
      description: typeof item.description === 'string' ? item.description.trim() : '',
      queries: Array.isArray(item.queries)
        ? item.queries
            .filter((q): q is string => typeof q === 'string')
            .map((q) => q.trim())
            .filter((q) => q.length > 0)
        : [],
    }))
    .filter((item) => item.angle.length > 0 && item.queries.length > 0);

  if (scenarios.length === 0) {
    throw new Error('No valid scenarios returned from AI');
  }

  const totalQueries = scenarios.reduce((sum, s) => sum + s.queries.length, 0);
  if (totalQueries === 0) {
    throw new Error('No valid queries returned from AI');
  }

  return scenarios;
}

async function generateWithRetry(prompt: string, apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isRateLimit = /429|too many requests|quota/i.test(message);

      if (isRateLimit && attempt < MAX_RETRIES) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown AI error');
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server is missing GEMINI_API_KEY' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as GenerateRequest;
    const industry = body.industry?.trim() ?? '';
    const service = body.service?.trim() ?? '';
    const numberOfQueries = Math.min(Math.max(Number(body.numberOfQueries) || 10, 1), 50);
    const language = body.language?.trim() ?? 'Thai';
    const customScenarios = body.customScenarios?.trim() ?? '';

    if (!industry || !service) {
      return NextResponse.json(
        { error: 'Industry and Service are required' },
        { status: 400 }
      );
    }

    const prompt = buildPrompt({ industry, service, numberOfQueries, language, customScenarios });
    const text = await generateWithRetry(prompt, apiKey);
    const parsed = JSON.parse(cleanJsonText(text));
    const scenarios = normalizeResult(parsed);

    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error('Error generating queries:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (/429|too many requests|quota/i.test(message)) {
      return NextResponse.json(
        { error: 'Gemini API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (/JSON/i.test(message)) {
      return NextResponse.json(
        { error: 'AI returned an unexpected format. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate queries. Please try again.' },
      { status: 500 }
    );
  }
}
