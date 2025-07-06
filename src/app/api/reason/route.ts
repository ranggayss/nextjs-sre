// app/api/reason/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { input, force_web, external_context } = await request.json()
    
    // Log untuk debugging
    console.log('Reasoning request:', { 
      input: input.substring(0, 50), 
      force_web, 
      external_context 
    })
    
    // Inisialisasi dengan strategy yang lebih specific
    let strategy = "hybrid";
    let confidence = 0.8;
    const context_sources = ["vector_db"];
    const reasoning_chain = [
      `Processing input: ${input.substring(0, 30)}...`,
      "Initialized reasoning flow"
    ]

    // Analisis berdasarkan external context (node_ids)
    if (external_context?.node_ids && external_context.node_ids.length > 0) {
      try {
        const nodes = await prisma.node.findMany({
          where: { id: { in: external_context.node_ids } },
          select: {
            id: true,
            title: true,
            att_goal: true,
            att_method: true,
            att_background: true,
            type: true // Pastikan field type ada
          }
        })

        console.log(`Found ${nodes.length} nodes for reasoning`)
        reasoning_chain.push(`Found ${nodes.length} relevant nodes`)

        if (nodes.length > 0) {
          // Analisis konten nodes untuk menentukan strategy
          const hasTechnicalMethods = nodes.some(n => 
            n.att_method && (
              n.att_method.toLowerCase().includes("experiment") ||
              n.att_method.toLowerCase().includes("methodology") ||
              n.att_method.toLowerCase().includes("analysis")
            )
          )
          
          const hasTheory = nodes.some(n => 
            n.att_background && (
              n.att_background.toLowerCase().includes("theory") ||
              n.att_background.toLowerCase().includes("framework") ||
              n.att_background.toLowerCase().includes("concept")
            )
          )

          const hasGoal = nodes.some(n => 
            n.att_goal && n.att_goal.length > 10
          )

          // Tentukan strategy berdasarkan konten
          if (hasTechnicalMethods) {
            strategy = "technical_article_analysis"
            confidence = 0.9
            reasoning_chain.push("Detected technical research methods")
          } else if (hasTheory) {
            strategy = "theoretical_article_analysis"
            confidence = 0.85
            reasoning_chain.push("Detected theoretical content")
          } else if (hasGoal) {
            strategy = "goal_oriented_analysis"
            confidence = 0.8
            reasoning_chain.push("Detected goal-oriented content")
          } else {
            strategy = "rag_only"
            confidence = 0.75
            reasoning_chain.push("Using RAG-only approach for structured content")
          }
          
          // Tambahkan graphdb sebagai context source
          context_sources.push("graphdb")
        }
      } catch (nodeError) {
        console.error('Error fetching nodes:', nodeError)
        reasoning_chain.push("Error fetching graph context, using fallback")
        strategy = "rag_only"
        confidence = 0.6
      }
    }

    // Override jika force_web aktif
    if (force_web) {
      strategy = "web_enhanced"
      context_sources.push("web_search")
      reasoning_chain.push("Force enabled web search")
      confidence = Math.min(confidence + 0.1, 1.0)
    }

    // Jika tidak ada context khusus, gunakan hybrid
    if (!external_context?.node_ids && !force_web) {
      strategy = "hybrid"
      context_sources.push("web_search")
      reasoning_chain.push("Using hybrid approach (RAG + Web)")
    }

    const result = {
      strategy,
      confidence,
      context_sources,
      reasoning_chain,
      metadata: {
        node_count: external_context?.node_ids?.length || 0,
        edge_count: external_context?.edge_ids?.length || 0,
        force_web
      }
    }

    console.log('Reasoning result:', result)
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Reasoning error:', error)
    return NextResponse.json(
      { 
        strategy: "error",
        confidence: 0.0,
        context_sources: [],
        reasoning_chain: ["Error during reasoning: " + error.message],
        error: error.message 
      },
      { status: 500 }
    )
  }
}