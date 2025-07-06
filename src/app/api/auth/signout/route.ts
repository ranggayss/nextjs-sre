// app/api/auth/signout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Supabase signout error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Check if request wants JSON response (AJAX) or redirect
    const acceptHeader = request.headers.get('accept') || '';
    const isAjaxRequest = acceptHeader.includes('application/json');

    if (isAjaxRequest) {
      // Return JSON for AJAX requests
      return NextResponse.json({
        message: 'Sign out successful',
        redirect: '/signin'
      })
    } else {
      // Direct redirect for form submissions
      return NextResponse.redirect(new URL('/signin', request.url))
    }

  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    redirect('/signin');
  }
}

// GET endpoint - always redirect
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Supabase signout error:', error)
    }
    
    return NextResponse.redirect(new URL('/signin', request.url))
  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.redirect(new URL('/signin', request.url))
  }
}