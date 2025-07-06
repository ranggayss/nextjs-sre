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

        const { data: pdfData, error: downloadError } = await supabase.storage.from("uploads").download(uploadFileName);

        if (downloadError || !pdfData) throw new Error("Gagal mendownload file PDF");


        // await Promise.all(fileWritePromises);

        // Baca isi PDF
        // const fullPath = path.join(process.cwd(), "public", savedFilePath);
        const buffer: any = Buffer.from(await pdfData.arrayBuffer());
        const extractedText = await readPDFContent(buffer);

        // Analisis dengan AI => object dengan properti att_*
        const aiSections = await analyzeWithAI(extractedText);

        const firstNode: ExtendedNode = aiSections[0] ?? {
          label: "Ringkasan",
          type: "article",
          title: title,
          content: extractedText.substring(0, 2000),
          att_goal: "",
          att_method: "",
          att_background: "",
          att_future: "",
          att_gaps: "",
          att_url: publicUrl,
        };

        // Simpan artikel dulu
        const article = await prisma.article.create({
          data: {
            title,
            filePath: publicUrl,
            userId: userId,
            sessionId: sessionId || null,
            // createdAt: new Date(),
          },
        });
        
        // Simpan node terkait article
        const node = await prisma.node.create({
          data: {
            label: firstNode.label ||"ARTIKEL-01", // Bisa diganti sesuai kebutuhan
            title,
            att_goal: firstNode.att_goal || null,
            att_method: firstNode.att_method || null,
            att_background: firstNode.att_background || null,
            att_future: firstNode.att_future || null,
            att_gaps: firstNode.att_gaps || null,
            att_url: publicUrl,
            type: "article",
            content: extractedText.substring(0, 2000), // contoh potongan konten
            articleId: article.id,
          },
        });

        /*
        await fetch("http://localhost:8000/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pdf_url: `${process.env.BASE_URL}${publicUrl}`
          })
        });
        */

        // Panggil API generate edges (external route)
        const edgeRes = await fetch(`${process.env.BASE_URL}/api/generate-edges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleIds: [article.id] }),
        });

        if (!edgeRes.ok) throw new Error("Failed to generate edges");
        const edgeData = await edgeRes.json();

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

        resolve(
          NextResponse.json({
            message: "File uploaded and processed successfully",
            article,
            node,
            edges: edgeData.edges,
          })
        );
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
