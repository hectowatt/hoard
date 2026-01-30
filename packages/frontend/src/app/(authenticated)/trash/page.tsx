"use client";

import React, { useEffect, useState } from "react";
import { Button, Container, Grid } from "@mui/material";
import { useLabelContext } from "@/app/(authenticated)/context/LabelProvider";
import TrashNote from "@/app/(authenticated)/components/TrashNote";
import TrashTableNote from "@/app/(authenticated)/components/TrashTableNote";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useSnackbar } from "@/app/(authenticated)/context/SnackbarProvider";
import { useAuthContext } from "@/app/context/AuthProvider";
import { getAccessToken } from "../script/TokenRefresh";


// 削除されたNoteを表示するページコンテンツ
export default function Home() {
  const [trashNotes, setTrashNotes] = useState<{ id: string, title: string; content: string; label_id: string, is_locked: boolean, createdate: string; updatedate: string }[]>([]);
  const [trashTableNotes, setTrashTableNotes] = useState<{ id: string, title: string; label_id: string, is_locked: boolean, createdate: string; updatedate: string }[]>([]);
  const { labels, fetchLabels } = useLabelContext();
  const { isTokenReady, setIsTokenReady } = useAuthContext();
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();

  // 画面描画時にDBからノートを全件取得して表示する
  const fetchTrashNotes = async () => {
    try {
      // バックエンドAPIからノート情報を取得
      const response = await fetch("/api/notes/trash", {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include"
      });

      if (!response.ok) {
        if (response.status === 401) {
          showSnackbar(t("message_error_occured_redirect_login"), "warning");
          router.push("/login");
        } else {
          console.error("Get notes failed");
          return;
        }
      }

      const data = await response.json();
      console.log("selected trash data:", JSON.stringify(data, null, 2));
      setTrashNotes(data);
    } catch (error) {
      console.error("Error fetching trash notes", error);
    }
  };

  useEffect(() => {
    if (isTokenReady) {
      fetchTrashNotes();
    }
  }, [isTokenReady]);

  React.useEffect(() => {
    // リフレッシュトークンが有効でアクセストークンが無効な場合、即時でアクセストークンを更新する
    if (!isTokenReady) {
      getAccessToken().then(() => {
        setIsTokenReady(true);
      });
    }
  }, [isTokenReady, setIsTokenReady]);

  // 画面描画時にDBからテーブルノートを全件取得して表示する
  const fetchTrashTableNotes = async () => {
    try {
      // バックエンドAPIからノート情報を取得
      const response = await fetch("/api/tablenotes/trash", {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include"
      });

      if (!response.ok) {
        console.error("Get notes failed");
        return;
      }

      const data = await response.json();
      console.log("selected trash data:", JSON.stringify(data, null, 2));
      setTrashTableNotes(data);
    } catch (error) {
      console.error("Error fetching trash notes", error);
    }
  };

  useEffect(() => {
    if (isTokenReady) {
      fetchTrashTableNotes();
    }
  }, [isTokenReady]);

  // ノート復元ボタン押下時のコールバック関数
  const handleSave = (id: string, newTitle: string, newContent: string, newLabel: string, newUpdateDate: string) => {
    if (setTrashNotes !== undefined) {
      setTrashNotes(prevNote => prevNote.filter(note => note.id !== id));
    } else {
      console.error("setNotes is undefined");
    };
  }

  // ノート削除ボタン押下時のコールバック関数
  const handleDelete = (id: string) => {
    if (setTrashNotes !== undefined) {
      setTrashNotes(prevNote => prevNote.filter(note => note.id !== id));
    } else {
      console.error("setNotes is undefined");
    };

    if (labels === undefined) {
      return <div>Loading...</div>;
    }
  };

  // テーブルノート復元ボタン押下時のコールバック関数
  const handleSaveTableNote = (id: string, newTitle: string, newLabel: string, newUpdateDate: string) => {
    if (setTrashTableNotes !== undefined) {
      setTrashTableNotes(prevNote => prevNote.filter(note => note.id !== id));
    } else {
      console.error("setNotes is undefined");
    };
  }

  // テーブルノート削除ボタン押下時のコールバック関数
  const handleDeleteTableNote = (id: string) => {
    if (setTrashTableNotes !== undefined) {
      setTrashTableNotes(prevNote => prevNote.filter(note => note.id !== id));
    } else {
      console.error("setTableNotes is undefined");
    };

    if (labels === undefined) {
      return <div>Loading...</div>;
    }
  };

  // 一括削除処理
  const handleAllDelete = async () => {
    try {
      // ノートを削除
      const responseDeleteNote = await fetch("/api/notes/trash", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include"
      })

      if (!responseDeleteNote.ok) {
        if (responseDeleteNote.status === 401) {
          console.error("Error deleting note");
          showSnackbar(t("message_error_occured_redirect_login"), "warning");
          router.push("/login");
        }
        throw new Error("Failed to delete trash");
      }
      // テーブルノートを削除
      const responseDeleteTableNote = await fetch("/api/tablenotes/trash", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      })
      if (!responseDeleteTableNote.ok) {
        if (responseDeleteTableNote.status === 401) {
          console.error("Error deleting note");
          showSnackbar(t("message_error_occured_redirect_login"), "warning");
          router.push("/login");
        }
        throw new Error("Failed to delete trash");
      }

      showSnackbar(t("message_all_delete"));
      await fetchTrashNotes();
      await fetchTrashTableNotes();

    } catch (error) {
      showSnackbar(t("message_error_occured"));
      return;
    }
  }

  // 一括復元処理
  const handleAllRestore = async () => {
    try {
      // ノートを復元
      const responseRestoreAllTrashNote = await fetch("/api/notes/trash", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include"
      })

      if (!responseRestoreAllTrashNote.ok) {
        if (responseRestoreAllTrashNote.status === 401) {
          console.error("Error deleting note");
          showSnackbar(t("message_error_occured_redirect_login"), "warning");
          router.push("/login");
        }
        throw new Error("Failed to restore trash");
      }
      // テーブルノートを復元
      const responseRestoreAllTrashTableNote = await fetch("/api/tablenotes/trash", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      })
      if (!responseRestoreAllTrashTableNote.ok) {
        if (responseRestoreAllTrashTableNote.status === 401) {
          console.error("Error restore trash");
          showSnackbar(t("message_error_occured_redirect_login"), "warning");
          router.push("/login");
        }
        throw new Error("Failed to restore trash");
      }

      showSnackbar(t("message_all_restore"));
      await fetchTrashNotes();
      await fetchTrashTableNotes();

    } catch (error) {
      showSnackbar(t("message_error_occured", "error"));
      return;
    }
  }

  return (
    <Container>
      <p data-testid="description">{t("label_trash_desc")}</p>
      <Button variant="contained" onClick={handleAllDelete} sx={{ mr: 1, mt: 2, mb: 2 }} data-testid="button_all_delete">{t("button_all_delete")}</Button>
      <Button variant="contained" onClick={handleAllRestore} sx={{ mr: 1, mt: 2, mb: 2 }} data-testid="button_all_restore">{t("button_all_restore")}</Button>
      <Grid container spacing={2}>
        {trashNotes.map(note => (
          <Grid key={note.id}>
            <TrashNote
              id={note.id}
              title={note.title}
              content={note.content}
              label_id={note.label_id}
              is_locked={note.is_locked}
              createdate={note.createdate}
              updatedate={note.updatedate}
              onRestore={handleSave}
              onDelete={handleDelete}
              data-testid="trashnote"
            />
          </Grid>
        ))}
        {trashTableNotes.map(tableNote => (
          <Grid key={tableNote.id}>
            <TrashTableNote
              id={tableNote.id}
              title={tableNote.title}
              label_id={tableNote.label_id}
              is_locked={tableNote.is_locked}
              createdate={tableNote.createdate}
              updatedate={tableNote.updatedate}
              onRestore={handleSaveTableNote}
              onDelete={handleDeleteTableNote}
              data-testid="trashtablenote"
            />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}