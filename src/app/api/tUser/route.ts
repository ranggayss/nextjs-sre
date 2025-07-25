// app/api/user/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Ambil data user berdasarkan email yang sedang login
    const userData = await prisma.user.findUnique({
      where: { email: user.email ?? '' },
      select: {
        id: true,
        name: true,
        group: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userData);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}