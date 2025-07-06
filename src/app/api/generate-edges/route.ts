import { prisma } from "@/lib/prisma";
import { getColorFromRelation } from "@/utils/getColorFromRelation";
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { buildRelationPrompt } from "@/utils/buildRelationPrompt";

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export const POST = async (req: NextRequest) => {
  try {
    const { articleIds } = await req.json();

    // Ambil semua nodes yang articleId-nya termasuk dalam array articleIds
    // Karena setiap artikel hanya 1 node, ini sesuai dengan struktur terbaru
    const allOtherNodes = await prisma.node.findMany({
      where: {
        articleId: {
          notIn: articleIds,
        }
      }
    });

    const newNodes = await prisma.node.findMany({
      where: {
        articleId: {
          in: articleIds,
        },
      },
    });

    // Build prompt dari nodes (bisa 1 node atau lebih)
    const nodes = [...allOtherNodes, ...newNodes]

    const prompt = buildRelationPrompt(nodes);

    // Generate edges menggunakan AI
    const result = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const textOutput =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON dari response AI (mendukung code block ```json ...```)
    const jsonMatch =
      textOutput.match(/```json([\s\S]*?)```/) ||
      textOutput.match(/```([\s\S]*?)```/);
    const json = jsonMatch ? jsonMatch[1] : textOutput;

    const edges = JSON.parse(json);

    console.log("Edges to be saved:", edges);
    console.log("Raw AI response:", textOutput);
    console.log("Extracted JSON:", json);

    const validEdges = [];
    for (const edge of edges){
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);

      if (!fromNode) {
        console.warn(`❌ From node ${edge.from} not found, skipping edge`);
        continue;
      }
      
      if (!toNode) {
        console.warn(`❌ To node ${edge.to} not found, skipping edge`);
        continue;
      }

      const edgeArticleId = fromNode.articleId;

      validEdges.push({
        fromId: edge.from,
        toId: edge.to,
        relation: edge.relation || null,
        label: edge.label || null,
        color: getColorFromRelation(edge.relation),
        articleId: edgeArticleId, // FIXED: Use articleId from the node
      });  
    }

    if (validEdges.length === 0) {
    return NextResponse.json({ 
      success: true, 
      nodes, 
      edges: [],
      message: "No valid edges to create" 
    });
    }

    const createdEdges = await prisma.edge.createMany({
      data: validEdges,
      skipDuplicates: true,
    });

    console.log("💾 Created edges:", createdEdges.count);

    /*
    // Simpan edges ke DB
    await prisma.edge.createMany({
      data: edges.map((edge: any) => ({
        fromId: edge.from,
        toId: edge.to,
        relation: edge.relation,
        label: edge.label,
        color: getColorFromRelation(edge.relation),
        // Asumsi articleId sama dengan articleId node "from"
        articleId:
          nodes.find((n: any) => n.id === edge.from)?.id ||
          articleIds[0],
      })),
      skipDuplicates: true,
    });
    */

    return NextResponse.json({ success: true, nodes, edges });
  } catch (error) {
    console.error("Generate edges error:", error);
    return NextResponse.json(
      { error: "Failed to generate edges" },
      { status: 500 }
    );
  }
};
