import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server'; // asumsi file kamu tadi

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, coverColor } = body;

  const session = await prisma.brainstormingSession.create({
    data: {
      title,
      description,
      coverColor,
      userId: user.id,
      selectedFilterArticles: [],
    //   graphFilters: JSON[],
      lastActivity: new Date(),
    },
  });

  return NextResponse.json({ id: session.id });
};

// app/api/brainstorming-sessions/route.ts
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json([], { status: 401 });
  }

  const sessions = await prisma.brainstormingSession.findMany({
    where: {
      userId: user.id,
    },
    include: {
        _count: {
            select: {
                articles: true,
                chatMessages: true,
            },
        },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return NextResponse.json(sessions);
}

