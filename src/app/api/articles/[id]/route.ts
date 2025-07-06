import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, {params} : {
    params: Promise <{id: string}>
}){
    const { id: idParam } = await params;

    await prisma.annotation.deleteMany({
        where: {
            articleId: idParam,
        }
    });

    await prisma.article.delete({
        where: {
            id: idParam,
        },
        include: {
            nodes: true,
            edges: true,
        }
    });

    return NextResponse.json({msg : 'Article Deleteded Succes', idParam}, {status: 200});
}