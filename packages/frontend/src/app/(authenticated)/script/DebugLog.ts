"use client";

// デバッグ用ログ関数
export function debugLog(message: string, ...optionalParams: any[]){
    if (process.env.NODE_ENV === "development"){
        console.log(`[DEBUG] ${message}`, ...optionalParams);
    }
}