"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FotoUploadProps {
  fotos: string[];
  onChange: (fotos: string[]) => void;
  maxFotos?: number;
}

export function FotoUpload({ fotos, onChange, maxFotos = 10 }: FotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Erro ao fazer upload");
        return null;
      }

      const data = await response.json();
      return data.url;
    } catch {
      toast.error("Erro ao fazer upload");
      return null;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (fotos.length + acceptedFiles.length > maxFotos) {
        toast.error(`Maximo de ${maxFotos} fotos permitidas`);
        return;
      }

      setUploading(true);

      const urls: string[] = [];
      for (const file of acceptedFiles) {
        const url = await uploadFile(file);
        if (url) {
          urls.push(url);
        }
      }

      if (urls.length > 0) {
        onChange([...fotos, ...urls]);
        toast.success(`${urls.length} foto(s) enviada(s)`);
      }

      setUploading(false);
    },
    [fotos, onChange, maxFotos]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: uploading || fotos.length >= maxFotos,
  });

  const removeFoto = (index: number) => {
    const newFotos = [...fotos];
    newFotos.splice(index, 1);
    onChange(newFotos);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFotos = [...fotos];
    const draggedItem = newFotos[draggedIndex];
    newFotos.splice(draggedIndex, 1);
    newFotos.splice(index, 0, draggedItem);
    onChange(newFotos);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          (uploading || fotos.length >= maxFotos) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Enviando...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? "Solte as imagens aqui..."
                : "Arraste imagens ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WebP (max 5MB) - {fotos.length}/{maxFotos}
            </p>
          </div>
        )}
      </div>

      {/* Preview das fotos */}
      {fotos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {fotos.map((url, index) => (
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative group rounded-lg overflow-hidden border",
                draggedIndex === index && "opacity-50"
              )}
            >
              <img
                src={url}
                alt={`Foto ${index + 1}`}
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:text-white hover:bg-white/20 cursor-grab"
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:text-white hover:bg-red-500"
                  onClick={() => removeFoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {index === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
