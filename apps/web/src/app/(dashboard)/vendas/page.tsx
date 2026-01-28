import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export default function VendasPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Vendas" }]} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <p className="text-muted-foreground">
          Registro e acompanhamento de vendas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem de Vendas</CardTitle>
          <CardDescription>
            Todas as vendas registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Módulo em desenvolvimento. Em breve você poderá registrar e gerenciar vendas aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
