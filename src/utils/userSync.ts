// utils/userSync.ts
import { prisma } from "@/lib/prisma"
import { User } from "@supabase/supabase-js"

/*
export interface SupabaseUser {
  id: string
  email: string | undefined
  user_metadata?: {
    name?: string
    [key: string]: any
  }
  created_at?: string
  updated_at?: string
}
  */

export async function syncUserWithPrisma(supabaseUser: User) {
  try {
    console.log('Syncing user to Prisma:', supabaseUser.id);

    if (!supabaseUser.email){
      throw new Error('User email is required for sync but is undefined');
    }

    // Cek apakah user sudah ada di Prisma
    let prismaUser = await prisma.user.findUnique({
      where: { id: supabaseUser.id }
    })

    if (!prismaUser) {
      // User belum ada, buat baru
      console.log('Creating new user in Prisma...')
      prismaUser = await prisma.user.create({
        data: {
          id: supabaseUser.id, // Gunakan ID yang sama dari Supabase
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
          password: '', // Kosong karena auth handled by Supabase
          role: 'USER', // Default role
        }
      })
      console.log('User created in Prisma:', prismaUser.id)
    } else {
      // User sudah ada, update jika perlu
      console.log('User already exists in Prisma, checking for updates...')
      
      const needsUpdate = 
        prismaUser.email !== supabaseUser.email ||
        prismaUser.name !== (supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0]) || prismaUser.id !== supabaseUser.id

      if (needsUpdate) {
        console.log('Updating user in Prisma...')
        prismaUser = await prisma.user.update({
          where: { id: supabaseUser.id },
          data: {
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
            id: supabaseUser.id,
          }
        })
        console.log('User updated in Prisma:', prismaUser.id)
      } else {
        console.log('No updates needed for user:', prismaUser.id)
      }
    }

    return prismaUser
  } catch (error: any) {
    console.error('Error syncing user to Prisma:', error)
    throw new Error(`Failed to sync user: ${error.message}`)
  }
}