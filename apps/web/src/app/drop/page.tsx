import { Suspense } from "react";
import { CatalogoContent } from "@/components/catalogo/CatalogoContent";

export default function DropPage() {
  return (
    <Suspense>
      <CatalogoContent initialTab={1} />
    </Suspense>
  );
}
