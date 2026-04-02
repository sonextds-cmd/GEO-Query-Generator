import { NextResponse } from 'next/server';

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

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
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

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
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
