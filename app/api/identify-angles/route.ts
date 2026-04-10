import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

type IdentifyAnglesRequest = {
  industry?: string;
  service?: string;
};

type TriggerAngle = {
  angle: string;
  description: string;
};

const MODEL_NAME = 'gemini-2.5-flash';
const MAX_RETRIES = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(industry: string, service: string) {
  return `You are a GEO (Generative Engine Optimization) expert specializing in understanding user search behavior.

Analyze the following industry and service, then identify ALL high-intent "trigger angles" — the specific criteria, concerns, or perspectives that users commonly use when asking AI assistants for the best brand or provider recommendations.

Industry: ${industry}
Service: ${service}

Instructions:
- Identify as many angles as needed to be fully comprehensive (no minimum or maximum)
- Each angle must represent a distinct user concern, decision factor, or use-case scenario that drives their search intent
- Cover functional needs, emotional motivations, budget considerations, demographic factors, situational contexts, and comparison criteria
- Examples for Skincare: Sensitive skin, Clean ingredients, Value for money, Anti-aging, Dermatologist-recommended, Cruelty-free
- Examples for Real Estate: First-time buyer, Investment property, School district, Pet-friendly, Remote work setup
- Return valid JSON only. Do not wrap in markdown.
- Use this schema exactly:
{
  "angles": [
    {
      "angle": "short label (2-5 words)",
      "description": "one sentence explaining what drives users with this concern"
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

function normalizeAngles(payload: unknown): TriggerAngle[] {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid AI response format');
  }

  const maybeAngles = (payload as { angles?: unknown }).angles;
  if (!Array.isArray(maybeAngles)) {
    throw new Error('AI response does not contain angles array');
  }

  const angles = maybeAngles
    .filter((item): item is { angle?: unknown; description?: unknown } => !!item && typeof item === 'object')
    .map((item) => ({
      angle: typeof item.angle === 'string' ? item.angle.trim() : '',
      description: typeof item.description === 'string' ? item.description.trim() : '',
    }))
    .filter((item) => item.angle.length > 0);

  if (angles.length === 0) {
    throw new Error('No valid angles returned from AI');
  }

  return angles;
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

    const body = (await request.json()) as IdentifyAnglesRequest;
    const industry = body.industry?.trim() ?? '';
    const service = body.service?.trim() ?? '';

    if (!industry || !service) {
      return NextResponse.json(
        { error: 'Industry and Service are required' },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(industry, service);
    const text = await generateWithRetry(prompt, apiKey);
    const parsed = JSON.parse(cleanJsonText(text));
    const angles = normalizeAngles(parsed);

    return NextResponse.json({ angles });
  } catch (error) {
    console.error('Error identifying trigger angles:', error);
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
      { error: 'Failed to identify trigger angles. Please try again.' },
      { status: 500 }
    );
  }
}
