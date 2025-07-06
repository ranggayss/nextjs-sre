import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { node_ids = [], edge_ids = [] } = await request.json()

    const [nodes, edges] = await Promise.all([
      prisma.node.findMany({
        where: { id: { in: node_ids } },
        include: {
          article: true,
          fromEdges: true,
          toEdges: true
        }
      }),
      prisma.edge.findMany({
        where: { id: { in: edge_ids } },
        include: {
          from: true,
          to: true,
          article: true
        }
      })
    ])

    const response = {
      nodes: nodes.map(node => ({
        id: node.id,
        label: node.label,
        title: node.title,
        type: node.type,
        content: node.content,
        attributes: {
          goal: node.att_goal,
          method: node.att_method,
          background: node.att_background,
          future: node.att_future,
          gaps: node.att_gaps,
          url: node.att_url
        },
        article: node.article ? {
          id: node.article.id,
          title: node.article.title
        } : null,
        connected_edges: [...node.fromEdges, ...node.toEdges].map(e => e.id)
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        relation: edge.relation,
        label: edge.label,
        color: edge.color,
        from: edge.fromId,
        to: edge.toId,
        article: edge.article ? {
          id: edge.article.id,
          title: edge.article.title
        } : null,
        nodes_info: {
          from: {
            label: edge.from?.label,
            type: edge.from?.type
          },
          to: {
            label: edge.to?.label,
            type: edge.to?.type
          }
        }
      }))
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Graph context error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}