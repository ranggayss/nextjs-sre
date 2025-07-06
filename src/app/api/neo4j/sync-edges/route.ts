import { NextRequest, NextResponse } from "next/server";
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
);

// Helper function untuk membersihkan dan normalize teks
function normalizeText(text: string): string {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // hapus punctuation
        .replace(/\s+/g, ' ') // normalize whitespace
        .trim();
}

// Helper function untuk mendapatkan kata kunci penting
function extractKeywords(text: string): string[] {
    const stopWords = ['dan', 'atau', 'yang', 'di', 'ke', 'dari', 'untuk', 'dengan', 'pada', 'dalam', 'adalah', 'akan', 'dapat', 'telah', 'serta', 'juga', 'ini', 'itu', 'tersebut', 'selama', 'menggunakan', 'metode'];
    
    return normalizeText(text)
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
}

// Helper function untuk menghitung similarity score yang lebih sensitif
function calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const keywords1 = extractKeywords(text1);
    const keywords2 = extractKeywords(text2);
    
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    // Jaccard similarity
    const intersection = keywords1.filter(word => keywords2.includes(word));
    const union = [...new Set([...keywords1, ...keywords2])];
    const jaccardScore = intersection.length / union.length;
    
    // Cosine similarity untuk kata yang mirip
    let cosineScore = 0;
    for (const word1 of keywords1) {
        for (const word2 of keywords2) {
            if (word1.includes(word2) || word2.includes(word1)) {
                cosineScore += 0.5; // partial match
            }
        }
    }
    cosineScore = cosineScore / Math.max(keywords1.length, keywords2.length);
    
    // Kombinasi kedua score
    return Math.max(jaccardScore, cosineScore);
}

// Helper function untuk mencari kata kunci yang sama (improved)
function findCommonKeywords(text1: string, text2: string): string[] {
    if (!text1 || !text2) return [];
    
    const keywords1 = extractKeywords(text1);
    const keywords2 = extractKeywords(text2);
    
    const exactMatches = keywords1.filter(word => keywords2.includes(word));
    
    // Tambahkan partial matches
    const partialMatches: string[] = [];
    for (const word1 of keywords1) {
        for (const word2 of keywords2) {
            if (word1 !== word2 && (word1.includes(word2) || word2.includes(word1))) {
                partialMatches.push(`${word1}~${word2}`);
            }
        }
    }
    
    return [...exactMatches, ...partialMatches.slice(0, 3)]; // limit partial matches
}

