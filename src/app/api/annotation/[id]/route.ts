import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        console.log('Attempting to delete annotation with ID:', id);

        // First, check if the annotation exists
        const existingAnnotation = await prisma.annotation.findUnique({
            where: {
                id,
            }
        });

        if (!existingAnnotation) {
            console.log('Annotation not found:', id);
            return NextResponse.json(
                { message: 'Annotation not found' }, 
                { status: 404 }
            );
        }

        // Delete the annotation
        const deletedAnnotation = await prisma.annotation.delete({
            where: {
                id,
            }
        });

        console.log('Annotation deleted successfully:', deletedAnnotation);

        return NextResponse.json(
            { 
                message: 'Annotation deleted successfully',
                data: deletedAnnotation 
            }, 
            { status: 200 }
        );

    } catch (error: any) {
        console.error('Error deleting annotation:', error);
        
        // Handle Prisma specific errors
        if (error.code === 'P2025') {
            return NextResponse.json(
                { message: 'Annotation not found or already deleted' }, 
                { status: 404 }
            );
        }

        return NextResponse.json(
            { 
                message: error?.message || 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error : undefined
            }, 
            { status: 500 }
        );
    }
}