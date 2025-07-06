import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/*
export async function GET(req: NextRequest){
    try {
        const nodes = await prisma.node.findMany();
        return NextResponse.json(nodes);
    } catch (error) {
        console.error("Error fetching nodes: ", error);
        return NextResponse.json({error : 'Failed to fetch node'}, {status: 500});
    };
}
*/

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
        return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const nodes = await prisma.node.findMany({
      where: {
        article: {
          sessionId: sessionId || undefined,
        },
      },
    });

    return NextResponse.json(nodes);
  } catch (error) {
    console.error("Error fetching nodes: ", error);
    return NextResponse.json({ error: 'Failed to fetch node' }, { status: 500 });
  }
}
