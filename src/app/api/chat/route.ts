import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chatAI } from '@/utils/chatAI';

export async function POST(req: NextRequest, res: NextResponse){

    const body = await req.json();
    const { sessionId, mode, nodeId, nodeIds, question, contextNodeIds, contextEdgeIds } = body;

    let thereIsNode: boolean = false; 

    let prompt = '';
    let promptGeneral = '';

    if(mode === 'single node' && nodeId){
        thereIsNode = true;
        console.log('there is node');
        const node = await prisma.node.findUnique({
            where: {
                id: nodeId,
            }
        });

        // prompt = `Berdasarkan node berikut:\n\nJudul: ${node?.title}\nDeskripsi:${node?.att_goal || 'Tida tersedia'}\n\nPertanyaan: ${question}`

        prompt = `Berikut adalah informasi artikel:\nJudul: ${node?.title}\nGoal: ${node?.att_goal}\nMethod: ${node?.att_method}\nBackground: ${node?.att_background}\nFuture: ${node?.att_future}\nGaps: ${node?.att_gaps}\n\nPertanyaan: ${question}`;

    }else if(mode === 'multiple node' && nodeIds ){
        thereIsNode = true;
        const nodes = await prisma.node.findMany({
            where: {
                id: {
                    in: nodeIds,
                }
            }
        });

        const edges = await prisma.edge.findMany({
            where:{
                fromId: {
                    in: nodeIds,
                    //[1, 2]
                },
                toId: {
                    in: nodeIds,
                    //[1, 2]
                }
            }
        });

        const nodeDescriptions = nodes.map((node, i) => {
            return `Node ${i + 1}:\n- Judul: ${node.title}\n- Deskripsi: ${node.att_goal || 'Tidak tersedia'}\n`
        }).join('\n');
        //hasil: node 1: judul....

        const edgeDescriptions = edges.map((edge, i) => {
            const edgeFrom = nodes.find((n) => edge.fromId === n.id);
            const edgeTo = nodes.find((n) => n.id === edge.id);

            return `Relasi ${i + 1}:\n- Dari: artikel-${edgeFrom?.title} ke artikel-${edgeTo?.title}\n- Jenis relasinya: ${edge.relation}\n- dengan penjelasan: ${edge.label || 'tidak diketahui'}\n`
        }).join('\n');
        //hasil: relasi 1: dari 

        prompt = `Berikut adalah informasi dari beberapa node dan relasinya:\n\n${nodeDescriptions}\n${edgeDescriptions}\n\nPertanyaan: ${question}`;
    }else{
        thereIsNode = false;
        promptGeneral = `Pertanyaan umum: ${question}`;
    };

    let answer: any;
    if(thereIsNode){
        const ragAnswer = await fetch("http://localhost:8000/rag", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: prompt,
        })
        });
        answer = await ragAnswer.json();
        const finalAnswer = answer.answer;

        await prisma.chatMessage.create({
            data: {
                sessionId,
                role: 'user',
                content: question,
                contextNodeIds: contextNodeIds,
                contextEdgeIds: contextEdgeIds,
            }
        });

        await prisma.chatMessage.create({
            data: {
                sessionId,
                role: 'assistant',
                content: finalAnswer,
                contextNodeIds: contextNodeIds,
                contextEdgeIds: contextEdgeIds,
            }
        });

        return NextResponse.json({answer: finalAnswer || 'Tidak ada jawaban yang ditemukan.'});  
    } else {
        answer = await chatAI(promptGeneral);

        await prisma.chatMessage.create({
            data: {
                sessionId,
                role: 'user',
                content: question,
            }
        });

        await prisma.chatMessage.create({
            data: {
                sessionId,
                role: 'assistant',
                content: answer,
            }
        });

        return NextResponse.json({answer});
    }


    // const answer = thereIsNode ? await ragAnswer.json() : await chatAI(promptGeneral);
    // const answer: any = await chatAI(prompt);
    // return NextResponse.json({answer: answer.answer || 'Tidak ada jawaban yang ditemukan.'});  
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(messages);
}
