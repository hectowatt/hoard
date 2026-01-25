"use client"

import React, { useEffect } from "react";
import { Box, Paper, Typography, Dialog, DialogTitle, DialogContent, TextField, Button, FormControl, Select, MenuItem, InputLabel, IconButton, Icon } from "@mui/material";
import { useLabelContext } from "@/app/(authenticated)/context/LabelProvider";
import NoEncryptionGmailerrorredOutlinedIcon from '@mui/icons-material/NoEncryptionGmailerrorredOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from "react-i18next";
import { useSnackbar } from "@/app/(authenticated)/context/SnackbarProvider";
import { useRouter } from "next/navigation";
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import PushPinIcon from '@mui/icons-material/PushPin';

interface NoteProps {
    id: string;
    title: string;
    content: string;
    label_id: string;
    createdate: string;
    updatedate: string;
    is_locked: boolean;
    is_pinned: boolean;
    onSave: (id: string, newTitle: string, newContent: string, newLabel: string, newUpdateDate: string) => void;
    onDelete: (id: string) => void;
    onPin: (id: string) => void;
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

// ページに並ぶノートコンポーネント
export default function Note({
    id,
    title,
    content,
    label_id,
    createdate,
    updatedate,
    is_locked,
    is_pinned,
    onSave,
    onDelete,
    onPin
}: NoteProps) {

    const [open, setOpen] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState(title);
    const [editContent, setEditContent] = React.useState(content);
    const [updateDateAfterSaving, setUpdateDateAfterSaving] = React.useState(updatedate);
    const [editLabel, setEditLabel] = React.useState<string | null>(null);
    const { labels } = useLabelContext();
    const [isLocked, setIsLocked] = React.useState(false);
    const [inputPassword, setInputPassword] = React.useState("");
    const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false);
    const [passwordId, setPasswordId] = React.useState<string | null>(null);
    const [isPinned, setIsPinned] = React.useState(false);
    const { t } = useTranslation();
    const { showSnackbar } = useSnackbar();
    const router = useRouter();

    // 画面描画時にノートロック状態とラベルを設定
    useEffect(() => {
        setIsLocked(is_locked);
        setIsPinned(is_pinned);
        setEditTitle(title);
        setEditLabel(label_id || null);
    }, [title, label_id, is_pinned]);


    const handleOpen = () => {
        setEditTitle(title);
        setEditContent(content);
        setOpen(true);
    };

    // フォーカスが外れた時の処理
    const handleClose = () => {
        setOpen(false)
    };


