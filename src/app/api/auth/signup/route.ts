import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, res: NextResponse){
    try {        
        const body = await req.json();
        const { email, name, password, nim, group} = body;

        if (!email || !name || !nim || !group){
            return NextResponse.json({
                message: 'Attribute required',
            }, {
                status: 401
            })
        };

        const supabase = await createServerSupabaseClient();
        const {data: authData, error: authError} = await supabase.auth.signUp({
            email,
            password,
        });

        if (!authData.user){
            return NextResponse.json({
                message: 'Failed Sign Up'
            }, {
                status: 401
            })
        }

        if (!authData.user.email){
            throw new Error('there is no email');
        }

        try {
            const prismaUser = await prisma.user.create({
                data: {
                    id: authData.user.id,
                    email: authData.user.email,
                    password: '',
                    role: 'USER',
                    group: group,
                    nim: nim,
                }
            })

            if (!prismaUser){
                return NextResponse.json({
                    message: 'Failed create user prisma'
                },{
                    status: 401
                })
            }
        } catch (error) {
            console.error('Error created user', error);
        }

    } catch (error) {
        console.error(error);
        return NextResponse.json({
            message: 'Internal server error'
        },{
            status: 500
        })
    }
    


}