import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { lastMessage, conversationHistory, context } = await req.json();

  // Forward ke backend Python
  const pythonResponse = await fetch(`${process.env.PY_URL}/api/suggestions/followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lastMessage,
      conversationHistory,
      context,
      suggestion_type: "followup"
        // Pakai jawaban AI // Hardcode untuk follow-up
    }),
  });

  const data = await pythonResponse.json();
  return NextResponse.json(data);
}