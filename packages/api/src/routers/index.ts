import { protectedProcedure, publicProcedure, router } from "../index";
import { fornecedorRouter } from "./fornecedor";
import { pecaRouter } from "./peca";
import { clienteRouter } from "./cliente";
import { vendaRouter } from "./venda";
import { alertaRouter } from "./alerta";
import { dashboardRouter } from "./dashboard";
import { configuracaoRouter } from "./configuracao";
import { adminRouter } from "./admin";
import { auditoriaRouter } from "./auditoria";
import { logisticaRouter } from "./logistica";
import { nfeRouter } from "./nfe";
import { utensilioRouter } from "./utensilio";
import { financeiroRouter } from "./financeiro";
import { catalogoRouter } from "./catalogo";
import { catalogoAdminRouter } from "./catalogo-admin";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  fornecedor: fornecedorRouter,
  peca: pecaRouter,
  cliente: clienteRouter,
  venda: vendaRouter,
  alerta: alertaRouter,
  dashboard: dashboardRouter,
  configuracao: configuracaoRouter,
  admin: adminRouter,
  auditoria: auditoriaRouter,
  logistica: logisticaRouter,
  nfe: nfeRouter,
  utensilio: utensilioRouter,
  financeiro: financeiroRouter,
  catalogo: catalogoRouter,
  catalogoAdmin: catalogoAdminRouter,
});
export type AppRouter = typeof appRouter;
