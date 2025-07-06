import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = await prisma.brainstormingSession.findUnique({
      where: { id: params.id },
      include: {
        articles: true,
        chatMessages: true,
      },
    });

    if (!project) {
      return new NextResponse('Not Found', { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('GET error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await prisma.brainstormingSession.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        coverColor: body.coverColor,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT error:', error);
    return new NextResponse('Failed to update project', { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context : { params: { id: string } }) {
  try {
    // Validasi: pastikan tidak ada artikel/chat terkait
    const {id} = context.params;
    const project = await prisma.brainstormingSession.findUnique({
      where: { id },
      include: {
        articles: true,
        chatMessages: true,
      },
    });

    if (!project) {
      return new NextResponse('Not Found', { status: 404 });
    }

    /*
    if (project.articles.length > 0 || project.chatMessages.length > 0) {
      return new NextResponse(
        JSON.stringify({
          error: 'Proyek tidak bisa dihapus karena memiliki artikel atau chat terkait.',
        }),
        { status: 400 }
      );
    }
    */

    await prisma.brainstormingSession.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE error:', error);
    return new NextResponse('Failed to delete project', { status: 500 });
  }
}

// src/app/api/sessions/[id]/route.ts
export async function PATCH(req: NextRequest, context : { params: { id: string } }) {
  const sessionId = context.params.id;
  const body = await req.json();

  try {
    const updatedSession = await prisma.brainstormingSession.update({
      where: { id: sessionId },
      data: {
        selectedFilterArticles: body.selectedFilterArticles,
        graphFilters: body.graphFilters,
        lastSelectedNodeId: body.lastSelectedNodeId,
        lastSelectedEdgeId: body.lastSelectedEdgeId,
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating session filters:', error);
    return NextResponse.json(
      { error: 'Failed to update session filters' },
      { status: 500 }
    );
  }
}

