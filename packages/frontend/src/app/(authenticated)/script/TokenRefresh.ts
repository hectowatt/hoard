"use client";

import { NextResponse } from "next/server";

const REFRESH_INTERVAL = process.env.TOKEN_REFRESH_INTERVAL ? Number(process.env.TOKEN_REFRESH_INTERVAL) : 13 * 60 * 1000; // 余裕をもたせて13分で更新する

let refreshInterval: NodeJS.Timeout | null = null;

// トークン自動更新処理
export function startTokenRefreshInterval() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/token/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Token refresh failed:', response.statusText);
                stopTokenRefreshInterval();
                if (typeof window !== "undefined") {
                    window.location.href = "/login";
                }
            } else {
                console.log('Token refreshed successfully');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            stopTokenRefreshInterval();
            window.location.href = "/login";
        }
    }, REFRESH_INTERVAL);
}

// トークン自動更新停止処理
export function stopTokenRefreshInterval() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        console.log('Token refresh interval stoped');
    }
}

// 即時アクセストークン取得
export async function getAccessToken(): Promise<void> {
    try {
        console.log("Token refresh triggered immediately");
        const response = await fetch('/api/token/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Token refresh failed:', response.statusText);
            stopTokenRefreshInterval();
            if (typeof window !== "undefined") {
                window.location.href = "/login";
            }
        } else {
            console.log('Token refreshed successfully');
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        stopTokenRefreshInterval();
        window.location.href = "/login";
    }
}