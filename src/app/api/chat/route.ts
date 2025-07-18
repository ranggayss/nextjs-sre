import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chatAI } from '@/utils/chatAI';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest, res: NextResponse){

    const body = await req.json();
    const { sessionId, mode, nodeId, nodeIds, question, contextNodeIds, contextEdgeIds, forceWeb } = body;

    console.log("perceived:", sessionId);

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

let articleIdsForVectorDB: string[] = []; 
    
    // contextNodeIds yang diterima dari frontend adalah ID Node Prisma dan TETAP AKAN DIKIRIM APA ADANYA KE PYTHON
    // untuk digunakan oleh GraphDB.
    // Kita hanya perlu mengambil ArticleId yang TERKAIT dengan NodeId tersebut.

    // 1. Jika ada contextNodeIds (dari graf di frontend), ambil articleId yang terkait
    if (contextNodeIds && contextNodeIds.length > 0) {
        const nodesWithArticleId = await prisma.node.findMany({
            where: {
                id: {
                    in: contextNodeIds, // Gunakan contextNodeIds yang ada
                },
            },
            select: {
                articleId: true, // Hanya ambil articleId
            },
        });
        // Pastikan tidak ada duplikat dan hanya ambil string yang valid
        articleIdsForVectorDB = [...new Set(nodesWithArticleId.map(node => node.articleId).filter((id): id is string => id !== null))];
    }

    let answer: any;
    if(thereIsNode){

        try {
            //this for main.py(fastapi)
            
            // const ragAnswer = await fetch(`${process.env.PY_URL}/api/chat`, {
            // method: "POST",
            // headers: {
            //     'Content-Type': 'application/json',
            // },
            // body: JSON.stringify({
            //     question: prompt,
            //     session_id: sessionId,
            //     mode: mode === 'single node' ? 'single_node' : 'multi_nodes',
            //     node_id: nodeId,
            //     node_ids: nodeIds,
            //     context_node_ids: contextNodeIds,
            //     context_edge_ids: contextEdgeIds,
            //     force_web: false
            // }),
            // signal: AbortSignal.timeout(30000)
            // });

            const ragAnswer = await fetch(`${process.env.PY_URL}/mcp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                    name: "pral_chat",
                    arguments: {
                        question: prompt, // atau promptGeneral
                        session_id: sessionId,
                        mode: mode === 'single node' ? 'single_node' : (mode === 'multiple node' ? 'multi_nodes' : 'general'),
                        node_id: nodeId,
                        node_ids: nodeIds,
                        context_node_ids: contextNodeIds,
                        context_article_ids: articleIdsForVectorDB,
                        context_edge_ids: contextEdgeIds,
                        force_web: forceWeb
                    }
                    },
                    id: 1
                }),
                signal: AbortSignal.timeout(30000)
                });

            if (!ragAnswer.ok) {
                throw new Error(`Python API error: ${ragAnswer.status} ${ragAnswer.statusText}`);
            }

            const ragData = await ragAnswer.json();

            console.log(ragData);

            //this for python fastapi (main.py)
            
            // const finalAnswer = ragData.answer || ragData.response || 'Tidak ada jawaban yang ditemukan';

            let answerText = ragData.result?.content?.[0]?.text || 'Tidak ada jawaban';

            // Jika answerText berupa JSON string, parse dulu untuk ambil references

            let parsedAnswer: any = answerText;
            let references: any[] = [];
            try {
            parsedAnswer = JSON.parse(answerText);
            // Jika hasil parsing punya references, ambil
            if (parsedAnswer && parsedAnswer.references) {
                references = parsedAnswer.references;
                // Jika ingin, bisa juga ambil jawaban utama dari parsedAnswer.response atau parsedAnswer.answer
                answerText = parsedAnswer.response || parsedAnswer.answer || answerText;
            }
            } catch (e) {
                // answerText memang plain text, references tetap []
                console.warn("Answer text is not JSON, treating as plain text.");
            }

            await prisma.chatMessage.create({
                data: {
                    sessionId,
                    role: 'user',
                    content: question,
                    contextNodeIds: contextNodeIds,
                    contextEdgeIds: contextEdgeIds,
                    references: []
                }
            });

            //for mcp
            await prisma.chatMessage.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: answerText,
                    contextNodeIds: contextNodeIds,
                    contextEdgeIds: contextEdgeIds,
                    references: references || [],
                }
            });

            //for usual
            // await prisma.chatMessage.create({
            //     data: {
            //         sessionId,
            //         role: 'assistant',
            //         content: finalAnswer,
            //         contextNodeIds: contextNodeIds,
            //         contextEdgeIds: contextEdgeIds,
            //         references: ragData.references || [],
            //     }
            // });

            //for mcp
            return NextResponse.json({...ragData,answer: answerText || 'Tidak ada jawaban yang ditemukan.', references: references || []});

            //for usual
            // return NextResponse.json({...ragData,answer: finalAnswer || 'Tidak ada jawaban yang ditemukan.'});
        } catch (error) {
            console.error('Error calling Python API:', error);
            return NextResponse.json({ error: 'Failed to get response from AI service'}, {status: 502});
        }

  
    } else {
        if (forceWeb) {
            try {
                const ragAnswer = await fetch(`${process.env.PY_URL}/api/chat`, {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: promptGeneral,
                        session_id: sessionId,
                        force_web: true
                    }),
                    signal: AbortSignal.timeout(30000)
                });

                if (!ragAnswer.ok) {
                    throw new Error(`Python API error: ${ragAnswer.status} ${ragAnswer.statusText}`);
                }

                const ragData = await ragAnswer.json();
                answer = ragData.answer || ragData.response || 'Tidak ada jawaban yang ditemukan';
            } catch (error) {
                console.error('Error calling Python API for web search:', error);
                // Fallback to regular chatAI if web search fails
                // answer = await chatAI(promptGeneral);
            }
        } else {
            // answer = await chatAI(promptGeneral);
            const ragAnswer = await fetch(`${process.env.PY_URL}/mcp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                    name: "pral_chat",
                    arguments: {
                        question: promptGeneral, // atau promptGeneral
                        session_id: sessionId,
                        mode: mode === 'single node' ? 'single_node' : (mode === 'multiple node' ? 'multi_nodes' : 'general'),
                        force_web: forceWeb
                    }
                    },
                    id: 1
                }),
                signal: AbortSignal.timeout(30000)
                });

            if (!ragAnswer.ok) {
                throw new Error(`Python API error: ${ragAnswer.status} ${ragAnswer.statusText}`);
            }

            const ragData = await ragAnswer.json();

            console.log(ragData);

            //this for python fastapi (main.py)
            
            // const finalAnswer = ragData.answer || ragData.response || 'Tidak ada jawaban yang ditemukan';

            let answerText = ragData.result?.content?.[0]?.text || 'Tidak ada jawaban';

            // Jika answerText berupa JSON string, parse dulu untuk ambil references

            let parsedAnswer: any = answerText;
            let references: any[] = [];
            try {
            parsedAnswer = JSON.parse(answerText);
            // Jika hasil parsing punya references, ambil
            if (parsedAnswer && parsedAnswer.references) {
                references = parsedAnswer.references;
                // Jika ingin, bisa juga ambil jawaban utama dari parsedAnswer.response atau parsedAnswer.answer
                answerText = parsedAnswer.response || parsedAnswer.answer || answerText;
            }
            }   catch(error){
                console.error('Error calling Python API:', error);
                return NextResponse.json({ error: 'Failed to get response from AI service'}, {status: 502});
            }

            await prisma.chatMessage.create({
                data: {
                    sessionId,
                    role: 'user',
                    content: question,
                    contextNodeIds: forceWeb ? null : contextNodeIds,
                    contextEdgeIds: forceWeb ? null : contextEdgeIds,
                    references: []
                }
            });

            //for mcp
            await prisma.chatMessage.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: answerText,
                    contextNodeIds: forceWeb ? null : contextNodeIds,
                    contextEdgeIds: forceWeb ? null : contextEdgeIds,
                    references: references || [],
                }
            });

            return NextResponse.json({...ragData,answer: answerText || 'Tidak ada jawaban yang ditemukan.', references: references || []});

        }

        await prisma.chatMessage.create({
            data: {
                sessionId,
                role: 'user',
                content: question,
                contextNodeIds: forceWeb ? null : contextNodeIds,
                contextEdgeIds: forceWeb ? null : contextEdgeIds
            }
        });

        await prisma.chatMessage.create({
            data: {
                sessionId,
                role: 'assistant',
                content: answer,
                contextNodeIds: forceWeb ? null : contextNodeIds,
                contextEdgeIds: forceWeb ? null : contextEdgeIds
            }
        });

        return NextResponse.json({ answer });
    }
    
    /*
    else {
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
    */


    // const answer = thereIsNode ? await ragAnswer.json() : await chatAI(promptGeneral);
    // const answer: any = await chatAI(prompt);
    // return NextResponse.json({answer: answer.answer || 'Tidak ada jawaban yang ditemukan.'});  
};

export async function GET(req: NextRequest) {

    try {
        const supabase = await createServerSupabaseClient();
        const { data: {user}, error} = await supabase.auth.getUser();

        if (!user || error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        //add
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '3');
        const offset = (page - 1) * limit;

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        // Ambil chat history dari database
        const session = await prisma.brainstormingSession.findUnique({
        where: {
            id: sessionId,
            userId: user.id
        }
        });

         if (!session) {
            return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
        }

        const totalMessages = await prisma.chatMessage.count({
            where: {
                sessionId: sessionId,
            }
        })

        const chatHistory = await prisma.chatMessage.findMany({
            where: {
                sessionId: sessionId,
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: offset,
            take: limit,
        });

        const reversedHistory = chatHistory.reverse();

        const hasMore = offset + limit < totalMessages;

        return NextResponse.json({
            messages: reversedHistory,
            total: totalMessages,
            hasMore: hasMore,
            currentPage: page,
            totalPages: Math.ceil(totalMessages / limit)
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json({ error: 'Internal Server Error'}, {status: 500});   
    }
}
