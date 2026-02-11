import React, { createContext, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useSnackbar } from "@/app/(authenticated)/context/SnackbarProvider";
import { useAuthContext } from "@/app/context/AuthProvider";

type note = {
    id: string;
    title: string;
    content: string;
    label_id: string;
    createdate: string;
    updatedate: string;
    is_locked: boolean;
    is_pinned: boolean;
};

const NoteContext = createContext<noteContextType | undefined>(undefined);

type noteContextType = {
    notes: note[];
    setNotes?: React.Dispatch<React.SetStateAction<note[]>>;
    fetchNotes: () => Promise<void>;
}

export const NoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notes, setNotes] = useState<{ id: string, title: string; content: string; label_id: string; createdate: string; updatedate: string; is_locked: boolean; is_pinned: boolean }[]>([]);
    const { isInitializing } = useAuthContext();
    const { t } = useTranslation();
    const { showSnackbar } = useSnackbar();
    const router = useRouter();

    // Noteを取得
    const fetchNotes = async () => {
        try {
            const response = await fetch("/api/notes", {
                method: "GET",
                credentials: "include"
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.error("Error fetching notes");
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                }
                throw new Error("Failed to fetch notes")
            };
            const data = await response.json();
            setNotes(data);
        } catch (error) {
            console.error("Error fetching notes:", error);
            showSnackbar(t("message_error_occured"), "error");
        }
    };

    useEffect(() => {
        if (!isInitializing) {
            fetchNotes();
        }
    }, [isInitializing]);

    return (
        <NoteContext.Provider value={{ notes, setNotes, fetchNotes }}>
            {children}
        </NoteContext.Provider >
    );
};

export function useNoteContext() {
    const ctx = useContext(NoteContext);
    if (!ctx) throw new Error("useNoteContext must be used within NoteProvider");
    return ctx;
}