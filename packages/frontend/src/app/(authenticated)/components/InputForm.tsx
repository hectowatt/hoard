"use client";

import React, { useState } from "react";
import {
    Box,
    TextField,
    Paper,
    Button,
    Collapse,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Dialog,
    TableContainer,
    TableBody,
    Table,
    TableCell,
    TableRow,
    TableHead,
} from '@mui/material';
import { useTheme } from '@mui/material/styles'; // Import useTheme
import { useLabelContext } from "@/app/(authenticated)/context/LabelProvider";
import NoEncryptionGmailerrorredOutlinedIcon from '@mui/icons-material/NoEncryptionGmailerrorredOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "@/app/(authenticated)/context/SnackbarProvider";
import { useRouter } from "next/navigation";
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

interface InputFormProps {
    onInsert: (newId: string, newTitle: string, newContent: string, newLabel: string, isLocked: boolean, isPinned: boolean) => void;
    onInsertTableNote: (newId: string, newTitle: string, newLabel: string, isLocked: boolean, isPinned: boolean, newColumns: Column[], newRowCells: RowCell[][]) => void;
}

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

// トップページ上部の入力フォームコンポーネント
export default function InputForm({ onInsert, onInsertTableNote }: InputFormProps) {

    const [expand, setExpand] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [editLabelId, setEditLabelId] = React.useState<string | null>(null);
    const [isLocked, setIsLocked] = React.useState(false);
    const [isPinned, setIsPinned] = React.useState(false);
    const [tableNoteOpen, setTableNoteOpen] = useState(false);
    const { t } = useTranslation();
    const { showSnackbar } = useSnackbar();
    const router = useRouter();

    const { labels } = useLabelContext();

    // テーブルノート用
    const [editColumns, setEditColumns] = useState<Column[]>([
        { id: 1, name: "", order: 0 }
    ]);
    const [editRowCells, setEditRowCells] = useState<RowCell[][]>([[{
        id: 1,
        rowIndex: 0,
        value: "",
        columnId: 1
    }]]);

    const blurTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);


    const handleExpand = () => {
        if (!expand) {
            setExpand(true);
        }
    };
    const handleCollapse = () => {
        setExpand(false);
        setTitle("");
        setContent("");
    }

    const theme = useTheme();
     const [isSmallScreen, setIsSmallScreen] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < theme.breakpoints.values.sm);
    };

    // 初回判定
    handleResize();

    // リサイズイベントリスナーを追加
    window.addEventListener("resize", handleResize);

    // クリーンアップ
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [theme]);
    // ロックボタン押下処理
    const handleLock = async () => {
        if (!isLocked) {
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
                        setIsLocked(true);
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
            setIsLocked(false);
        }
    };


    // 保存ボタン押下処理
    const saveButtonClick = async () => {
        if (!title && !content) {
            showSnackbar(t("message_must_set_title_or_content"), "warning");
            return;
        }

        try {

            const response = await fetch("/api/notes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: title,
                    content: content,
                    label: editLabelId,
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

            setTitle("");
            setContent("");
            setIsLocked(false);
            setIsPinned(false);
            setExpand(false);

            const insertedNoteId = result.note.id;

            // ノート登録時のコールバック関数を呼び出す
            if (typeof onInsert === "function") {
                onInsert(insertedNoteId, title, content, editLabelId || "", isLocked, isPinned);
            }
        } catch (error) {
            showSnackbar(t("message_error_occured"));
        }

        setIsEditing(false);
    }

    // フォーカスが外れた場合
    const handleBlur = () => {
        blurTimeoutRef.current = setTimeout(() => {
            setIsFocused(false);
        }, 200);
    };

    // フォーカス時処理
    const handleFocus = () => {
        setIsFocused(true);
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
        }
    }

    // フォーカスが外れた場合、入力フォームを閉じる
    React.useEffect(() => {
        if (!isFocused) {
            setExpand(false);
        }
    }, [isFocused]);

    // テーブルノート保存処理
    const handleSaveTableNote = async () => {
        try {
            const response = await fetch("/api/tablenotes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: title,
                    columns: editColumns,
                    rowCells: editRowCells,
                    label: editLabelId,
                    is_locked: isLocked,
                    is_pinned: isPinned
                }),
                credentials: "include"
            })

            if (!response.ok) {
                if (response.status === 401) {
                    console.error("Error saving table note");
                    showSnackbar(t("message_error_occured_redirect_login"), "warning");
                    router.push("/login");
                }
                throw new Error("Failed to save table note");
            }

            const result = await response.json();
            console.log("Table note saved successfully!", result);
            console.log("result.tableNote.id:", result.tableNote.id);
            // テーブルノート登録時のコールバック関数を呼び出す
            if (typeof onInsertTableNote === "function") {
                onInsertTableNote(result.tableNote.id, result.tableNote.title, editLabelId || "", isLocked, isPinned, result.tableNote.columns, result.tableNote.rowCells);
            }
            setTableNoteOpen(false);

            setEditColumns([{ id: 1, name: "", order: 0 }]);

            setEditRowCells([[{ id: 1, rowIndex: 0, value: "", columnId: 1 }]]);
            setTitle("");
            setIsLocked(false);
            setIsPinned(false);
            setExpand(false);
        } catch (error) {
            showSnackbar(t("message_error_occured"), "error");
        }
    }

    // カラム追加
    // 既存のeditColumnsに新しいカラムを追加する
    // さらに、既存のRowCellの各行に対して末尾に新規セルを追加する
    const handleAddColumn = () => {
        const addColumnId = Date.now();
        if (editColumns.length >= 5) return;
        const newOrder = editColumns.length;
        setEditColumns([...editColumns, { id: addColumnId, name: "", order: newOrder }]);
        setEditRowCells(editRowCells.map((editRowCell, rowIdx) => [...editRowCell, { id: Date.now(), rowIndex: rowIdx, value: "", columnId: addColumnId }]));
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

    // セル編集
    const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
        const updatedRows: RowCell[][] = editRowCells.map((row, index) =>
            index === rowIdx ? row.map((cell, c) => (c === colIdx ? { ...cell, value } : cell)) : row
        );
        setEditRowCells(updatedRows);
    };

    // 行追加
    // 既存のeditRowCellsに新しい行を追加する
    // 新しい行は、列の数分の新規セルを生成して追加する
    const handleAddRow = () => {
        setEditRowCells([
            ...editRowCells,
            editColumns.map((col, idx) => ({
                id: Date.now() + idx,
                rowIndex: editRowCells.length,
                value: "",
                columnId: col.id,
            }))
        ]);
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

    const handlePinned = () => {
        setIsPinned(!isPinned);
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 2 }}
            onBlur={handleBlur}
            onFocus={handleFocus}
            tabIndex={-1}>
            {/* 入力フォーム */}
            < Paper
                elevation={3}
                sx={{
                    p: 2,
                    cursor: "text",
                    mb: 4,
                    width: "100%",
                    maxWidth: {
                        xs: "95%",
                        sm: "90%",
                        md: 800,
                    },
                    mx: "auto",    // 中央寄せ
                    overflow: "hidden",
                }}
                onClick={handleExpand}
            >
                <Collapse in={expand}>
                    <TextField
                        placeholder={t("placeholder_title")}
                        fullWidth
                        variant="standard"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onFocus={handleExpand}
                        sx={{ mb: 1 }}
                        inputProps={{ 'data-testid': 'input_title' }}
                    />
                </Collapse>
                <TextField
                    placeholder={t("placeholder_input_note")}
                    fullWidth
                    multiline
                    minRows={expand ? 3 : 1}
                    variant="standard"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onFocus={handleExpand}
                    inputProps={{ 'data-testid': 'input_content' }}
                />
                <Collapse in={expand}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                        mt: 1
                    }}>
                        <Button onClick={saveButtonClick} variant="contained" sx={{ fontSize: isSmallScreen ? '0.7rem' : '0.875rem' }} data-testid="button_save">{t("button_save")}</Button>
                        <Button onClick={handleCollapse} variant="contained" sx={{ fontSize: isSmallScreen ? '0.7rem' : '0.875rem' }} data-testid="button_cancel">{t("button_cancel")}</Button>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel id="select-label">{t("dropdown_labels")}</InputLabel>
                            <Select
                                labelId="select-label"
                                value={editLabelId ?? ""}
                                onChange={e => setEditLabelId(e.target.value === "" ? null : e.target.value)}
                                label={t("label_labels")}
                                renderValue={(selected: string) => {
                                    if (!selected) return <em></em>;
                                    const found = labels?.find(l => l.id === selected);
                                    return found ? found.labelname : "";
                                }}
                                data-testid="select_label"
                            >
                                <MenuItem value="">
                                    <em>{t("dropdown_no_labels")}</em>
                                </MenuItem>
                                {(labels ?? []).map(option => (
                                    <MenuItem key={option.id} value={option.id}>{option.labelname}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <IconButton
                            onClick={() => handleLock()}>
                            {isLocked ? <LockOutlinedIcon data-testid="lock" /> : <NoEncryptionGmailerrorredOutlinedIcon data-testid="unlock" />}
                        </IconButton>
                        <IconButton
                            onClick={handlePinned}
                            sx={{ ml: 1, color: isPinned ? "text.primary" : "action.disabled" }}
                            data-testid="button_pin">
                            <PushPinOutlinedIcon />
                        </IconButton>
                        <IconButton
                            onClick={() => setTableNoteOpen(true)}
                            sx={{ ml: 1 }}>
                            <TableChartOutlinedIcon data-testid="tablenote" />
                        </IconButton>
                    </Box>
                </Collapse>
            </Paper >
            <Dialog open={tableNoteOpen} onClose={() => setTableNoteOpen(false)} maxWidth="md" fullWidth>
                <TableContainer component={Paper}>
                    <TextField
                        label={t("label_title")}
                        variant="standard"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        margin="normal" />
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
                            {editRowCells.map((row, rowIdx) => (
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
                    <Button onClick={handleAddRow} sx={{ m: 2 }}><AddIcon /></Button>
                </TableContainer>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Button onClick={handleSaveTableNote} variant="contained" sx={{ mr: 2, mb: 1, fontSize: isSmallScreen ? '0.7rem' : '0.875rem' }}>
                        {t("button_save")}
                    </Button>
                    <Button onClick={() => setTableNoteOpen(false)} variant="contained" sx={{ mb: 1, fontSize: isSmallScreen ? '0.7rem' : '0.875rem' }}>
                        {t("button_cancel")}
                    </Button>
                    <FormControl size="small" sx={{ minWidth: 120, ml: 2 }}>
                        <InputLabel id="select-label">{t("dropdown_labels")}</InputLabel>
                        <Select
                            labelId="select-label"
                            value={editLabelId ?? ""}
                            onChange={e => setEditLabelId(e.target.value === "" ? null : e.target.value)}
                            label={t("label_labels")}
                            renderValue={(selected: string) => {
                                if (!selected) return <em></em>;
                                const found = labels?.find(l => l.id === selected);
                                return found ? found.labelname : "";
                            }}
                        >
                            <MenuItem value="">
                                <em>{t("dropdown_no_labels")}</em>
                            </MenuItem>
                            {(labels ?? []).map(option => (
                                <MenuItem key={option.id} value={option.id}>{option.labelname}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <IconButton
                        onClick={() => handleLock()}
                        sx={{ ml: 1 }}>
                        {isLocked ? <LockOutlinedIcon /> : <NoEncryptionGmailerrorredOutlinedIcon />}
                    </IconButton>
                    <IconButton
                        onClick={handlePinned}
                        sx={{ ml: 1, color: isPinned ? "text.primary" : "action.disabled" }}
                        data-testid="button_pin">
                        <PushPinOutlinedIcon />
                    </IconButton>
                </Box>
            </Dialog >
        </Box >
    );
};