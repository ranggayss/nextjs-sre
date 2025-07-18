// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import path from "path";
import Busboy from "busboy";
import { prisma } from "@/lib/prisma";
import { readPDFContent } from "@/utils/pdfReader";
import { analyzeWithAI, ExtendedNode } from "@/utils/analyzeWithAI";
import { Readable } from "stream";
import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface NodeForEdgeGen {
  id: string;
  label: string;
  title: string | null;
  att_goal: string | null;
  att_method: string | null;
  att_background: string | null;
  att_future: string | null;
  att_gaps: string | null;
  att_url: string | null;
  articleId: string;
}

interface GeneratedArticleNodeResponse {
  label: string;
  type: string;
  title: string | null;
  content: string;
  att_goal: string | null;
  att_method: string | null;
  att_background: string | null;
  att_future: string | null;
  att_gaps: string | null;
  att_url: string | null;
}

interface EdgeDataFromAI {
  from: string;
  to: string;
  relation: string;
  label: string;
}

export const config = {
  api: {
    bodyParser: false,
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return new Promise((resolve, reject) => {
    // const uploadsDir = path.join(process.cwd(), "public", "uploads");
    // if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

    const busboy = Busboy({ headers: Object.fromEntries(req.headers) });
    let title = "Untitled";
    let sessionId = "";
    let fileBuffer: Buffer;
    let uploadFileName = "";
    let originalFileName = "";
    let author = "";
    let year = "";
    let abstract = "";
    let keywords = "";
    let doi = "";

    const chunks: Buffer[] = [];

    // let savedFilePath = "";
    // const fileWritePromises: Promise<void>[] = [];

    busboy.on("file", (fieldname, file, filename) => {
      const safeFileName = typeof filename === "string" ? filename : "document.pdf";
      const safeOriginalName = safeFileName.replace(/[^\w.\-]/g, "_");

      const fileExtension = path.extname(safeOriginalName);
      const fileBaseName = path.basename(safeOriginalName, fileExtension);

      originalFileName = fileBaseName;

      uploadFileName = `${fileBaseName}-${Date.now()}${fileExtension}`;

      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });

      /*
      const uniqueFileName = `${Date.now()}-${safeOriginalName}`;
      const fullPath = path.join(uploadsDir, uniqueFileName);
      savedFilePath = `/uploads/${uniqueFileName}`;

      const writeStream = createWriteStream(fullPath);
      file.pipe(writeStream);

      fileWritePromises.push(
        new Promise((res, rej) => {
          writeStream.on("finish", () => {
            console.log(`✅ File written to ${fullPath}`);
            res();
          });
          writeStream.on("error", rej);
        })
      );
    });
    */
    });

    busboy.on("field", (fieldname, val) => {
      if (fieldname === "title") {
        title = val;
      } if (fieldname === "sessionId") {
        sessionId = val;
      } if (fieldname === "author"){
        author = val;
      } if (fieldname === "year"){
        year = val;
      } if (fieldname === "abstract"){
        abstract = val;
      } if (fieldname === "keywords"){
        keywords = val;
      } if (fieldname === "doi"){
        doi = val;
      }
    });

    busboy.on("finish", async () => {
      const supabase = await createServerSupabaseClient();
      const { data: {user}, error } = await supabase.auth.getUser();

      if (!user || error) {
        return resolve(NextResponse.json({error: 'Unauthorized'}, {status: 401}));
      }

      const userId = user.id;

      try {
        if (title === "Untitled" && originalFileName){
          title = originalFileName;
        };

        const {error: uploadError} = await supabase.storage.from("uploads").upload(uploadFileName, fileBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

        if (uploadError){
          console.error("Upload gagal:", uploadError.message);
        };

        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(uploadFileName);
        const publicUrl = urlData?.publicUrl || "";

        // const { data: pdfData, error: downloadError } = await supabase.storage.from("uploads").download(uploadFileName);

        // if (downloadError || !pdfData) throw new Error("Gagal mendownload file PDF");

        // await Promise.all(fileWritePromises);

        // Baca isi PDF
        // const fullPath = path.join(process.cwd(), "public", savedFilePath);
        // const buffer: any = Buffer.from(await pdfData.arrayBuffer());
        // const extractedText = await readPDFContent(buffer);

        // Analisis dengan AI => object dengan properti att_*
        // const aiSections = await analyzeWithAI(extractedText);

        // const firstNode: ExtendedNode = aiSections[0] ?? {
        //   label: "Ringkasan",
        //   type: "article",
        //   title: title,
        //   content: extractedText.substring(0, 2000),
        //   att_goal: "",
        //   att_method: "",
        //   att_background: "",
        //   att_future: "",
        //   att_gaps: "",
        //   att_url: publicUrl,
        // };

        // Simpan artikel dulu
        const article = await prisma.article.create({
          data: {
            title,
            filePath: publicUrl,
            userId: userId,
            sessionId: sessionId || null,
            author: author || null,
            year: year || null,
            abstract: abstract || null,
            keywords: keywords || null,
            doi: doi || null,
            // createdAt: new Date(),
          },
        });
        
        // Simpan node terkait article
        // const node = await prisma.node.create({
        //   data: {
        //     label: firstNode.label ||"ARTIKEL-01", // Bisa diganti sesuai kebutuhan
        //     title,
        //     att_goal: firstNode.att_goal || null,
        //     att_method: firstNode.att_method || null,
        //     att_background: firstNode.att_background || null,
        //     att_future: firstNode.att_future || null,
        //     att_gaps: firstNode.att_gaps || null,
        //     att_url: publicUrl,
        //     type: "article",
        //     content: extractedText.substring(0, 2000), // contoh potongan konten
        //     articleId: article.id,
        //   },
        // });

        //this for mainpy(fastapi)
        
        // await fetch(`${process.env.PY_URL}/api/process-pdf`, {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({
        //     pdf_url: `${publicUrl}`,
        //     session_id: sessionId,
        //     node_id: node.id,
        //     metadata: {
        //       title: title,
        //     }
        //   })
        // });
        

        //this for mcp_server
        const mcpResponse = await fetch(`${process.env.PY_URL}/mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "process_pdf",
              arguments: {
                pdf_url: publicUrl,
                session_id: sessionId,
                node_id: article.id,
                metadata: { title: article.title, article_id: article.id }
              }
            },
            id: 1
          })
        });

        if (!mcpResponse.ok) {
            const errorBody = await mcpResponse.text();
            console.error("DEBUG: Python server returned an error status:", mcpResponse.status, errorBody);
            throw new Error(`Python server failed for node generation/vector DB: ${mcpResponse.status} ${errorBody}`);
        }

        const pythonResult = await mcpResponse.json();
        console.log("DEBUG: Raw pythonResult from /mcp:", pythonResult); // <-- Tambahkan ini

        let rawPythonResultString: string | undefined;

        if (
            pythonResult?.result &&
            Array.isArray(pythonResult.result.content) &&
            pythonResult.result.content.length > 0 &&
            pythonResult.result.content[0]?.type === 'text' &&
            typeof pythonResult.result.content[0].text === 'string'
        ) {
            rawPythonResultString = pythonResult.result.content[0].text;
        } else if (typeof pythonResult.result === 'string') {
            // Fallback for cases where 'result' itself might be the string (less likely with agent output)
            rawPythonResultString = pythonResult.result;
        }

        if (!rawPythonResultString) {
            // This case means the structure was not as expected
            console.error("DEBUG: Unexpected structure of Python result:", pythonResult.result);
            throw new Error("Python returned an unexpected result structure.");
        }

        const parsedPythonResult = JSON.parse(rawPythonResultString);
        console.log("DEBUG: parsedPythonResult after processing .result:", parsedPythonResult); // <-- Tambahkan ini


        const generatedArticleNodeData: GeneratedArticleNodeResponse | null = parsedPythonResult?.generated_article_node || null;
        console.log("DEBUG: extracted generatedArticleNodeData:", generatedArticleNodeData); // <-- Tambahkan ini


        if (!generatedArticleNodeData) {
            throw new Error("Python did not return article node data.");
        }

        // 4. Simpan "Node Induk" yang dihasilkan Python ke Prisma
        const parentNode = await prisma.node.create({
          data: {
            label: generatedArticleNodeData.label,
            title: title,
            type: generatedArticleNodeData.type,
            content: generatedArticleNodeData.content,
            att_url: generatedArticleNodeData.att_url || publicUrl,
            articleId: article.id, // Node berelasi dengan article
            att_goal: generatedArticleNodeData.att_goal,
            att_method: generatedArticleNodeData.att_method,
            att_background: generatedArticleNodeData.att_background,
            att_future: generatedArticleNodeData.att_future,
            att_gaps: generatedArticleNodeData.att_gaps,
          },
        });

        const createdChildNodes: any[] = [];

        let createdEdges = [];
        if (sessionId){
          const articleInSession = await prisma.article.findMany({
            where: {
              sessionId: sessionId,
            },
            select: {
              id: true,
            }
          });

          const articleIdsInSession = articleInSession.map(art => art.id);

          const allNodesForEdgeGeneration: NodeForEdgeGen[] = await prisma.node.findMany({
            where: {
              articleId: {
                in: articleIdsInSession,
              },
            },
            select: {
              id: true,
              label: true,
              title: true,
              att_goal: true,
              att_method: true,
              att_background: true,
              att_future: true,
              att_gaps: true,
              att_url: true,
              articleId: true,
            }
          });

          const parentNodeAlreadyInList = allNodesForEdgeGeneration.some(node => node.id === parentNode.id);
          if (!parentNodeAlreadyInList) {
                // Tambahkan parentNode secara eksplisit jika belum ada (untuk kasus race condition)
                allNodesForEdgeGeneration.push({
                    id: parentNode.id,
                    label: parentNode.label,
                    title: parentNode.title,
                    att_goal: parentNode.att_goal,
                    att_method: parentNode.att_method,
                    att_background: parentNode.att_background,
                    att_future: parentNode.att_future,
                    att_gaps: parentNode.att_gaps,
                    att_url: parentNode.att_url,
                    articleId: parentNode.articleId,
                });
          }

          if (allNodesForEdgeGeneration.length > 1){
            const edgeMcpResponse = await fetch(`${process.env.PY_URL}/mcp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                  name: 'generate_edges_from_all_nodes',
                  arguments: {
                    all_nodes_data: allNodesForEdgeGeneration
                  }
                },
                id: 2
              })
            });

            if (!edgeMcpResponse.ok) {
                const errorBody = await edgeMcpResponse.text();
                console.error("Python server failed for edge generation:", edgeMcpResponse.status, errorBody);
            };

            let generatedEdgesData: EdgeDataFromAI[] = [];
            try {
              const edgePythonResult = await edgeMcpResponse.json();
              console.log("DEBUG: Raw edgePythonResult from /mcp for edges:", edgePythonResult); // Add this log!

              // Adjust parsing here:
              let rawEdgeResultString: string | undefined;
              if (
                  edgePythonResult?.result &&
                  Array.isArray(edgePythonResult.result.content) &&
                  edgePythonResult.result.content.length > 0 &&
                  edgePythonResult.result.content[0]?.type === 'text' &&
                  typeof edgePythonResult.result.content[0].text === 'string'
              ) {
                  rawEdgeResultString = edgePythonResult.result.content[0].text;
              } else if (typeof edgePythonResult.result === 'string') {
                  rawEdgeResultString = edgePythonResult.result;
              } else {
                  // If result is already the array, like { content: [ { type: 'text', text: '[{"from":...}]' } ] }
                  // And the inner text IS the array, so just use it.
                  rawEdgeResultString = JSON.stringify(edgePythonResult.result); // This is a bit of a hack if it's already parsed JSON directly
              }

if (!rawEdgeResultString) {
                  console.warn("Python did not return a valid string for edges.");
                  generatedEdgesData = [];
              } else {
                  // Attempt to parse the string. It should be an array directly.
                  const parsedEdgePythonResult = JSON.parse(rawEdgeResultString);
                  console.log("DEBUG: parsedEdgePythonResult for edges:", parsedEdgePythonResult); // Add this log!

                  // The main fix: the result *is* the array, not an object with an 'edges' key.
                  if (Array.isArray(parsedEdgePythonResult)) {
                      generatedEdgesData = parsedEdgePythonResult;
                  } else {
                      // Fallback if the structure is unexpected (e.g., if it came as { "edges": [...] })
                      generatedEdgesData = (parsedEdgePythonResult as any)?.edges || [];
                  }
              }

              if (!Array.isArray(generatedEdgesData)) {
                  console.warn("Python did not return an array for edges.");
                  generatedEdgesData = [];
              }
            } catch (parseErr) {
              console.error("Error parsing edge Python response:", parseErr);
            };

            for (const edgeData of generatedEdgesData){
              const sourceNode = allNodesForEdgeGeneration.find(n => n.id === edgeData.from);
              const targetNode = allNodesForEdgeGeneration.find(n => n.id === edgeData.to);
              
              if (sourceNode && targetNode){
                try {
                  const newEdge = await prisma.edge.create({
                    data: {
                      fromId: sourceNode.id,
                      toId: targetNode.id,
                      label: edgeData.label || 'related_to',
                      relation: edgeData.relation || 'related_to',
                      color: 'gray',
                      articleId: article.id
                    }
                  });

                  createdEdges.push(newEdge);
                } catch (error: any) {
                  if (error.code === 'P2002'){
                    console.warn(`Skipping duplicate edge: from ${sourceNode.id} to ${targetNode.id}`);
                  } else {
                    console.error(`Error saving edge to DB: ${error.message}`);
                  }
                }
              } else {
                console.warn(`Skipping edge due to unresolvable source/target ID from AI (not in current session or invalid ID) : from ${edgeData.from} to ${edgeData.to}.`);
              }
            }
          } else {
            console.log("Only one node in session, no edges to generate.");
          }
          
          resolve(
          NextResponse.json({
              message: "File uploaded, article node and edges generated and processed successfully",
              article,
              parentNode,
              childNodes: createdChildNodes,
              edges: createdEdges,
            })
          );
        }
        

        // Panggil API generate edges (external route)
        // const edgeRes = await fetch(`${process.env.BASE_URL}/api/generate-edges`, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({ articleIds: [article.id] }),
        // });

        // if (!edgeRes.ok) throw new Error("Failed to generate edges");
        // const edgeData = await edgeRes.json();

        /*
        await fetch(`${process.env.BASE_URL}/api/neo4j/sync-node`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: sessionId,
            articleId: article.id,
            nodeData: {
              id: node.id,
              title: node.title,
              att_background: node.att_background,
              att_method: node.att_method,
              att_goal: node.att_goal,
              att_future: node.att_future,
              att_gaps: node.att_gaps,
              att_url: node.att_url,
            },
          }),
        });
        

        
        await fetch(`${process.env.BASE_URL}/api/neo4j/sync-edges`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            sessionId,
          })
        });
        */

        // resolve(
        //   NextResponse.json({
        //     message: "File uploaded and processed successfully",
        //     article,
        //     node,
        //     edges: edgeData.edges,
        //   })
        // );
      } catch (err) {
        console.error("Processing error:", err);
        reject(
          NextResponse.json(
            {
              message: "Processing failed",
              error: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
          )
        );
      }
    });

    if (!req.body) {
      return resolve(NextResponse.json({ message: "No file data" }, { status: 400 }));
    }

    // Convert Web ReadableStream to Node.js Readable stream
    const stream = Readable.fromWeb(req.body as any);
    stream.pipe(busboy);
  });
}
