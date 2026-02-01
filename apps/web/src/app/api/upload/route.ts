import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo nao permitido. Use JPG, PNG ou WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Arquivo muito grande (maximo 5MB)" },
        { status: 400 }
      );
    }

    // Gerar nome unico
    const ext = file.name.split(".").pop();
    const uniqueName = `${nanoid()}.${ext}`;

    // Verificar se tem token do Vercel Blob (producao)
    const hasVercelBlob = process.env.BLOB_READ_WRITE_TOKEN;

    if (hasVercelBlob) {
      // Upload para Vercel Blob (producao)
      const blob = await put(`uploads/${uniqueName}`, file, {
        access: "public",
      });
      return NextResponse.json({ url: blob.url });
    } else {
      // Salvar localmente (desenvolvimento)
      const uploadDir = path.join(process.cwd(), "public", "uploads");

      // Criar diretorio se nao existir
      await mkdir(uploadDir, { recursive: true });

      // Converter File para Buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Salvar arquivo
      const filePath = path.join(uploadDir, uniqueName);
      await writeFile(filePath, buffer);

      // Retornar URL local
      return NextResponse.json({ url: `/uploads/${uniqueName}` });
    }
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}
