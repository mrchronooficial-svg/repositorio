import { createContext } from "@gestaomrchrono/api/context";
import { appRouter } from "@gestaomrchrono/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";

function handler(req: NextRequest) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error }) => {
      console.error(`[tRPC Error] ${path}:`, error.message, error.cause ?? "");
    },
  });
}
export { handler as GET, handler as POST };
