// app/api/auth/signin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { syncUserWithPrisma } from '@/utils/userSync'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validasi input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Buat Supabase client
    const supabase = await createServerSupabaseClient();

    // Sign in dengan Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Supabase auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 401 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // 🔥 SYNC USER KE PRISMA
    try {
      const prismaUser = await syncUserWithPrisma(authData.user)
      console.log('User synced to Prisma:', prismaUser.id)
    } catch (syncError) {
      console.error('Failed to sync user to Prisma:', syncError)
      // Tidak return error, karena auth sudah berhasil
      // User tetap bisa login meskipun sync gagal
    }

    // Response sukses
    return NextResponse.json({
      message: 'Sign in successful',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name || authData.user.email,
      },
      session: {
        access_token: authData.session?.access_token,
        expires_at: authData.session?.expires_at,
      }
    })

  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Untuk testing bisa buat GET endpoint juga
export async function GET() {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}