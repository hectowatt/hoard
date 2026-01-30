"use client";


import React, { useEffect, useState } from "react";
import { Box, Button, Container, TextField, Typography, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import Person2OutlinedIcon from '@mui/icons-material/Person2Outlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from "react-i18next";
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import i18n from "@/app/lib/i18n";
import { useSnackbar } from "../context/SnackbarProvider";
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { styled } from '@mui/material/styles';
import { useAuthContext } from "@/app/context/AuthProvider";
import { getAccessToken } from "../script/TokenRefresh";

// 設定ページのコンテンツ
export default function Home() {
  const [prevNotePasswordString, setPrevNotePasswordString] = useState("");
  const [notePasswordString, setNotePasswordString] = useState("");
  const [newUsernameString, setNewUsernameString] = useState("");
  const [prevPasswordString, setPrevPasswordString] = useState("");
  const [newPasswordString, setNewPasswordString] = useState("");
  const [isPasswordExist, setIsPasswordExist] = useState(false);
  const [notePasswordId, setNotePasswordId] = useState("");
  const { t } = useTranslation();
  const { isTokenReady, setIsTokenReady } = useAuthContext();
  const availableLangs = Object.keys(i18n.options.resources || {});
  const langNames: Record<string, string> = {
    ja: "日本語",
    en: "English",
  };
  const { showSnackbar } = useSnackbar();
  const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
  });

  const fetchPasswordStatus = async () => {
    const responseSelect = await fetch("/api/password", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include"
    });

    if (responseSelect.ok) {
      const result = await responseSelect.json();
      if (result.password_id != null && result.password_id !== "") {
        setIsPasswordExist(true);
        setNotePasswordId(result.password_id);
      } else {
        setIsPasswordExist(false);
      }
    }
  };

  useEffect(() => {
    if (isTokenReady) {
      fetchPasswordStatus();
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

  // ノートパスワードの保存処理
  const handleSavePassword = async () => {
    if (notePasswordString.trim() === "") {
      showSnackbar(t("message_new_notepassword_must_be_set"), "warning");
      return;
    }

    if (isPasswordExist) {
      if (prevNotePasswordString.trim() === "") {
        showSnackbar(t("message_current_notepassword_must_be_set"), "warning");
        return;
      }

      const responseCompare = await fetch("/api/password/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password_id: notePasswordId,
          passwordString: prevNotePasswordString
        }),
        credentials: "include"
      });

      if (responseCompare.ok) {
        const result = await responseCompare.json();
        const isMatch = result.isMatch;
        if (isMatch) {
          const response = await fetch("/api/password", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              password_id: notePasswordId,
              passwordString: notePasswordString
            }),
            credentials: "include"
          });

          if (response.ok) {
            showSnackbar(t("message_notepassword_saved"), "success");
            setNotePasswordString(""); // 入力フィールドをクリア
            setPrevNotePasswordString("");
          } else {
            showSnackbar(t("message_failed_to_save_notepassword"), "error");
          }
        } else {
          showSnackbar(t("message_incorrect_current_notepassword"), "warning");
        }
      } else {
        showSnackbar(t("message_error_occured"), "error");
        return;
      }
    } else {
      // パスワードが未登録の場合は新規登録
      const response = await fetch("/api/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ passwordString: notePasswordString }),
        credentials: "include"
      });

      if (response.ok) {
        const result = await response.json();
        showSnackbar(t("message_notepassword_regist"), "success");
        setNotePasswordString(""); // 入力フィールドをクリア
        setIsPasswordExist(true);
        if (result?.password_id) {
          setNotePasswordId(result.password_id); // 新しいIDをセット
        }
      } else {
        showSnackbar(t("message_failed_to_regist_notepassword"), "error");
      }
    }

  };

  // アカウント情報の更新処理
  const handleSaveAccountInfo = async () => {
    if (!newUsernameString && !newPasswordString) {
      showSnackbar(t("message_username_or_password_must_be_set"), "warning");
      return;
    }

    if (newPasswordString && !prevPasswordString) {
      showSnackbar(t("message_new_password_must_be_set_when_change"), "warning");
      return;
    }

    if (newPasswordString) {
      const responseCompare = await fetch("/api/user/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          passwordString: prevPasswordString
        }),
        credentials: "include"
      });

      if (responseCompare.ok) {
        const result = await responseCompare.json();
        const isMatch = result.isMatch;
        if (isMatch) {

          const response = await fetch("/api/user", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              username: newUsernameString,
              password: newPasswordString
            }),
            credentials: "include"
          });
          if (response.ok) {
            showSnackbar(t("message_user_settings_saved"), "success");
            setNewUsernameString("");
            setPrevPasswordString("");
            setNewPasswordString("");
          } else {
            showSnackbar(t("message_failed_to_save_user_info"), "error");
          }
        } else {
          showSnackbar(t("message_incorrect_current_password"), "warning");
        }
      }
    } else {
      const response = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: newUsernameString,
          password: newPasswordString
        }),
        credentials: "include"
      });
      if (response.ok) {
        showSnackbar(t("message_user_info_saved"), "success");
        setNewUsernameString("");
        setPrevPasswordString("");
        setNewPasswordString("");
      } else {
        showSnackbar(t("message_failed_to_save_user_info"), "error");
      }
    }
  }

  // 言語切り替え処理
  const chageLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);
  };

  // データエクスポート処理
  const handleDownload = async () => {
    const res = await fetch("/api/export");
    if (!res.ok) {
      showSnackbar(t("message_error_occured"));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "export.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  // データアップロード処理
  const handleUpload = async (selectedFile: File) => {
    if (!selectedFile) {
      showSnackbar(t("message_must_select_zip_file"), "warning");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    showSnackbar(t("message_uploading"), "info");

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Import failed");
      }

      showSnackbar(t("message_complete_upload"), "success");
      window.location.reload();
    } catch (err) {
      console.error(err);
      showSnackbar(t("message_error_occured"), "error");
    }
  };

  return (

    <Container>
      <h1>{t("label_settings")}</h1>

      {/* 言語設定 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 4 }}>
        <LanguageOutlinedIcon></LanguageOutlinedIcon>
        <h3>{t("label_language_settings")}</h3>
      </Box>
      <p>{t("label_language_settings_desc")}</p>
      <FormControl size="small" sx={{ minWidth: 120 }} data-testid="lang_select">
        <InputLabel id="select-lang">{t("label_select_language")}</InputLabel>
        <Select
          labelId="select-lang"
          value={i18n.language?.split("-")[0] || ""}
          onChange={(e) => chageLanguage(String(e.target.value))}
          label={t("label_select_language")}
          renderValue={(selected: string) => {
            if (!selected) return <em>{t("dropdown_no_languages")}</em>;
            return langNames[selected] ?? selected;
          }}
        >
          {availableLangs.map((lng) => (
            <MenuItem key={lng} value={lng}>
              {langNames[lng] ?? lng}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* ユーザ設定 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 4 }}>
        <Person2OutlinedIcon />
        <h3>{t("label_user_settings")}</h3>
      </Box>
      <p>{t("label_user_settings_desc")}</p>
      <form>
        <TextField
          id="new-username"
          variant="outlined"
          value={newUsernameString}
          onChange={(e) => setNewUsernameString(e.target.value)}
          size="small"
          placeholder={t("placeholder_new_username")}
          sx={{
            width: {
              xs: "100%",
              sm: 350,
              md: 500,
            },
            borderRadius: "5px",
            mb: 1
          }}
          data-testid="usernameinput"
        />
        <br />
        <TextField
          id="current-password"
          variant="outlined"
          value={prevPasswordString}
          onChange={(e) => setPrevPasswordString(e.target.value)}
          size="small"
          placeholder={t("placeholder_current_password")}
          sx={{
            width: {
              xs: "100%",
              sm: 350,
              md: 500,
            },
            borderRadius: "5px",
            mb: 1
          }}
          data-testid="prevpasswordinput"
        />
        <br />
        <TextField
          id="new-password"
          variant="outlined"
          value={newPasswordString}
          onChange={(e) => setNewPasswordString(e.target.value)}
          size="small"
          placeholder={t("placeholder_new_password")}
          sx={{
            width: {
              xs: "100%",
              sm: 350,
              md: 500,
            },
            borderRadius: "5px",
            mb: 1
          }}
          data-testid="passwordinput"
        />
        <br />
        <Button onClick={handleSaveAccountInfo} variant="contained" data-testid="userinfosave">{t("button_save")}</Button>
      </form>

      {/* ノートパスワード設定 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 4 }}>
        <LockOutlinedIcon></LockOutlinedIcon>
        <h3>{t("label_note_password_settings")}</h3>
      </Box>
      <p>{t("label_note_password_settings_desc")}</p>
      {
        isPasswordExist ? (
          <form>
            <TextField
              id="password-confirm"
              variant="outlined"
              value={prevNotePasswordString}
              onChange={(e) => setPrevNotePasswordString(e.target.value)}
              size="small"
              placeholder={t("placeholder_current_note_password")}
              sx={{
                width: {
                  xs: "100%",
                  sm: 350,
                  md: 500,
                },
                borderRadius: "5px",
                mb: 1
              }}
              data-testid="prevnotepasswordinput"
            />
            <br />
            <TextField
              id="password-setting"
              variant="outlined"
              value={notePasswordString}
              onChange={(e) => setNotePasswordString(e.target.value)}
              size="small"
              placeholder={t("placeholder_new_note_password")}
              sx={{
                width: {
                  xs: "100%",
                  sm: 350,
                  md: 500,
                },
                borderRadius: "5px",
                mb: 1
              }}
              data-testid="notepasswordinput"
            />
            <br />
            <Button onClick={handleSavePassword} variant="contained" data-testid="notepasswordsave">{t("button_save")}</Button>
          </form>
        ) : (
          <form>
            <TextField
              id="password-setting"
              variant="outlined"
              value={notePasswordString}
              onChange={(e) => setNotePasswordString(e.target.value)}
              size="small"
              placeholder={t("placeholder_new_note_password")}
              sx={{
                width: {
                  xs: "100%",
                  sm: 350,
                  md: 500,
                },
                borderRadius: "5px",
                mb: 1
              }}
              data-testid="notepasswordinput"
            />
            <br />
            <Button onClick={handleSavePassword} variant="contained" data-testid="notepasswordsave">{t("button_save")}</Button>
          </form>
        )
      }
      {/* データダウンロード */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 4 }}>
        <FileDownloadOutlinedIcon></FileDownloadOutlinedIcon>
        <h3>{t("label_download")}</h3>
      </Box>
      <p>{t("label_download_desc")}</p>
      <Button onClick={handleDownload} variant="contained" data-testid="button-download">{t("button_download")}</Button>

      {/* データアップロード */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 4 }}>
        <FileUploadOutlinedIcon></FileUploadOutlinedIcon>
        <h3>{t("label_upload")}</h3>
      </Box>
      <div>
        <p>{t("label_upload_desc")}</p>
        <Button
          component="label"
          variant="contained"
          tabIndex={-1}
          sx={{ mt: 1 }}
          data-testid="button-upload"
        >
          {t("button_upload")}
          <VisuallyHiddenInput
            type="file"
            accept=".zip"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) {
                handleUpload(selected);
              }
            }}
          />
        </Button>

      </div>
    </Container >

  );
};