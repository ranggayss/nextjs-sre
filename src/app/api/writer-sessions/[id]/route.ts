import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }>}) {
  try {
    const {id} = await params;
    const writerSession = await prisma.writerSession.findUnique({
      where: { id },
      include: {
        drafts: true,  // atau drafts: { include: { sections: true } } jika perlu sections
      },
    });

    if (!writerSession) {
      return new NextResponse('Not Found', { status: 404 });
    }

    return NextResponse.json(writerSession);
  } catch (error) {
    console.error('GET error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const {id} = await params;
    const body = await req.json();
    const updated = await prisma.writerSession.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        coverColor: body.coverColor,
        lastActivity: new Date(), // Update last activity when session is modified
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT error:', error);
    return new NextResponse('Failed to update writer session', { status: 500 });
  }
}

export async function DELETE(req: NextRequest, {params } : { params: Promise<{ id: string }> }) {
  try {
    const {id} = await params;
    const writerSession = await prisma.writerSession.findUnique({
      where: { id },
      include: {
        drafts: true,
      },
    });

    if (!writerSession) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Optional: Validasi jika ingin mencegah penghapusan session yang memiliki drafts
    /*
    if (writerSession.drafts.length > 0) {
      return new NextResponse(
        JSON.stringify({
          error: 'Writer session tidak bisa dihapus karena memiliki drafts terkait.',
        }),
        { status: 400 }
      );
    }
    */

    await prisma.writerSession.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE error:', error);
    return new NextResponse('Failed to delete writer session', { status: 500 });
  }
}

// Update last activity - untuk tracking aktivitas user
export async function PATCH(req: NextRequest, context : { params: Promise<{ id: string }>}) {
  const {id} = await context.params;
  const body = await req.json();

  try {
    const updatedSession = await prisma.writerSession.update({
      where: { id },
      data: {
        lastActivity: new Date(),
        // Add any other fields that might be updated via PATCH
        // WriterSession model doesn't have the same filter fields as BrainstormingSession
        ...(body.title && { title: body.title }),
        ...(body.description && { description: body.description }),
        ...(body.coverColor && { coverColor: body.coverColor }),
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating writer session:', error);
    return NextResponse.json(
      { error: 'Failed to update writer session' },
      { status: 500 }
    );
  }
}