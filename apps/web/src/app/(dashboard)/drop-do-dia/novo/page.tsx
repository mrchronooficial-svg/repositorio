"use client";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DropForm } from "@/components/drop/DropForm";

export default function NovoDropPage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Drop do Dia", href: "/drop-do-dia" },
          { label: "Novo Drop" },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-6">Novo Drop</h1>
      <DropForm />
    </div>
  );
}
