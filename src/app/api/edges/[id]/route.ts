import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params before accessing its properties
    const { id: idParam } = await params;

    console.log('Received ID:', idParam);

    // Convert string to number
    // const id = String(idParam);

    // Check if conversion resulted in a valid number
    /*
    if (isNaN(id)) {
      console.log('ID conversion failed - not a valid number:', idParam);
      return NextResponse.json({ 
        error: 'Invalid ID - must be a valid number',
        receivedId: idParam,
        note: 'Database expects integer ID but received non-numeric value'
      }, { status: 400 });
    }
    */

    // console.log('Converted ID to number:', id);

    if (idParam.includes('-')){
      const [fromId, toId, type] = idParam.split('-');
      const edge = await prisma.edge.findFirst({
        where: {
          fromId,
          toId,
        },
        include: {
          from: true,
          to: true,
        }
      });

      if (edge) return NextResponse.json(edge);
    }

    const edge = await prisma.edge.findUnique({
      where: { id: idParam },
      include: {
        from: true,
        to: true,
      },
    });

    if (!edge) {
      console.log('Edge not found with ID:', idParam);
      return NextResponse.json({ error: 'edge not found' }, { status: 404 });
    }

    console.log('Edge found successfully');
    return NextResponse.json(edge);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server error' }, { status: 500 });
  }
}