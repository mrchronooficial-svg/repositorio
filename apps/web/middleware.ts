import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Rotas públicas - não precisa autenticação
  const publicPaths = ["/", "/login"];
  const isPublicPath = publicPaths.includes(path);
  const isApiAuth = path.startsWith("/api/auth");
  const isStaticFile = path.startsWith("/_next") || path.includes(".");

  // Permitir rotas públicas e arquivos estáticos
  if (isPublicPath || isApiAuth || isStaticFile) {
    return NextResponse.next();
  }

  // Verificar cookie de sessão do Better Auth
  const sessionCookie = request.cookies.get("better-auth.session_token");

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
