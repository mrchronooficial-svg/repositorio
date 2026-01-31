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
});
export type AppRouter = typeof appRouter;
