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

type QueryItem = {
  query: string;
  scenario: string;
};

const MODEL_NAME = 'gemini-1.5-flash';
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
  return `You are an SEO and GEO query generation assistant.
Generate exactly ${numberOfQueries} search queries.

Requirements:
- Industry: ${industry}
- Service: ${service}
- Language: ${language}
- Custom scenarios: ${customScenarios || 'None'}
- Each query must be realistic, natural, and unique.
- Focus on local, intent-driven, and scenario-based searches.
- Return valid JSON only.
- Do not wrap the JSON in markdown.
- Use this schema exactly:
{
  "queries": [
    {
      "query": "string",
      "scenario": "string"
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

function normalizeResult(payload: unknown): QueryItem[] {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid AI response format');
  }

  const maybeQueries = (payload as { queries?: unknown }).queries;
  if (!Array.isArray(maybeQueries)) {
    throw new Error('AI response does not contain queries array');
  }

  const queries = maybeQueries
    .filter((item): item is { query?: unknown; scenario?: unknown } => !!item && typeof item === 'object')
    .map((item) => ({
      query: typeof item.query === 'string' ? item.query.trim() : '',
      scenario: typeof item.scenario === 'string' ? item.scenario.trim() : '',
    }))
    .filter((item) => item.query.length > 0);

  if (queries.length === 0) {
    throw new Error('No valid queries returned from AI');
  }

  return queries;
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

    const prompt = buildPrompt({
      industry,
      service,
      numberOfQueries,
      language,
      customScenarios,
    });

    const text = await generateWithRetry(prompt, apiKey);
    const parsed = JSON.parse(cleanJsonText(text));
    const queries = normalizeResult(parsed);

    return NextResponse.json({ queries });
  } catch (error) {
    console.error('Error generating queries:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (/429|too many requests|quota/i.test(message)) {
      return NextResponse.json(
        { error: 'Gemini API quota exceeded. Please try again again later.' },
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
