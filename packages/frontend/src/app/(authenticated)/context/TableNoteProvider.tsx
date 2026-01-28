import React, { createContext, useContext, useState, useEffect } from "react";
import { useSnackbar } from "@/app/(authenticated)/context/SnackbarProvider";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/app/context/AuthProvider";

type tableNote = {
    id: string;
    title: string;
    label_id: string;
    createdate: string;
    updatedate: string;
    is_locked: boolean;
    is_pinned: boolean;
    columns: Column[];
    rowCells: RowCell[][];
};

type Column = {
    id: number;
    name: string;
    order?: number;
    table_note_id?: string;
}

type RowCell = {
    id: number;
    rowIndex: number;
    value: string;
    columnId?: number;
    table_note_id?: string;
}

const tableNoteContext = createContext<tableNoteContextType | undefined>(undefined);

type tableNoteContextType = {
    tableNotes: tableNote[];
    setTableNotes: React.Dispatch<React.SetStateAction<tableNote[]>>;
    fetchTableNotes: () => Promise<void>;
}

export const TableNoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const [tableNotes, setTableNotes] = useState<tableNote[]>([]);
    const { showSnackbar } = useSnackbar();
    const { isTokenReady, setIsTokenReady } = useAuthContext();

    const { t } = useTranslation();
    const router = useRouter();

    // TableNoteを取得
    const fetchTableNotes = async () => {
        try {
            const response = await fetch("/api/tablenotes", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include"
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.error("Error fetching table notes");
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                }
                throw new Error("Failed to fetch notes")
            };
            const data = await response.json();
            setTableNotes(data);
        } catch (error) {
            console.error("Error fetching table notes:", error);
            showSnackbar(t("message_error_occured"), "error");
        }
    };

    useEffect(() => {
        if (isTokenReady) {
            fetchTableNotes();
        }
    }, [isTokenReady]);

    return (
        <tableNoteContext.Provider value={{ tableNotes, setTableNotes, fetchTableNotes }}>
            {children}
        </tableNoteContext.Provider >
    );
};

export function useTableNoteContext() {
    const ctx = useContext(tableNoteContext);
    if (!ctx) throw new Error("useTableNoteContext must be used within NoteProvider");
    return ctx;
}