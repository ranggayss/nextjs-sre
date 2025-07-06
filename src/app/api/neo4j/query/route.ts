// app/api/neo4j/query/route.ts - API untuk mengambil data dari Neo4j
import { NextRequest, NextResponse } from "next/server";
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);

export async function GET(req: NextRequest) {
    const session = driver.session();
    
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');
        
        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
        }

        // Query untuk mendapatkan nodes dan relationships
        const cypher = `
            MATCH (n:Article)
            WHERE n.sessionId = $sessionId
            OPTIONAL MATCH (n)-[r]-(m:Article)
            WHERE m.sessionId = $sessionId
            RETURN n, r, m, r.explanation as explanation, type(r) as relationType
        `;

        const result = await session.run(cypher, { sessionId });
        
        const nodes = new Map();
        const edges: any[] = [];

        result.records.forEach(record => {
            const node = record.get('n');
            const relationship = record.get('r');
            const relatedNode = record.get('m');

            // Add source node
            if (node) {
                const nodeId = node.properties.id;
                if (!nodes.has(nodeId)) {
                    nodes.set(nodeId, {
                        id: nodeId,
                        label: node.properties.title || 'Untitled',
                        title: node.properties.title || 'Untitled',
                        att_background: node.properties.att_background || '',
                        att_method: node.properties.att_method || '',
                        att_goal: node.properties.att_goal || '',
                        att_future: node.properties.att_future || '',
                        att_gaps: node.properties.att_gaps || '',
                        att_url: node.properties.att_url || '',
                        articleId: node.properties.articleId,
                        sessionId: node.properties.sessionId,
                    });
                }
            }

            // Add related node and relationship
            if (relationship && relatedNode) {
                const relatedNodeId = relatedNode.properties.id;
                
                if (!nodes.has(relatedNodeId)) {
                    nodes.set(relatedNodeId, {
                        id: relatedNodeId,
                        label: relatedNode.properties.title || 'Untitled',
                        title: relatedNode.properties.title || 'Untitled',
                        att_background: relatedNode.properties.att_background || '',
                        att_method: relatedNode.properties.att_method || '',
                        att_goal: relatedNode.properties.att_goal || '',
                        att_future: relatedNode.properties.att_future || '',
                        att_gaps: relatedNode.properties.att_gaps || '',
                        att_url: relatedNode.properties.att_url || '',
                        articleId: relatedNode.properties.articleId,
                        sessionId: relatedNode.properties.sessionId,
                    });
                }

                edges.push({
                    from: node.properties.id,
                    to: relatedNode.properties.id,
                    label: record.get('relationType'),
                    description: relationship.properties.description || '',
                    explanation: record.get('explanation'),
                    weight: relationship.properties.weight || 1.0,
                    type: record.get('relationType').toLowerCase(),
                    relation: record.get('relationType').toLowerCase(),
                });
            }
        });

        const graphData = {
            nodes: Array.from(nodes.values()),
            edges: edges,
        };

        return NextResponse.json(graphData);

    } catch (error) {
        console.error('Neo4j query error:', error);
        return NextResponse.json({ 
            error: 'Failed to query Neo4j',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    } finally {
        await session.close();
    }
}

export async function POST(req: NextRequest) {
    const session = driver.session();
    
    try {
        const { query, params } = await req.json();
        
        if (!query) {
            return NextResponse.json({ error: 'Missing query' }, { status: 400 });
        }

        const result = await session.run(query, params || {});
        
        const records = result.records.map(record => {
            const obj: any = {};
            record.keys.forEach((key, index) => {
                obj[key] = record.get(index);
            });
            return obj;
        });

        return NextResponse.json({ records });

    } catch (error) {
        console.error('Neo4j custom query error:', error);
        return NextResponse.json({ 
            error: 'Failed to execute custom query',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    } finally {
        await session.close();
    }
}