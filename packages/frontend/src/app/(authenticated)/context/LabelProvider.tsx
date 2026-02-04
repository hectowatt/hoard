import React, { createContext, useContext, useState, useCallback } from "react";
import { useSnackbar } from "@/app/(authenticated)/context/SnackbarProvider";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/app/context/AuthProvider";
import { Istok_Web } from "next/font/google";

// ラベルをグローバルに保持するためのコンテキストプロバイダー
type Label = { id: string; labelname: string };

type LabelContextType = {
    labels: Label[];
    fetchLabels: () => Promise<void>;
};

const LabelContext = createContext<LabelContextType | undefined>(undefined);

export const useLabelContext = () => {
    const ctx = useContext(LabelContext);
    if (!ctx) throw new Error("useLabelContext must be used within a LabelProvider");
    return ctx;
};

export const LabelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [labels, setLabels] = useState<Label[]>([]);
    const { isInitializing } = useAuthContext();
    const { showSnackbar } = useSnackbar();
    const { t } = useTranslation();
    const router = useRouter();

    const fetchLabels = useCallback(async () => {
        try {
            const response = await fetch("/api/labels", {
                method: "GET",
                credentials: "include"
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.error("Error fetching labels");
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                }
                throw new Error("Failed to fetch notes")
            };
            const data = await response.json();
            setLabels(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching labels:", error);
            showSnackbar(t("message_error_occured"), "error");
        }
    }, []);

    React.useEffect(() => {
        if (!isInitializing) {
            fetchLabels();
        }
    }, [isInitializing]);

    return (
        <LabelContext.Provider value={{ labels, fetchLabels }}>
            {children}
        </LabelContext.Provider>
    );
};