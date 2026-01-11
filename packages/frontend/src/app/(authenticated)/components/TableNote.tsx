"use client"

import React, { useEffect, useState } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, IconButton, TextField,
    Typography,
    Dialog,
    Box,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { useLabelContext } from "@/app/(authenticated)/context/LabelProvider";
import NoEncryptionGmailerrorredOutlinedIcon from '@mui/icons-material/NoEncryptionGmailerrorredOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from "react-i18next";
import { useSnackbar } from "../context/SnackbarProvider";
import { useRouter } from "next/navigation";
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import PushPinIcon from '@mui/icons-material/PushPin';

interface Column {
    id: number;
    name: string;
    order?: number;
    table_note_id?: string;
}

interface RowCell {
    id: number;
    rowIndex: number;
    value: string;
    columnId?: number;
    table_note_id?: string;
}

interface tableNoteProps {
    id: string;
    title: string;
    label_id: string;
    is_locked: boolean;
    is_pinned: boolean;
    createdate: string;
    updatedate: string;
    columns: Column[];
    rowCells: RowCell[][];
    onSave: (id: string, newTitle: string, newLabel: string, is_locked: boolean, newUpdateDate: string, newColumn: Column[], newRowCells: RowCell[][]) => void;
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

export default function TableNote({ id, title, label_id, is_locked, is_pinned, createdate, updatedate, columns, rowCells, onSave, onDelete, onPin }: tableNoteProps) {
    const [open, setOpen] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState(title);
    const [isEditing, setIsEditing] = React.useState(false);
    const [editLabel, setEditLabel] = React.useState<string | null>(null);
    const { labels } = useLabelContext();
    const [isLocked, setIsLocked] = React.useState(false);
    const [inputPassword, setInputPassword] = React.useState("");
    const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false);
    const [passwordId, setPasswordId] = React.useState<string | null>(null);
    const [editColumns, setEditColumns] = useState<Column[]>(columns);
    const [editRowCells, setEditRowCells] = useState<RowCell[][]>(rowCells);
    const [isPinned, setIsPinned] = React.useState(false);
    const { t } = useTranslation();
    const { showSnackbar } = useSnackbar();
    const router = useRouter();


    // 初期状態でのタイトル設定
    useEffect(() => {
        setEditTitle(title);
        setEditLabel(label_id || null);
        setIsPinned(is_pinned);
    }, [title, label_id, is_pinned]);

    // propsを変更用のstateに格納
    useEffect(() => {
        setEditColumns(columns);
    }, [columns]);

    useEffect(() => {
        setEditRowCells(rowCells);
    }, [rowCells]);


    // カラム追加
    // 既存のeditColumnsに新しいカラムを追加する
    // さらに、既存のRowCellの各行に対して末尾に新規セルを追加する
    const handleAddColumn = () => {
        const addColumnId = Date.now();
        if (editColumns.length >= 5) return;
        const newOrder = editColumns.length;
        setEditColumns([...editColumns, { id: addColumnId, name: "", order: newOrder }]);
        setEditRowCells(editRowCells.map(rowCell => [...rowCell, { id: Date.now(), rowIndex: rowCell.length, value: "", columnId: addColumnId }]));
    };

    // カラム削除
    const handleDeleteColumn = (colIdx: number) => {
        if (editColumns.length <= 1) return;
        // カラムを削除
        const newColumns = editColumns.filter((_, idx) => idx !== colIdx);

        // 残りのカラムのorderを0から振り直す
        const columnsWithReorderedOrder = newColumns.map((col, idx) => ({
            ...col,
            order: idx
        }));
        setEditColumns(columnsWithReorderedOrder);
        setEditRowCells(editRowCells.map(row => row.filter((_, idx) => idx !== colIdx)));
    };

