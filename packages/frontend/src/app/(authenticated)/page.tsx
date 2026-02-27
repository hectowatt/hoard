"use client";

import InputForm from "./components/InputForm";
import Note from "@/app/(authenticated)/components/Note";
import React, { use, useEffect, useState } from "react";
import { Box, Container, Fab, Grid, styled, Typography } from "@mui/material";
import { useLabelContext } from "@/app/(authenticated)/context/LabelProvider";
import { useNoteContext } from "@/app/(authenticated)/context/NoteProvider";
import { useTableNoteContext } from "@/app/(authenticated)/context/TableNoteProvider";
import TableNote from "@/app/(authenticated)/components/TableNote";
import { useSearchWordContext } from "@/app/(authenticated)/context/SearchWordProvider";
import { useSearchLabelContext } from "./context/SearchLabelProvider";
import { redirect } from "next/navigation";
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { useTranslation } from "react-i18next";
import { useAuthContext, verifyAndRefreshTokens } from "../context/AuthProvider";
import { useScreenSizeContext } from "./context/ScreenSizeProvider";
import AddIcon from '@mui/icons-material/Add';
import InputFormSmallScreen from "./components/InputFormSmallScreen";

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

export default function Home() {
  const { notes, setNotes, fetchNotes } = useNoteContext();
  const { labels, fetchLabels } = useLabelContext();
  const { tableNotes, setTableNotes, fetchTableNotes } = useTableNoteContext();
  const { searchWord } = useSearchWordContext();
  const { searchLabel } = useSearchLabelContext();
  const { isInitializing } = useAuthContext();
  const { isSmallScreen, setIsSmallScreen } = useScreenSizeContext();
  const [isInputFormSmallScreenOpen, setIsInputFormSmallScreenOpen] = React.useState(false);
  const { t } = useTranslation();

  // label_idに紐づくlabelnameを取得する
  const getLabelNameById = (label_id: string) => {
    const label = labels.find(label => label.id === label_id);
    return label ? label.labelname : "";
  };

  const trimmedSearchWord = searchWord ? searchWord.trim().toLowerCase() : "";
  const filterdNotes = (searchWord ?
    // 検索ワードとラベル絞り込み両方が適用されている場合
    searchLabel ? notes.filter(note => (note.title.toLowerCase().includes(trimmedSearchWord) || note.content.toLowerCase().includes(trimmedSearchWord)) && getLabelNameById(note.label_id).includes(searchLabel))
      // 検索ワードが適用されている場合
      : notes.filter(note => note.title.toLowerCase().includes(trimmedSearchWord) || note.content.toLowerCase().includes(trimmedSearchWord))
    : searchLabel ?
      // ラベル絞り込みだけされている場合
      notes.filter(note => getLabelNameById(note.label_id).includes(searchLabel))
      // 何も絞り込みがされていない場合
      : notes);
  const filterdTableNotes = (searchWord ?
    // 検索ワードとラベル絞り込み両方が適用されている場合
    searchLabel ? tableNotes.filter(tableNote => (tableNote.title.toLowerCase().includes(trimmedSearchWord) || tableNote.columns.some(column => column.name.toLowerCase().includes(trimmedSearchWord)) || tableNote.rowCells.some(row => row.some(cell => cell.value.toLowerCase().includes(trimmedSearchWord)))) && getLabelNameById(tableNote.label_id).includes(searchLabel))
      // 検索ワードが適用されている場合  
      : tableNotes.filter(tableNote => tableNote.title.toLowerCase().includes(trimmedSearchWord) || tableNote.columns.some(column => column.name.toLowerCase().includes(trimmedSearchWord)) || tableNote.rowCells.some(row => row.some(cell => cell.value.toLowerCase().includes(trimmedSearchWord))))
    : searchLabel ?
      tableNotes.filter(tableNote => getLabelNameById(tableNote.label_id).includes(searchLabel))
      // 何も絞り込みがされていない場合
      : tableNotes);

  const pinnedNotes = filterdNotes.filter(note => note.is_pinned);
  const unpinnedNotes = filterdNotes.filter(note => !note.is_pinned);
  const pinnedTableNotes = filterdTableNotes.filter(tableNote => tableNote.is_pinned);
  const unpinnedTableNotes = filterdTableNotes.filter(tableNote => !tableNote.is_pinned);


  useEffect(() => {
    const initializePage = async () => {
      // AuthProviderの初期化が完了するまで待機
      if (isInitializing) {
        return;
      }

      // トークン状態を再確認（念のため）
      const isTokenValid = await verifyAndRefreshTokens();
      if (!isTokenValid) {
        window.location.href = "/login";
        return;
      }
      // ノートとテーブルノートを取得
      fetchNotes();
      fetchTableNotes();
    };

    initializePage();
  }, [isInitializing]);


  // ノート初期登録時のコールバック関数
  const handleInsert = (newId: string, newTitle: string, newContent: string, LabelId: string, is_locked: boolean, is_pinned: boolean) => {
    if (setNotes !== undefined) {
      setNotes(prevNote => {
        const newNotes = [
          ...prevNote,
          {
            id: newId,
            title: newTitle,
            content: newContent,
            label_id: LabelId,
            createdate: new Date().toISOString(),
            updatedate: new Date().toISOString(),
            is_locked: is_locked,
            is_pinned: is_pinned
          },
        ];
        return newNotes.sort((a, b) => new Date(b.updatedate).getTime() - new Date(a.updatedate).getTime());
      });
    } else {
      console.error("setNotes is undefined");
    };
  }

  // テーブルノート初期登録時のコールバック関数
  const handleInsertTableNote = (newId: string, newTitle: string, newLabel: string, is_locked: boolean, is_pinned: boolean, newColumn: Column[], newRowCells: RowCell[][]) => {
    if (setTableNotes !== undefined) {
      setTableNotes(prevTableNotes => {
        const newTableNotes = [
          ...prevTableNotes,
          {
            id: newId,
            title: newTitle,
            label_id: newLabel,
            createdate: new Date().toISOString(),
            updatedate: new Date().toISOString(),
            is_locked: is_locked,
            is_pinned: is_pinned,
            columns: newColumn,
            rowCells: newRowCells
          },
        ];
        return newTableNotes.sort((a, b) => new Date(b.updatedate).getTime() - new Date(a.updatedate).getTime()
        );
      });
    } else {
      console.error("setNotes is undefined");
    };
  }

  // ノート保存ボタン押下時のコールバック関数
  const handleSave = (id: string, newTitle: string, newContent: string, newLabel: string, newUpdateDate: string) => {
    if (setNotes !== undefined) {
      setNotes(prevNote => {
        const updatedNotes = prevNote.map(
          note => note.id === id ? {
            ...note, title: newTitle, content: newContent, label_id: newLabel, updatedate: newUpdateDate
          }
            : note
        );
        // updatedateの降順でソート
        return updatedNotes.sort((a, b) =>
          new Date(b.updatedate).getTime() - new Date(a.updatedate).getTime()
        );
      });
    } else {
      console.error("error in handleSave: setNotes is undefined");
    }
  }


  // ノート削除ボタン押下時のコールバック関数
  const handleDelete = (id: string) => {
    if (setNotes !== undefined) {
      setNotes(prevNote => {
        const filteredNotes = prevNote.filter(note => note.id !== id);
        // 削除後もupdatedateの降順でソート
        return filteredNotes.sort((a, b) =>
          new Date(b.updatedate).getTime() - new Date(a.updatedate).getTime()
        );
      });
    } else {
      console.error("setNotes is undefined");
    }
  };


  // テーブルノート保存ボタン押下時のコールバック関数
  const handleSaveTableNote = (id: string, newTitle: string, newLabel: string, is_Locked: boolean, newUpdateDate: string, newColumn: Column[], newRowCells: RowCell[][]) => {
    if (setTableNotes !== undefined) {
      setTableNotes(prevTableNote => {
        const newTableNotes = prevTableNote.map(
          tableNote => tableNote.id === id ? {
            ...tableNote, title: newTitle, label_id: newLabel, is_Locked: is_Locked, updatedate: newUpdateDate, columns: newColumn, rowCells: newRowCells
          }
            : tableNote);
        return newTableNotes.sort((a, b) => new Date(b.updatedate).getTime() - new Date(a.updatedate).getTime())
      }
      );
    } else {
      console.error("error in handleSave: setNotes is undefined");
    };
  }

  // テーブルノート削除ボタン押下時のコールバック関数
  const handleDeleteTableNote = (id: string) => {
    if (setTableNotes !== undefined) {
      setTableNotes(prevTableNote => {
        const filteredTableNotes = prevTableNote.filter(tableNote => tableNote.id !== id);
        // 削除後もupdatedateの降順でソート
        return filteredTableNotes.sort((a, b) =>
          new Date(b.updatedate).getTime() - new Date(a.updatedate).getTime()
        );
      });
    } else {
      console.error("setTableNotes is undefined");
    }
  };

  // ノートピン留め時のコールバック関数
  const handlePinNote = (id: string) => {
    fetchNotes();
  };

  // テーブルノートピン留め時のコールバック関数
  const handlePinTableNote = (id: string) => {
    fetchTableNotes();
  }

  const StyledFab = styled(Fab)({
    position: 'fixed',
    zIndex: 100,
    bottom: 80,  // 下からの距離
    right: 20,   // 右からの距離
  });


  return (
    <>
      <Container sx={{ position: "relative" }}>
        {(searchWord || searchLabel) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FilterAltOutlinedIcon />
            <Typography variant="body2">
              {t("label_filtered")}
            </Typography>
          </Box>
        )}
        {/* クライアントがスマホサイズのときはInputFormを画面上部に表示しない */}
        {isSmallScreen ? null :
          <InputForm onInsert={handleInsert} onInsertTableNote={handleInsertTableNote} />
        }
        {/* ノートとテーブルノートをピン留めされたものを先頭に一覧表示 */}
        <Grid container spacing={2}>

          {pinnedNotes.map((note, index) => (
            <Grid key={note.id}>
              <Note {...note} onSave={handleSave} onDelete={handleDelete} onPin={handlePinNote} data-testid="note" />
            </Grid>
          ))}
          {pinnedTableNotes.map((tableNote, index) => (
            <Grid key={tableNote.id}>
              <TableNote {...tableNote} onSave={handleSaveTableNote} onDelete={handleDeleteTableNote} onPin={handlePinTableNote} data-testid="tablenote" />
            </Grid>
          ))}
          {unpinnedNotes.map((note, index) => (
            <Grid key={note.id}>
              <Note {...note} onSave={handleSave} onDelete={handleDelete} onPin={handlePinNote} data-testid="note" />
            </Grid>
          ))}
          {unpinnedTableNotes.map((tableNote, index) => (
            <Grid key={tableNote.id}>
              <TableNote {...tableNote} onSave={handleSaveTableNote} onDelete={handleDeleteTableNote} onPin={handlePinTableNote} data-testid="tablenote" />
            </Grid>
          ))}

        </Grid>
      </Container>
      {/* クライアントがスマホサイズのときは右下にノート新規作成ボタンを表示する */}
      {isSmallScreen && (
        <StyledFab color="primary" aria-label="add" onClick={() => setIsInputFormSmallScreenOpen(true)} data-testid="open_input_form_button">
          <AddIcon />
        </StyledFab>
      )}
      <InputFormSmallScreen open={isInputFormSmallScreenOpen} onClose={() => setIsInputFormSmallScreenOpen(false)} onInsert={handleInsert} onInsertTableNote={handleInsertTableNote} />
    </>
  );
}