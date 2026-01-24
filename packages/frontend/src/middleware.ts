import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { startTokenRefreshInterval } from "./app/(authenticated)/script/TokenRefresh";

const REFRESH_SECRET = process.env.REFRESH_SECRET || 'hoard_refresh_secret';
const ACCESS_TOKEN_EXPIRY_MS = Number(process.env.ACCESS_TOKEN_EXPIRY) * 1000 || 15 * 60 * 1000; // 15分
const REFRESH_TOKEN_EXPIRY_MS = Number(process.env.REFRESH_TOKEN_EXPIRY) * 1000; // 7日
const ACCESS_TOKEN_EXPIRY_SEC = Number(process.env.ACCESS_TOKEN_EXPIRY) || 15 * 60;
const REFRESH_TOKEN_EXPIRY_SEC = Number(process.env.REFRESH_TOKEN_EXPIRY) || 7 * 24 * 60 * 60;

export async function middleware(req: NextRequest) {
    const accessToken = req.cookies.get("accessToken")?.value;
    const refreshToken = req.cookies.get("refreshToken")?.value;
    if (!accessToken) {
        if (!refreshToken) {
            // リフレッシュトークンもない場合はログインへリダイレクト
            // /login への遷移の場合はスキップ
            if (req.nextUrl.pathname === "/login") {
                return NextResponse.next();
            }
            return NextResponse.redirect(new URL("/login", req.url));
        } else {
            // リフレッシュトークンがある場合はアクセストークンを再発行する
            startTokenRefreshInterval();
        }
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