    // 行編集
    const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
        const updatedRows: RowCell[][] = editRowCells.map((row, index) =>
            index === rowIdx ? row.map((cell, c) => (c === colIdx ? { ...cell, value } : cell)) : row
        );
        setEditRowCells(updatedRows);
    };

    // 行削除
    const handleDeleteRow = (rowIdx: number) => {
        if (editRowCells.length <= 1) return;
        const newRowCells = editRowCells.filter((_, idx) => idx !== rowIdx);
        // 残りの行のrowIndexを0から振り直す
        const newRowCellsWithReorderdIndex = newRowCells.map((row, idx) =>
            row.map(cell => ({
                ...cell,
                rowIndex: idx  // 各セルのrowIndexを更新
            }))
        );
        setEditRowCells(newRowCellsWithReorderdIndex);
    };

    // 行追加
    // 既存のeditRowCellsに新しい行を追加する
    // 新しい行は、列の数分の新規セルを生成して追加する
    const handleAddRow = () => setEditRowCells([...editRowCells,
    editColumns.map((col, idx) => (
        {
            id: Date.now() + idx,
            rowIndex: editRowCells.length,
            value: "",
            columnId: col.id,
            table_note_id: col.table_note_id
        }
    ))]);


    // ラベル名を取得する関数
    const getLabelName = (id: string) => {
        if (!labels) return "";
        const found = labels.find(l => l.id === id);
        return found ? found.labelname : "";
    };

    // 画面描画時にノートロック状態を設定
    useEffect(() => {
        setIsLocked(is_locked);
    }, [is_locked]);

    // 画面描画時にノートピン状態を設定
    useEffect(() => {
        setIsPinned(is_pinned);
    }, [is_locked]);

    useEffect(() => {
        // バックエンドから受け取ったカラムを order でソート
        const sortedColumns = [...columns].sort((a, b) =>
            (a.order ?? 0) - (b.order ?? 0)
        );
        setEditColumns(sortedColumns);
    }, [columns]);

    const handleOpen = () => {
        setEditTitle(title);
        setOpen(true);
        setIsEditing(false);
    };

    // フォーカスが外れた時の処理
    const handleClose = () => {
        setIsEditing(false);
        setOpen(false)
    };

    // 編集時
    const handleEdit = () => setIsEditing(true);

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
                    console.log("パスワード取得成功", resultSelect);
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
                        const responseLock = await fetch("/api/tablenotes/lock", {
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
                                console.error("Failed to lock note");
                                showSnackbar(t("message_error_occured_redirect_login"), "warning");
                                router.push("/login");
                            }
                            throw new Error("Failed to lock note");
                        }
                        setIsLocked(true);

                        // ロックしたら内容は非表示にする
                        setEditColumns([]);
                        setEditRowCells([]);
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
                    const responseUnlock = await fetch("/api/tablenotes/lock", {
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
                            showSnackbar(t("message_error_occured_redirect_login"), "warning");
                            router.push("/login");
                        } else {
                            showSnackbar(t("message_error_occured"), "error");
                            throw new Error("Failed to unlock note");
                        }
                    } else {
                        // ロック解除成功したらノートを再取得する
                        const responseGet = await fetch(`/api/tablenotes/${id}`, {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            credentials: "include"
                        });

                        if (!responseGet.ok) {
                            if (responseGet.status === 401) {
                                console.error("Error get tablenote");
                                showSnackbar(t("message_error_occured_redirect_login"), "warning");
                                router.push("/login");
                            } else {
                                showSnackbar(t("message_error_occured"), "error");
                                throw new Error("Failed to get tablenote");
                            }
                        } else {
                            const resultGet = await responseGet.json();
                            setEditColumns(resultGet.columns || []);
                            setEditRowCells(Array.isArray(resultGet.rowCells) ? resultGet.rowCells : []);
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
                showSnackbar(t("message_incorrect_password"), "warning");
            }
        } else {
            showSnackbar(t("message_error_occured"), "error");
            return;
        }
    }

    // テーブルノート保存処理
    const handleSaveTableNote = async () => {
        try {
            const response = await fetch("/api/tablenotes", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: id,
                    title: editTitle,
                    columns: editColumns,
                    rowCells: editRowCells,
                    label_id: editLabel,
                    is_locked: isLocked,
                    is_pinned: isPinned,
                }),
                credentials: "include"
            })

            if (!response.ok) {
                if (response.status === 401) {
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                } else {
                    throw new Error("Failed to save table note");
                }
            }

            const result = await response.json();
            console.log("Table note saved successfully!", result);
            // テーブルノート登録時のコールバック関数を呼び出す
            if (typeof onSave === "function") {
                onSave(result.tableNote.id, result.tableNote.title, editLabel || "", isLocked, result.tableNote.updatedate, editColumns, editRowCells);
            }
            setOpen(false);
            setEditColumns(result.tableNote.columns || []);
            setEditRowCells(Array.isArray(result.tableNote.rowCells) ? result.tableNote.rowCells : editRowCells);
        } catch (error) {
            showSnackbar(t("message_error_occured"), "error");
            return;
        }
    }

    // 削除ボタン押下処理
    const handleDelete = async () => {
        try {
            const response = await fetch(`/api/tablenotes/${id}`, {
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
                    throw new Error("Failed to delete note");
                }
            }
            const result = await response.json();
            console.log("Delete success!", result);

            if (typeof onDelete === "function") {
                onDelete(id);
            }

            setIsEditing(false);
            setOpen(false);

        } catch (error) {
            showSnackbar(t("message_error_occured"), "error");
            return;
        }
    };

    // ピン留めボタン押下処理
    const handlePin = async () => {
        try {
            const response = await fetch("/api/tablenotes/pin", {
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
                    console.error("Error pin tablenote");
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                }
                throw new Error("Failed to pin tablenote");
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
            <Paper elevation={3} sx={{ p: 2, maxWidth: 300, maxHeight: 200, wordWrap: "break-word", cursor: "pointer", border: "2px solid", borderColor: isPinned ? "primary.main" : "transparent" }} onClick={handleOpen}>
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
                >{isLocked ? t("label_lockednote") : <TableChartOutlinedIcon />}
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
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>{isEditing && !isLocked ? (
                    <TextField
                        fullWidth
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        variant="standard" />
                ) : (
                    editTitle
                )}</DialogTitle>
                <DialogContent>
                    {isEditing && !isLocked ? (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        {editColumns.map((col, idx) => (
                                            <TableCell key={col.id} sx={{ minWidth: 20, padding: '4px 6px' }} size="small">
                                                <TextField
                                                    value={col.name}
                                                    variant="standard"
                                                    onChange={e => {
                                                        const newColumns = [...editColumns];
                                                        newColumns[idx] = { ...newColumns[idx], name: e.target.value };
                                                        setEditColumns(newColumns);
                                                    }}
                                                    placeholder={`${t("placeholder_column")}${idx + 1}`}
                                                    inputProps={{
                                                        size: Math.max(col.name.length, `${t("placeholder_column")}${idx + 1}`.length, 8)
                                                    }}
                                                    data-testid="column-input"
                                                />
                                                <IconButton size="small" onClick={() => handleDeleteColumn(idx)} disabled={editColumns.length <= 1}>
                                                    <DeleteIcon fontSize="small" data-testid="deletecolumnicon" />
                                                </IconButton>
                                            </TableCell>
                                        ))}
                                        <TableCell>
                                            <IconButton onClick={handleAddColumn} disabled={editColumns.length >= 5}>
                                                <AddIcon data-testid="addColumnIcon" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {editRowCells.map((row: RowCell[], rowIdx) => (
                                        <TableRow key={rowIdx}>
                                            {row.map((cell, colIdx) => (
                                                <TableCell key={colIdx} sx={{ minWidth: 20, padding: '4px 6px' }} size="small">
                                                    <TextField
                                                        value={cell.value}
                                                        onChange={e => handleCellChange(rowIdx, colIdx, e.target.value)}
                                                        variant="standard"
                                                        inputProps={{
                                                            size: Math.max(cell.value.length, 8)
                                                        }}
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteRow(rowIdx)}
                                                    disabled={editRowCells.length <= 1}
                                                    data-testid="deleterowicon"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Button onClick={handleAddRow} sx={{ m: 2 }}><AddIcon data-testid="addRowIcon" /></Button>
                        </TableContainer>
                    ) : isLocked ? (
                        <Typography variant="body1" sx={{ whiteSpace: "pre-line", mb: 2 }}>
                            {t("label_lockednote")}
                        </Typography>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        {editColumns.map((col, idx) => (
                                            <TableCell key={col.id} sx={{ minWidth: 20, padding: '4px 6px' }} size="small">
                                                <TextField
                                                    value={col.name}
                                                    variant="standard"
                                                    placeholder={`${t("placeholder_column")}${idx + 1}`}
                                                    inputProps={{
                                                        size: Math.max(col.name.length, `${t("placeholder_column")}${idx + 1}`.length, 8),
                                                        readOnly: true
                                                    }}
                                                    data-testid="column-input-not-editable"
                                                />
                                            </TableCell>
                                        ))}
                                        <TableCell>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {editRowCells.map((row: RowCell[], rowIdx) => (
                                        <TableRow key={rowIdx}>
                                            {row.map((cell, colIdx) => (
                                                <TableCell key={colIdx} sx={{ minWidth: 20, padding: '4px 6px' }} size="small">
                                                    <TextField
                                                        value={cell.value}
                                                        variant="standard"
                                                        inputProps={{
                                                            size: Math.max(cell.value.length, 8),
                                                            readOnly: true
                                                        }}
                                                        data-testid="row-input-not-editable"
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )
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
                        {isEditing && !isLocked ? (
                            // 編集中でパスワードロックされていない場合
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
                                <Button onClick={handleSaveTableNote} variant="contained" sx={{ mr: 1, mt: 2 }}>{t("button_save")}</Button>
                                <Button onClick={() => setIsEditing(false)} variant="contained" sx={{ mt: 2 }}>{t("button_cancel")}</Button>

                            </>
                        ) : !isLocked ? (
                            // 編集中でなく、パスワードロックされていない場合
                            <>
                                <Button onClick={handleEdit} variant="contained" data-testid="button_edit">{t("button_edit")}</Button>
                                <Button onClick={handleDelete} variant="contained" sx={{ ml: 1 }} data-testid="button_delete">{t("button_delete")}</Button>
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
            </Dialog >

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