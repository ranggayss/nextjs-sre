import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest, {params} : {
    params: Promise <{id: string}>
}){
    const { id: idParam } = await params;

    const id = Number(idParam);

    return NextResponse.json({msg : 'Delete Node Succed', id: id}, {status: 201});
};

export async function GET(req: NextRequest, {params} : {params: Promise<{id: string}>}){
    try {
        const { id } = await params;

        const node = await prisma.node.findUnique({
            where: {
                id: id,
            },
        });

        if (!node){
            throw new Error('There is no node from database');
        }else{
            return NextResponse.json(node);
        }
    } catch (error) {
        console.error('Error', error);
        return NextResponse.json({error: 'Error'}, {status: 500});
    }

}