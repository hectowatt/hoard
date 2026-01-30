"use client";

import {
    Box,
    TextField,
    Typography,
    Paper,
} from "@mui/material";
import Button from "@mui/material/Button"
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ThemeRegistry from "@/app/context/ThemeProvider";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "@/app/(authenticated)/context/SnackbarProvider";
import { startTokenRefreshInterval } from "../(authenticated)/script/TokenRefresh";
import { useAuthContext } from "../context/AuthProvider";


export default function LoginPage() {
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [isUserExists, setIsUserExists] = React.useState(false);
    const [isChecking, setIsChecking] = React.useState(true);
    const { isTokenReady, setIsTokenReady } = useAuthContext();
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const router = useRouter();
    const { t } = useTranslation();
    const { showSnackbar } = useSnackbar();

    // ログイン用処理
    const handleLogin = async () => {
        setIsLoading(true);
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: username,
                password: password
            }),
            credentials: "include"
        })

        if (response.ok) {
            // クッキーが確実に設定されるまで待機
            await new Promise((resolve) => setTimeout(resolve, 100));

            // リフレッシュトークンの自動開始
            startTokenRefreshInterval();
            setIsTokenReady(true);
            console.log("login success!");
            setIsLoading(false);
            router.push("/");
        } else {
            const errorData = await response.json();
            setIsLoading(false);
            showSnackbar(t("message_login_failed"), "error");
        }
    };

    // 初回ユーザ作成処理
    const handleRegistUser = async () => {
        setIsLoading(true);
        const response = await fetch("/api/user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: username,
                password: password
            }),
            credentials: "include"
        })

        if (response.ok) {
            console.log("create user success!");
            // リフレッシュトークンの自動開始
            startTokenRefreshInterval();
            setIsTokenReady(true);
            setIsLoading(false);
            router.push("/");
        } else {
            const errorData = await response.json();
            setIsLoading(false);
            showSnackbar(t("message_failed_to_create_user") + errorData.message, "error");
        }
    };

    // 既存ユーザ存在チェック
    const checkUserExists = async () => {
        try {
            const response = await fetch("/api/user/isexist", {
                method: "GET",
                credentials: "include"
            });
            if (response.ok) {
                const isExist = await response.json();
                if (isExist && isExist.exists === true) {
                    setIsUserExists(true);
                }
            } else {
                console.error("failed to check user existence");
                showSnackbar(t("message_error_occured"), "error");
            };
        } catch (error) {
            console.error("failed to check user existence");
            showSnackbar(t("message_error_occured"), "error");
        } finally {
            setIsChecking(false);
        }

    };

    useEffect(() => {
        checkUserExists();
    }, []);

    const renderButton = () => {
        if (isChecking) {
            // チェック中
            return <Button variant="contained" disabled data-testid="loading">読み込み中...</Button>;
        }

        if (isUserExists) {
            // ユーザ登録済みの場合

            return (
                <Button variant="contained" loading={isLoading} onClick={handleLogin} data-testid="login">
                    {t("button_login")}
                </Button>
            );

        } else {
            // ユーザ未登録の場合
            return (
                <Button variant="contained" loading={isLoading} onClick={handleRegistUser} data-testid="makeuser">
                    {t("button_create_user")}
                </Button>
            );
        }
    };

    return (
        <Box sx={{
            minHeight: "100vh",
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#e3a838", p: 2,
        }}>
            <Image src="/Hoard_logo.png"
                alt="Logo"
                width={508}
                height={128}
                priority
                style={{
                    maxWidth: "100%", height: "auto",
                    marginBottom: "20px",
                }} />
            <Paper elevation={3} sx={{ p: 4 }} style={{ backgroundColor: "#faebd7" }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                        label={t("placeholder_username")}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        fullWidth
                        data-testid="username"
                        variant="outlined"
                        InputProps={{
                            sx: {
                                color: "#000000",
                                "&::placeholder": {
                                    color: "#9e9e9e",
                                    opacity: 1, // ブラウザによる自動的な透過を防ぐ
                                }
                            },
                        }}
                        InputLabelProps={{
                            sx: {
                                color: "#000000", // 通常時のラベル色
                                // ★フォーカスが当たった時もラベル色を黒に固定
                                "&.Mui-focused": {
                                    color: "#000000",
                                }
                            }
                        }}
                    />
                    <TextField
                        label={t("placeholder_password")}
                        type="password"
                        value={password}
                        variant="outlined"
                        onChange={(e) =>
                            setPassword(e.target.value)} fullWidth data-testid="password"
                        InputProps={{
                            sx: {
                                color: "#000000",
                                "&::placeholder": {
                                    color: "#9e9e9e",
                                    opacity: 1, // ブラウザによる自動的な透過を防ぐ
                                }
                            },
                        }}
                        InputLabelProps={{
                            sx: {
                                color: "#000000", // 通常時のラベル色
                                // ★フォーカスが当たった時もラベル色を黒に固定
                                "&.Mui-focused": {
                                    color: "#000000",
                                }
                            }
                        }} />
                    {renderButton()}
                </Box>
            </Paper>
        </Box>
    );
}