import { createServerClient, serializeCookieHeader } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient(){
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
            cookies: {
                getAll(){
                    return cookieStore.getAll();
                },
                setAll(cookieToset){
                    cookieToset.forEach(({name, value, options}) => {
                        cookieStore.set(name, value, options);
                    })
                },
            }
        }
    )
}