    // 削除ボタン押下処理
    const handleDelete = async () => {
        try {
            const response = await fetch(`/api/notes/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include"
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.error("Error deleting note");
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                }
                throw new Error("Failed to delete note");
            }
            const result = await response.json();
            console.log("Delete success!", result);

            if (typeof onDelete === "function") {
                onDelete(id);
            }

            setOpen(false);

        } catch (error) {
            console.error("Error deleting note", error);
            return;
        }
    };


    // 保存ボタン押下処理
    const handleSave = async () => {

        try {
            const response = await fetch("/api/notes", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: id,
                    title: editTitle,
                    content: editContent,
                    label: editLabel,
                    isLocked: isLocked,
                    isPinned: isPinned
                }),
                credentials: "include"
            })

            if (!response.ok) {
                if (response.status === 401) {
                    console.error("Error saving note");
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                }
                throw new Error("Failed to save note");
            }

            const result = await response.json();
            console.log("Save success!", result);

            if (typeof onSave === "function") {
                onSave(id, editTitle, editContent, editLabel ?? "", result.note.updatedate);
            }
        } catch (error) {
            console.error("Error saving note", error);
            return;
        }
        setEditTitle(editTitle);
        setEditContent(editContent);
        setUpdateDateAfterSaving(new Date().toISOString());
        setOpen(false);
    };

    // ラベル名を取得する関数
    const getLabelName = (id: string) => {
        if (!labels) return "";
        const found = labels.find(l => l.id === id);
        return found ? found.labelname : "";
    };


    // ロックボタン押下処理
    const handleLock = async () => {
        if (isLocked) {
            // ロック解除時の処理

            // パスワードが存在するかチェック
            try {
                const responseSelect = await fetch("/api/password", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include"
                });

                if (responseSelect.ok) {
                    const resultSelect = await responseSelect.json();
                    if (resultSelect.password_id !== null && resultSelect.password_id !== "" && resultSelect.password_id !== undefined) {
                        // すでにパスワードが登録されている場合はパスワード入力を求める
                        setPasswordId(resultSelect.password_id);
                        // パスワード入力ダイアログを開く
                        setPasswordDialogOpen(true);
                    } else {
                        // パスワードが未登録の場合はロック解除できない
                        showSnackbar(t("message_cannot_lock_note_without_notepassword"), "warning");
                    }

                } else {
                    console.error("failed to fetch notepassword");
                }
            } catch (error) {
                console.error("Error fetching password", error);
                return;
            }
        } else {
            // ロック時の処理
            try {
                const responseSelect = await fetch("/api/password", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include"
                });

                if (responseSelect.ok) {
                    const resultSelect = await responseSelect.json();
                    if (resultSelect.password_id !== null && resultSelect.password_id !== "" && resultSelect.password_id !== undefined) {
                        // ロック時の処理
                        const responseLock = await fetch("/api/notes/lock", {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                id: id,
                                isLocked: true, // ロック状態にする
                            }),
                            credentials: "include"
                        });
                        if (!responseLock.ok) {
                            if (responseLock.status === 401) {
                                console.error("Error locking note");
                                showSnackbar(t("message_error_occured_redirect_login"), "warning");
                                router.push("/login");
                            }
                            console.error("Failed to lock note");
                            throw new Error("Failed to lock note");
                        }
                        setIsLocked(true);
                        setEditContent(""); // ロックしたら内容は非表示にする
                    } else {
                        // パスワードが未登録の場合はロックできない
                        showSnackbar(t("message_cannot_lock_note_without_notepassword"), "warning");
                    }
                } else {
                    // パスワード取得に失敗した場合の処理
                    showSnackbar(t("message_cannot_get_notepassword"), "error");
                }
            } catch (error) {
                console.error("Error locking note", error);
                return;
            }
        }
    };

    // ロック解除処理
    const hundlePasswordSubmit = async () => {
        if (!inputPassword || inputPassword.trim() === "") {
            showSnackbar(t("message_notepassword_must_be_set_to_unlock"), "warning");
            return;
        }

        // 入力されたパスワードをもとに比較APIを呼び出す
        const responseCompare = await fetch("/api/password/compare", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                password_id: passwordId,
                passwordString: inputPassword
            }),
            credentials: "include"
        });

        if (responseCompare.ok) {
            const result = await responseCompare.json();
            const isMatch = result.isMatch;
            if (isMatch) {
                try {
                    // パスワードが一致した場合、ロックを解除するAPIを呼び出す
                    const responseUnlock = await fetch("/api/notes/lock", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            id: id,
                            isLocked: false, // ロック解除
                        }),
                        credentials: "include"
                    });
                    if (!responseUnlock.ok) {
                        if (responseUnlock.status === 401) {
                            console.error("Error unlocking note");
                            showSnackbar(t("message_error_occured_redirect_login"), "warning");
                            router.push("/login");
                        } else {
                            showSnackbar(t("message_error_occured"), "error");
                            throw new Error("Failed to unlock note");
                        }
                    } else {
                        // ロック解除成功したらノートを再取得する
                        const responseGet = await fetch(`/api/notes/${id}`, {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            credentials: "include"
                        });

                        if (!responseGet.ok) {
                            if (responseGet.status === 401) {
                                console.error("Error get note");
                                showSnackbar(t("message_error_occured_redirect_login"), "warning");
                                router.push("/login");
                            } else {
                                showSnackbar(t("message_error_occured"), "error");
                                throw new Error("Failed to get note");
                            }
                        } else {
                            const resultGet = await responseGet.json();
                            setEditContent(resultGet.content);
                        }
                    }
                    setIsLocked(false);
                    setPasswordDialogOpen(false);
                    setInputPassword(""); // 入力フィールドをクリア
                } catch (error) {
                    showSnackbar(t("message_error_occured"), "error");
                    return;
                }
            } else {
                showSnackbar(t("message_incorrect_current_password"), "warning");
            }
        } else {
            showSnackbar(t("message_error_occured"), "error");
            return;
        }
    }

    // ピン留めボタン押下処理
    const handlePin = async () => {
        try {
            const response = await fetch("/api/notes/pin", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: id,
                    isPinned: !isPinned,
                }),
                credentials: "include"
            });
            if (!response.ok) {
                if (response.status === 401) {
                    console.error("Error pin note");
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                }
                throw new Error("Failed to pin note");
            }
            setIsPinned(!isPinned);
            if (typeof onPin === "function") {
                onPin(id);
            }
        } catch (error) {
            showSnackbar(t("message_error_occured"), "error");
        }
    };

    return (
        <>
            <Paper elevation={3} variant="elevation" sx={{ p: 2, maxWidth: 300, maxHeight: 250, wordWrap: "break-word", cursor: "pointer", border: "2px solid", borderColor: isPinned ? "primary.main" : "transparent" }} onClick={handleOpen}>
                <Typography variant="h6" sx={title && title.trim() !== "" ? { mb: 1 } : { mb: 1, fontStyle: "italic", color: "#b0b0b0", fontWeight: "normal" }}>
                    {title && title.trim() !== "" ? title : t("label_no_title")}
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        mb: 1,
                        whiteSpace: "pre-line",
                        maxHeight: 90,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                    }}
                >{isLocked ? t("label_lockednote") : content}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
                    {t("label_createdate")}: {formatDate(createdate)}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
                    {t("label_updatedate")}: {formatDate(updatedate)}
                </Typography>
                {label_id && label_id.trim() !== "" && getLabelName(label_id) && (
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, mt: 1, border: "1px solid #ccc", p: 0.5, borderRadius: 1, display: "inline-block" }}>
                        {getLabelName(label_id)}
                    </Typography>
                )}
            </Paper>
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>{!isLocked ? (
                    <TextField
                        fullWidth
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        variant="standard" />
                ) : (
                    title
                )}</DialogTitle>
                <DialogContent>
                    {!isLocked ? (
                        <TextField
                            fullWidth
                            multiline
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            variant="standard"
                            sx={{ mb: 2 }} />)
                        : (
                            <Typography variant="body1" sx={{ whiteSpace: "pre-line", mb: 2 }}>
                                {isLocked ? t("label_lockednote") : content}
                            </Typography>)
                    }
                    <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
                        {t("label_createdate")}: {formatDate(createdate)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
                        {t("label_updatedate")}: {formatDate(updatedate)}
                    </Typography>
                    {label_id && label_id.trim() !== "" && getLabelName(label_id) && (
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 1, mt: 1, border: "1px solid #ccc", p: 0.5, borderRadius: 1, display: "inline-block" }}>
                            {getLabelName(label_id)}
                        </Typography>
                    )}
                    <Box sx={{ mt: 2, textAlignn: "right" }}>
                        {!isLocked ? (
                            // パスワードロックされていない場合
                            <>
                                <FormControl size="small" sx={{ minWidth: 120 }} data-testid="label-select">
                                    <InputLabel id="select-label">{t("dropdown_labels")}</InputLabel>
                                    <Select
                                        labelId="select-label"
                                        value={editLabel ?? ""}
                                        onChange={e => setEditLabel(e.target.value === "" ? null : e.target.value)}
                                        label={t("dropdown_labels")}
                                        renderValue={(selected: string) => {
                                            if (!selected) return <em>{t("dropdown_no_labels")}</em>;
                                            const found = labels?.find(l => l.id === selected);
                                            return found ? found.labelname : "";
                                        }}
                                    >
                                        <MenuItem value="">
                                            <em>{t("dropdown_no_labels")}</em>
                                        </MenuItem>
                                        {labels && labels.map(option => (
                                            <MenuItem key={option.id} value={option.id}>{option.labelname}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <br />
                                <Button onClick={handleSave} variant="contained" sx={{ mr: 1, mt: 2 }} data-testid="button_save">{t("button_save")}</Button>
                                <Button onClick={() => setOpen(false)} variant="contained" sx={{ mr: 1, mt: 2 }} data-testid="button_cancel">{t("button_cancel")}</Button>
                                <Button onClick={handleDelete} variant="contained" sx={{
                                    mr: 1, mt: 2, backgroundColor: "error.main",
                                    "&:hover": {
                                        backgroundColor: "#ff4000"
                                    },
                                }} data-testid="button_delete">{t("button_delete")}</Button>
                                <IconButton
                                    onClick={handleLock}
                                    sx={{ mr: 1, mt: 2, color: isLocked ? "primary.main" : "action.disabled" }}>
                                    {isLocked ? <LockOutlinedIcon data-testid="lock" /> : <NoEncryptionGmailerrorredOutlinedIcon data-testid="unlock" />}
                                </IconButton>
                                {isPinned ? (
                                    <IconButton
                                        onClick={handlePin}
                                        sx={{ mr: 1, mt: 2, color: isPinned ? "text.primary" : "action.disabled" }}
                                        data-testid="icon_pinned">
                                        <PushPinIcon />
                                    </IconButton>) : (
                                    <IconButton
                                        onClick={handlePin}
                                        sx={{ mr: 1, mt: 2, color: isPinned ? "text.primary" : "action.disabled" }}
                                        data-testid="icon_pin">
                                        <PushPinOutlinedIcon />
                                    </IconButton>
                                )}

                            </>
                        ) : (
                            // パスワードロックされている場合
                            <>
                                <Button onClick={handleDelete} variant="contained" sx={{ ml: 1 }}>{t("button_delete")}</Button>
                                <IconButton
                                    onClick={handleLock}
                                    sx={{ ml: 1, color: isLocked ? "primary.main" : "action.disabled" }}>
                                    {isLocked ? <LockOutlinedIcon data-testid="lock" /> : <NoEncryptionGmailerrorredOutlinedIcon data-testid="unlock" />}
                                </IconButton>
                                {isPinned ? (
                                    <IconButton
                                        onClick={handlePin}
                                        sx={{ ml: 1, color: isPinned ? "text.primary" : "action.disabled" }}
                                        data-testid="icon_pinned">
                                        <PushPinIcon />
                                    </IconButton>) : (
                                    <IconButton
                                        onClick={handlePin}
                                        sx={{ ml: 1, color: isPinned ? "text.primary" : "action.disabled" }}
                                        data-testid="icon_pin">
                                        <PushPinOutlinedIcon />
                                    </IconButton>
                                )}
                            </>
                        )}
                    </Box>
                </DialogContent>
            </Dialog>
            <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
                <DialogTitle>{t("label_input_password")}</DialogTitle>
                <DialogContent>
                    <TextField
                        type="password"
                        label={t("label_password")}
                        autoComplete="new-password"
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        fullWidth
                        variant="standard"
                    />
                    <Button
                        onClick={hundlePasswordSubmit}
                        variant="contained"
                        sx={{ mt: 2 }}
                    >
                        {t("button_unlock")}
                    </Button>
                    <Button onClick={() => setPasswordDialogOpen(false)} variant="contained" sx={{ mt: 2, ml: 1 }}>
                        {t("button_cancel")}
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}