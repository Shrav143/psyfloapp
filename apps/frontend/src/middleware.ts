import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Skip server action requests to prevent "Invalid Server Actions request" error
  if (request.headers.get("Next-Action")) {
    return NextResponse.next();
  }

  // The prior-authorization demo is public mock data; it never needs a session.
  if (request.nextUrl.pathname.startsWith("/demo")) {
    return NextResponse.next();
  }

  console.log("Middleware running for", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env["SUPABASE_URL"] as string,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const result = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Helper: create a redirect that preserves refreshed auth cookies
  const redirectWithCookies = (targetPath: string) => {
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value);
    });
    return redirect;
  };

  if (!result.data.user) {
    // Allow student dashboard without auth (demo mode)
    if (pathname.startsWith("/dashboard/student")) {
      return supabaseResponse;
    }
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/admin")
    ) {
      return redirectWithCookies("/login");
    }
  }

  if (result.data.user) {
    if (
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/sign-up") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/forgot-password")
    ) {
      return redirectWithCookies("/dashboard");
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
