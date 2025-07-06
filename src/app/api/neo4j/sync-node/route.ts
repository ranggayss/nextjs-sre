import { NextRequest, NextResponse } from "next/server";
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);

export async function POST (req: NextRequest){
    const session = driver.session();

    try {
        const { sessionId, articleId, nodeData } = await req.json();

        if (!nodeData || !nodeData.id){
            return NextResponse.json({ error: 'Missing node data'}, {status: 400});
        }

        const cypher = `
            MERGE (a:Article { id: $id})
            SET 
                a.title = $title,
                a.att_background = $att_background,
                a.att_method = $att_method,
                a.att_goal = $att_goal,
                a.att_future = $att_future,
                a.att_gaps = $att_gaps,
                a.att_url = $att_url,
                a.articleId = $articleId,
                a.sessionId = $sessionId
        `;

        const params = {
            id: nodeData.id,
            title: nodeData.title || '',
            att_background: nodeData.att_background || '',
            att_method: nodeData.att_method || '',
            att_goal: nodeData.att_goal || '',
            att_future: nodeData.att_future || '',
            att_gaps: nodeData.att_gaps || '',
            att_url: nodeData.att_url || '',
            articleId: articleId,
            sessionId: sessionId,
        };

        await session.run(cypher, params);

        return NextResponse.json({ message: 'Node synced to Neo4j'});
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: 'Neo4j sync failed'}, {status: 500});
    } finally {
        await session.close();
    }
}