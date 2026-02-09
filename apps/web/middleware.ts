import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Rotas públicas - não precisa autenticação
  const publicPaths = ["/", "/login"];
  const isPublicPath = publicPaths.includes(path);
  const isApiAuth = path.startsWith("/api/auth");
  const isApiTrpc = path.startsWith("/api/trpc");
  const isCatalogo = path.startsWith("/catalogo");
  const isStaticFile = path.startsWith("/_next") || path.includes(".");

  // Permitir rotas públicas, catálogo, API e arquivos estáticos
  if (isPublicPath || isApiAuth || isApiTrpc || isCatalogo || isStaticFile) {
    return NextResponse.next();
  }

  // Verificar cookie de sessão do Better Auth
  // Em produção (HTTPS), o cookie tem prefixo __Secure-
  const sessionCookie = request.cookies.get("__Secure-better-auth.session_token")
    || request.cookies.get("better-auth.session_token");

  // Sem sessão, redireciona para login
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
