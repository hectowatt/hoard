"use client";

import React, { Children, createContext, useContext } from "react";

type AuthType = {
    isTokenReady: boolean;
    setIsTokenReady: React.Dispatch<React.SetStateAction<boolean>>;
};

const AuthContext = createContext<AuthType | undefined>(undefined);

export function useAuthContext() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("AuthContext must be used within AuthProvider");
    return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isTokenReady, setIsTokenReady] = React.useState<boolean>(false);

    return (
        <AuthContext.Provider value={{ isTokenReady, setIsTokenReady }}>
            {children}
        </AuthContext.Provider>
    );
}