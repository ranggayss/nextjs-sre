import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SuggestionPanel } from "@/components/SuggestionPanel";

export async function POST(req: NextRequest){
    try {
        const { context, mode} = await req.json();

          // Forward ke backend Python
        const pythonResponse = await fetch(`${process.env.PY_URL}/api/suggestions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            query: mode,
            context,
            suggestion_type: "input"  // Hardcode untuk input
            }),
        });

        const data = await pythonResponse.json();
        return NextResponse.json(data);
        
    } catch {
        console.error('Failed');
        return NextResponse.json({ error: 'failed'}, {status: 500})
    }
}