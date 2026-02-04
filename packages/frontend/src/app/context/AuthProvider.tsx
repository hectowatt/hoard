"use client";

import React, { Children, createContext, useContext, useEffect } from "react";

type AuthType = {
    isInitializing: boolean;
};

const AuthContext = createContext<AuthType | undefined>(undefined);

export function useAuthContext() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("AuthContext must be used within AuthProvider");
    return ctx;
}

// トークン有効性を確認し、必要に応じてリフレッシュ
export async function verifyAndRefreshTokens(): Promise<boolean> {
    try {
        // まずトークン状態を確認
        const verifyResponse = await fetch('/api/token/verify', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!verifyResponse.ok) {
            console.error('Token verification failed');
            return false;
        }

        const tokenStatus = await verifyResponse.json();
        console.log('Token status:', tokenStatus);

        // アクセストークンが有効な場合はそのまま戻す
        if (tokenStatus.accessTokenValid) {
            return true;
        }

        // アクセストークンが無効だがリフレッシュトークンが有効な場合はリフレッシュ
        if (tokenStatus.refreshTokenValid && !tokenStatus.accessTokenValid) {
            const refreshResponse = await fetch('/api/token/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (refreshResponse.ok) {
                console.log('Token refreshed successfully');
                return true;
            } else {
                console.error('Token refresh failed');
                return false;
            }
        }

        // トークンが存在しない、または無効な場合
        return false;
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isInitializing, setIsInitializing] = React.useState<boolean>(true);

    useEffect(() => {
        // クライアント側でマウント時にトークン状態を確認
        const initializeAuth = async () => {
            setIsInitializing(true);
            const isValid = await verifyAndRefreshTokens();
            setIsInitializing(false);

            // リダイレクトはここでは行わない
            // 各ページが isInitializing を監視して対応する
        };

        initializeAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ isInitializing }}>
            {children}
        </AuthContext.Provider>
    );
}