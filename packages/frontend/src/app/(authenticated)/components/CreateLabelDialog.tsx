"use client"

import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, List, ListItem, ListItemText, IconButton, DialogContentText } from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete";
import { useLabelContext } from "@/app/(authenticated)/context/LabelProvider";
import { useNoteContext } from "@/app/(authenticated)/context/NoteProvider";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "@/app/(authenticated)/context/SnackbarProvider";
import { useRouter } from "next/navigation";
import { debugLog } from "../script/DebugLog";


interface LabelDialogProps {
    open: boolean;
    onClose: () => void;
    notes?: { id: string, title: string, content: string, label_id: string, createdate: string, updatedate: string }[];
}

// ナビゲーションバー左のラベル編集用ダイアログコンポーネント
export default function CreateLabelDialog({ open, onClose }: LabelDialogProps) {
    const [input, setInput] = useState("");
    const { labels, fetchLabels } = useLabelContext();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [targetLabelId, setTargetLabelId] = useState<string | null>(null);
    const { notes } = useNoteContext();
    const { t } = useTranslation();
    const { showSnackbar } = useSnackbar();
    const router = useRouter();

    const isLabelUsed = (labelId: string) => !!notes && notes.some(note => note.label_id === labelId);

    // 保存ボタン押下処理
    const handleAdd = async () => {
        if (!input.trim()) {
            showSnackbar(t("message_label_must_not_be_empty"), "warning");
            return
        }
        try {

            const response = await fetch("/api/labels", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    labelName: input,
                }),
                credentials: "include"
            })

            if (!response.ok) {
                if (response.status === 400) {
                    const errorData = await response.json();
                    if (errorData.error === "Label name must be unique") {
                        showSnackbar(t("message_label_must_be_unique"), "warning");
                    } else if (errorData.error === "Label name is too long") {
                        showSnackbar(t("message_labelname_is_too_long"), "warning");
                    }
                    return;
                } else if (response.status === 401) {
                    console.error("Error saving label");
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                } else {
                    throw new Error("Failed to save label");
                }
            }


            const result = await response.json();
            debugLog("Save success!", result);

            setInput(""); // 入力フィールドをクリア
            await fetchLabels(); // ラベルを再取得して更新

        } catch (error) {
            console.error("Error saving label:", error);
        }
    }

    // 「はい」選択時
    const handleConfirmDelete = async () => {
        if (targetLabelId) {
            await onDeleteLabel(targetLabelId);
            setTargetLabelId(null);
            setConfirmOpen(false);
        }
    };

    // 「いいえ」選択時
    const handleCancel = () => {
        setTargetLabelId(null);
        setConfirmOpen(false);
    };

    // ラベル削除処理
    const onDeleteLabel = async (labelId: string) => {
        try {
            const response = await fetch('/api/labels/' + labelId, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include"
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.error("Error deleting label");
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                }
                throw new Error("Failed to delete label");
            }
            const result = await response.json();
            debugLog("Delete success!", result);
            // ラベル削除後、状態を更新

            // ラベルの状態を更新
            fetchLabels();
        } catch (error) {

        }
    }

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle data-testid="label_input_labels">{t("label_input_labels")}</DialogTitle>
                <DialogContent>
                    <TextField
                        label={t("placeholder_input_label")}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                        fullWidth
                        margin="dense"
                        inputProps={{ 'data-testid': 'label-input' }}
                    />
                    <List>
                        {labels && labels.map(label => (
                            <ListItem
                                key={label.id}
                                secondaryAction={
                                    <IconButton edge="end" onClick={() => {
                                        if (isLabelUsed(label.id)) {
                                            setTargetLabelId(label.id);
                                            setConfirmOpen(true);
                                        } else {
                                            debugLog("islabelused", isLabelUsed(label.id));
                                            onDeleteLabel(label.id);
                                        }
                                    }}>
                                        <DeleteIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemText primary={label.labelname} />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent >
                <DialogActions>
                    <Button onClick={handleAdd} variant="contained">{t("button_add")}</Button>
                    <Button onClick={onClose} variant="contained" data-testid="button_close">{t("button_close")}</Button>
                </DialogActions>
            </Dialog >
            {/* 確認ダイアログ */}
            < Dialog open={confirmOpen} onClose={handleCancel} >
                <DialogTitle>{t("label_delete_label_confirm")}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t("label_delete_label_confirm_desc")}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">{t("button_yes")}</Button>
                    <Button onClick={handleCancel}>{t("button_no")}</Button>
                </DialogActions>
            </Dialog >
        </>
    );
}