import { NextResponse } from 'next/server';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const MAX_RETRIES = 2;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(apiKey: string, prompt: string) {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (response.ok) {
      return response;
    }

    lastResponse = response;

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      const waitTimeMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : 1000 * Math.pow(2, attempt);

      await sleep(waitTimeMs);
      continue;
    }

    return response;
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error('Unable to reach Gemini API');
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY environment variable' },
        { status: 500 }
      );
    }

    const { industry, service, numberOfQueries, language, customScenarios } = await request.json();

    const prompt = `Generate ${numberOfQueries} realistic local search queries for ${service} in the ${industry} industry.
Target output language: ${language}
${customScenarios ? `Custom scenarios/context: ${customScenarios}` : ''}

Important requirements:
- Write BOTH the "query" and "scenario" fields fully in ${language}.
- Do NOT mix languages unless the user explicitly asks for it.
- Make the query sound like a real user search.
- Make the scenario natural, concise, and aligned with business use cases.
- If the target language is Thai, write all scenario descriptions in natural Thai.

For each query, provide:
1. A realistic search query as someone would type it
2. A brief scenario describing why someone would search this (1-2 sentences)

Format the response as a JSON array with this structure:
[
  {
    "query": "the search query in ${language}",
    "scenario": "the scenario in ${language}"
  }
]

Make the queries diverse, covering different user intents (informational, transactional, navigational) and various ways people search locally.
Return only valid JSON.`;

    const response = await callGeminiWithRetry(apiKey, prompt);

    if (response.status === 429) {
      return NextResponse.json(
        {
          error: 'Gemini API quota exceeded or too many requests. Please wait a moment and try again.',
        },
        { status: 429 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No text in API response');
    }

    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const queries = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ queries });
  } catch (error) {
    console.error('Error generating queries:', error);
    return NextResponse.json(
      { error: 'Failed to generate queries' },
      { status: 500 }
    );
  }
}
