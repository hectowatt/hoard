import React, { useEffect } from "react";
import { Box, Paper, Typography, Dialog, DialogTitle, DialogContent, TextField, Button, FormControl, Select, MenuItem, InputLabel } from "@mui/material";
import { useLabelContext } from "@/app/(authenticated)/context/LabelProvider";
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useSnackbar } from "@/app/(authenticated)/context/SnackbarProvider";

interface trashTableNoteProps {
    id: string;
    title: string;
    label_id: string;
    is_locked: boolean;
    createdate: string;
    updatedate: string;
    onRestore?: (id: string, newTitle: string, newLabel: string, newUpdateDate: string) => void;
    onDelete?: (id: string) => void;
}

// 日付をフォーマットする
const formatDate = (exString: string) => {
    const date = new Date(exString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}/${month}/${day}`;
}

// 削除ページに並ぶトラッシュテーブルノートコンポーネント
export default function TrashTableNote({ id, title, label_id, is_locked, createdate, updatedate, onRestore, onDelete }: trashTableNoteProps) {

    const [open, setOpen] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState(title);
    const [isEditing, setIsEditing] = React.useState(false);
    const [updateDateAfterSaving, setUpdateDateAfterSaving] = React.useState(updatedate);
    const [editLabel, setEditLabel] = React.useState(label_id ?? "");
    const { t } = useTranslation();
    const { showSnackbar } = useSnackbar();
    const router = useRouter();

    const { labels } = useLabelContext();

    const handleOpen = () => {
        setEditTitle(title);
        setOpen(true);
        setIsEditing(false);
    };

    // フォーカスが外れた時の処理
    const handleClose = () => setOpen(false);

    // キャンセルボタン押下時
    const handleCancel = () => {
        setIsEditing(false);
        setOpen(false);
    };

    // 削除ボタン押下処理
    const handleDelete = async () => {
        try {
            const response = await fetch(`/api/tablenotes/trash/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include"
            });
            if (!response.ok) {
                if (response.status === 401) {
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                } else {
                    throw new Error("Failed to delete tableNote");
                }
            }
            const result = await response.json();
            console.log("Delete success!", result);

            if (typeof onDelete === "function") {
                onDelete(id);
            }

        } catch (error) {
            console.error("Error deleting note", error);
            return;
        }
    }


    // 復元ボタン押下処理
    const handleSave = async () => {
        try {
            const response = await fetch(`/api/tablenotes/trash/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include"
            })

            if (!response.ok) {
                if (response.status === 401) {
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                } else {
                    throw new Error("Failed to save note");
                }
            }

            const result = await response.json();
            console.log("Restore success!", result);

            if (typeof onRestore === "function") {
                onRestore(id, editTitle, editLabel, result.tablenote.updatedate);
            }
        } catch (error) {
            console.error("Error saving note", error);
            return;
        }
        setIsEditing(false);
        setEditTitle(editTitle);
        setUpdateDateAfterSaving(new Date().toISOString());
        setOpen(false);
    };

    // ラベル名を取得する関数
    const getLabelName = (id: string) => {
        if (!labels) return "";
        const found = labels.find(l => l.id === id);
        return found ? found.labelname : "";
    };

    return (
        <>
            <Paper elevation={3} sx={{ p: 2, maxWidth: 400, wordWrap: "break-word", cursor: "pointer" }} onClick={handleOpen}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    {title && title.trim() !== "" ? title : t("label_no_title")}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1, whiteSpace: "pre-line" }}>
                    {is_locked ? t("label_lockednote") : <TableChartOutlinedIcon />}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
                    {t("label_createdate")}: {formatDate(createdate)}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
                    {t("label_updatedate")}: {formatDate(updatedate)}
                </Typography>
                {label_id && label_id.trim() !== "" && getLabelName(label_id) && (
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, border: "1px solid #ccc", p: 0.5, borderRadius: 1 }}>
                        {getLabelName(label_id)}
                    </Typography>
                )}
            </Paper>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle component="div" sx={{ mb: 1, pl: 2, pr: 2, ml: 1 }}>
                    <Typography variant="h6" sx={{ textAlign: "left" }}>
                        {title}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 1, whiteSpace: "pre-line" }}>
                        {is_locked ? t("label_lockednote") : <TableChartOutlinedIcon />}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
                        {t("label_createdate")}: {formatDate(createdate)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
                        {t("label_createdate")}: {formatDate(updatedate)}
                    </Typography>
                    {label_id && label_id.trim() !== "" && getLabelName(label_id) && (
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 1, border: "1px solid #ccc", p: 0.5, borderRadius: 1 }}>
                            {getLabelName(label_id)}
                        </Typography>
                    )}
                    <Box sx={{ mt: 2, textAlighn: "right" }}>
                        <>
                            <Button onClick={handleSave} variant="contained" sx={{ mr: 1, mb: 1 }} data-testid="button_restore">{t("button_restore")}</Button>
                            <Button onClick={handleDelete} variant="contained" sx={{ mr: 1, mb: 1 }} data-testid="button_permanently_delete">{t("button_permanently_delete")}</Button>
                            <Button onClick={handleCancel} variant="contained" sx={{ mb: 1 }} data-testid="button_cancel">{t("button_cancel")}</Button>
                        </>
                    </Box>
                </DialogContent>
            </Dialog >
        </>
    );
}