export async function POST(req: NextRequest){
    const session = driver.session();

    try {
        const body = await req.json();
        const { sessionId } = body;

        if(!sessionId){
            return NextResponse.json({error: 'Missing sessionId'}, { status: 400});
        }

        // Pertama, cek apakah ada nodes untuk sessionId ini
        const checkNodes = await session.run(
            'MATCH (a:Article) WHERE a.sessionId = $sessionId RETURN count(a) as nodeCount',
            { sessionId }
        );
        
        const nodeCount = checkNodes.records[0]?.get('nodeCount')?.toNumber() || 0;
        console.log(`Found ${nodeCount} nodes for sessionId: ${sessionId}`);

        if (nodeCount < 2) {
            return NextResponse.json({
                message: 'Not enough nodes to create edges',
                nodeCount
            });
        }

        const queries = [
            {
                relation: 'SAME_BACKGROUND',
                attribute: 'att_background',
                description: 'Memiliki latar belakang penelitian yang sama',
                threshold: 0.2
            },
            {
                relation: 'EXTENDED_METHOD', 
                attribute: 'att_method',
                description: 'Menggunakan atau mengembangkan metode yang serupa',
                threshold: 0.2
            },
            {
                relation: 'SHARES_GOAL',
                attribute: 'att_goal',
                description: 'Memiliki tujuan atau objektif penelitian yang sama',
                threshold: 0.15 // threshold lebih rendah untuk goal karena biasanya lebih spesifik
            },
            {
                relation: 'FOLLOWS_FUTURE_WORK',
                attribute: 'att_future',
                description: 'Mengikuti atau melanjutkan penelitian masa depan yang disarankan',
                threshold: 0.2
            },
            {
                relation: 'ADDRESSES_SAME_GAP',
                attribute: 'att_gaps',
                description: 'Mengatasi gap atau masalah penelitian yang sama',
                threshold: 0.2
            }
        ];

        let totalEdgesCreated = 0;
        const edgeDetails: any[] = [];

        // Ambil semua artikel untuk processing
        const articlesResult = await session.run(
            `MATCH (a:Article) WHERE a.sessionId = $sessionId 
             RETURN a.id as id, a.title as title, a.att_background as background, 
                    a.att_method as method, a.att_goal as goal, 
                    a.att_future as future, a.att_gaps as gaps`,
            { sessionId }
        );

        const articles = articlesResult.records.map(record => ({
            id: record.get('id'),
            title: record.get('title'),
            att_background: record.get('background'),
            att_method: record.get('method'),
            att_goal: record.get('goal'),
            att_future: record.get('future'),
            att_gaps: record.get('gaps'),
            att_url: record.get('url'),
        }));

        // Process each relation type
        for (const { relation, attribute, description, threshold } of queries) {
            for (let i = 0; i < articles.length; i++) {
                for (let j = i + 1; j < articles.length; j++) {
                    const article1 = articles[i];
                    const article2 = articles[j];
                    
                    const text1 = article1[attribute as keyof typeof article1] as string;
                    const text2 = article2[attribute as keyof typeof article2] as string;

                    if (!text1 || !text2 || text1.trim() === '' || text2.trim() === '') {
                        continue;
                    }

                    const similarity = calculateSimilarity(text1, text2);
                    const commonKeywords = findCommonKeywords(text1, text2);

                    if (similarity >= threshold && commonKeywords.length > 0) {
                        // Create relationship dengan penjelasan yang lengkap
                        const createEdgeCypher = `
                            MATCH (a:Article {id: $id1}), (b:Article {id: $id2})
                            WHERE a.sessionId = $sessionId AND b.sessionId = $sessionId
                            MERGE (a)-[r:${relation}]->(b)
                            SET r.weight = $weight,
                                r.created = datetime(),
                                r.description = $description,
                                r.similarity_score = $similarity,
                                r.common_keywords = $commonKeywords,
                                r.matching_text_a = $textA,
                                r.matching_text_b = $textB,
                                r.explanation = $explanation
                            RETURN r
                        `;

                        const explanation = `Artikel "${article1.title}" dan "${article2.title}" terkait karena ${description.toLowerCase()}. ` +
                                         `Kesamaan konten: ${(similarity * 100).toFixed(1)}%. ` +
                                         `Kata kunci yang sama: ${commonKeywords.join(', ')}.`;

                        try {
                            await session.run(createEdgeCypher, {
                                id1: article1.id,
                                id2: article2.id,
                                sessionId,
                                weight: similarity,
                                description,
                                similarity: similarity,
                                commonKeywords,
                                textA: text1.substring(0, 200) + (text1.length > 200 ? '...' : ''),
                                textB: text2.substring(0, 200) + (text2.length > 200 ? '...' : ''),
                                explanation
                            });

                            totalEdgesCreated++;
                            edgeDetails.push({
                                relation,
                                from: article1.title,
                                to: article2.title,
                                similarity: similarity,
                                commonKeywords,
                                explanation
                            });

                            console.log(`Created ${relation} edge: ${article1.title} -> ${article2.title} (similarity: ${similarity.toFixed(3)})`);
                        } catch (error) {
                            console.error(`Error creating ${relation} edge:`, error);
                        }
                    }
                }
            }
        }

        // Jika tidak ada edges yang dibuat dengan attribute matching, buat default connection dengan penjelasan
        if (totalEdgesCreated === 0) {
            for (let i = 0; i < Math.min(articles.length, 5); i++) {
                for (let j = i + 1; j < Math.min(articles.length, 5); j++) {
                    const article1 = articles[i];
                    const article2 = articles[j];

                    const defaultCypher = `
                        MATCH (a:Article {id: $id1}), (b:Article {id: $id2})
                        WHERE a.sessionId = $sessionId AND b.sessionId = $sessionId
                        MERGE (a)-[r:RELATED]->(b)
                        SET r.weight = 0.5,
                            r.created = datetime(),
                            r.type = 'default',
                            r.description = $description,
                            r.explanation = $explanation
                        RETURN r
                    `;
                    
                    const explanation = `Artikel "${article1.title}" dan "${article2.title}" dikelompokkan dalam sesi yang sama. ` +
                                      `Hubungan ini dibuat secara default karena tidak ditemukan kesamaan spesifik dalam atribut yang dianalisis.`;

                    try {
                        await session.run(defaultCypher, {
                            id1: article1.id,
                            id2: article2.id,
                            sessionId,
                            description: 'Artikel dalam sesi yang sama',
                            explanation
                        });

                        totalEdgesCreated++;
                        edgeDetails.push({
                            relation: 'RELATED',
                            from: article1.title,
                            to: article2.title,
                            similarity: 0.5,
                            explanation
                        });
                    } catch (error) {
                        console.error('Error creating default edge:', error);
                    }
                }
            }
        }

        return NextResponse.json({
            message: 'Neo4j edges synced successfully with detailed explanations',
            totalEdgesCreated,
            sessionId,
            edgeDetails: edgeDetails.slice(0, 10) // Tampilkan 10 edge detail pertama
        });

    } catch (error) {
        console.error('Neo4j sync edges error:', error);
        return NextResponse.json({ 
            error: 'Neo4j sync edges failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {status: 500});
    } finally{
        await session.close();
    }
}