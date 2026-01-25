import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    const accessToken = req.cookies.get("accessToken")?.value;
    if (!accessToken) {
        // /login への遷移の場合はスキップ
        if (req.nextUrl.pathname === "/login") {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const secret = new TextEncoder().encode(process.env.SECRET!);
        if (!secret) {
            console.error("SECRET is not set in environment variables");
            return NextResponse.redirect(new URL("/login", req.url));
        }

        return NextResponse.next();
    } catch (err) {
        console.error("Token verification failed:", err);
        return NextResponse.redirect(new URL("/login", req.url));
    }
}

export const config = {
    matcher: ["/",
        "/trash/:path*",
        "/settings/:path*",]
};
