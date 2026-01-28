import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export default function ClientesPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Clientes" }]} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">
          Base de clientes da Mr. Chrono
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem de Clientes</CardTitle>
          <CardDescription>
            Todos os clientes cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Módulo em desenvolvimento. Em breve você poderá cadastrar e gerenciar clientes aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
