import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SuggestionPanel } from "@/components/SuggestionPanel";

export async function POST(req: NextRequest){
    try {
        const { context, mode} = await req.json();

          // Forward ke backend Python
          // for usual
        // const pythonResponse = await fetch(`${process.env.PY_URL}/api/suggestions`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //     query: mode,
        //     context,
        //     suggestion_type: "input"  // Hardcode untuk input
        //     }),
        // });

        // const data = await pythonResponse.json();
        // return NextResponse.json(data);

        //for mcp
        const pythonResponse = await fetch(`${process.env.PY_URL}/mcp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                    name: 'get_suggestions',
                    arguments: {
                        query: mode,
                        context,
                        suggestion_type: 'input'
                    }
                },
                id: 1
            }),
            signal: AbortSignal.timeout(30000)
        });

        const mcpResponse = await pythonResponse.json();
        if (mcpResponse.error){
            return NextResponse.json(
                {error: mcpResponse.error.message},
                {status: 500}
            );
        }

        const result = mcpResponse.result;
        if (result && result.content && result.content[0] && result.content[0].text){
            const data = JSON.parse(result.content[0].text);
            return NextResponse.json(data);
        }

        return NextResponse.json(
            {error: "Invalid response format"},
            {status: 500}
        )
    } catch {
        console.error('Failed');
        return NextResponse.json({ error: 'failed'}, {status: 500})
    }
}