import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { lastMessage, conversationHistory, context } = await req.json();
  
    // Forward ke backend Python
    //for main.py (usual)
    // const pythonResponse = await fetch(`${process.env.PY_URL}/api/suggestions/followup`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     lastMessage,
    //     conversationHistory,
    //     context,
    //     suggestion_type: "followup"
    //       // Pakai jawaban AI // Hardcode untuk follow-up
    //   }),
    // });
  
    //for mcp_server
    const pythonResponse = await fetch(`${process.env.PY_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: "get_followup_suggestions",
          arguments: {
            lastMessage,
            conversationHistory,
            context,
            suggestion_type: "followup"
          }
        },
        id: 1
      }),
      signal: AbortSignal.timeout(30000)
    });
  
    //mcp
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
      {error: 'Invalid response format'},
      {status : 500}
    )
  
    //usual
    // const data = await pythonResponse.json();
    // return NextResponse.json(data);
    
  } catch (error) {
    console.error('Failed to fetch follow-up', error);
    return NextResponse.json(
      {error: 'Failed to fetch followup'},
      {status: 500}
    )
  }
}