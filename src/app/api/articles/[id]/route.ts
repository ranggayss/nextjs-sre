import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, {params} : {
    params: Promise <{id: string}>
}){
    const { id: idParam } = await params;

    try {
        // First, check if the ID is a Node ID and get the Article ID
        const node = await prisma.node.findUnique({
            where: {
                id: idParam,
            },
            select: {
                articleId: true,
            }
        });

        let articleId = idParam; // Default: assume it's an Article ID

        if (node) {
            // If it's a Node ID, use the Article ID from the Node
            articleId = node.articleId;
        } else {
            // Check if it's actually an Article ID
            const existingArticle = await prisma.article.findUnique({
                where: {
                    id: idParam,
                }
            });

            if (!existingArticle) {
                return NextResponse.json(
                    { error: 'Article or Node not found' }, 
                    { status: 404 }
                );
            }
        }

        // Delete the article (cascade deletes will handle related records)
        await prisma.article.delete({
            where: {
                id: articleId,
            }
        });

        return NextResponse.json(
            { 
                msg: 'Article deleted successfully', 
                articleId: articleId,
                providedId: idParam 
            }, 
            { status: 200 }
        );

    } catch (error) {
        console.error('Error deleting article:', error);
        return NextResponse.json(
            { error: 'Failed to delete article' }, 
            { status: 500 }
        );
    }
}