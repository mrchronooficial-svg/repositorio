import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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

    const ext = file.name.split(".").pop();
    const uniqueName = `${nanoid()}.${ext}`;

    // Desenvolvimento local sem token do Vercel Blob: salva em public/uploads-local
    // para nao gravar fotos de teste no armazenamento de producao.
    if (!process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== "production") {
      const dir = path.join(process.cwd(), "public", "uploads-local");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, uniqueName), Buffer.from(await file.arrayBuffer()));
      return NextResponse.json({ url: `/uploads-local/${uniqueName}` });
    }

    const blob = await put(`uploads/${uniqueName}`, file, {
      access: "public",
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}
