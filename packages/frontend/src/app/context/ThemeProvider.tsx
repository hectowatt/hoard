'use client';

import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import React, { createContext, useCallback, useContext, useMemo } from 'react';

// テーマ管理用コンテキストを作成
export const ThemeModeContext = createContext<{
    mode: "light" | "dark";
    setMode: (mode: "light" | "dark") => Promise<void>;
} | undefined>(undefined);

export const useThemeMode = () => {
    const context = useContext(ThemeModeContext);
    if (!context) {
        throw new Error("useThemeMode must be used within a ThemeModeProvider");
    }
    return context;
};

const THEME_KEY = process.env.THEME_KEY ? process.env.THEME_KEY : "hoard_theme_mode";

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = React.useState<"light" | "dark" | null>(null);
    const themeForMediaQuery = useTheme();

    // クライアントサイドでlocalStorageからテーマモードを取得
    React.useEffect(() => {

        let determinedMode: "light" | "dark" = "light";

        const stored = window.localStorage.getItem(THEME_KEY);
        if (stored === "dark" || stored === "light") {
            determinedMode = stored;
        } else {
            // 未設定なら OS の設定を参照
            try {
                determinedMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            } catch {
                // 何もしない (デフォルトの"light"が使われる)
            }
        }
        setMode(determinedMode);
    }, []);

    // meta[name="theme-color"] をモードに応じて同期
    React.useEffect(() => {
        if (!mode) return;

        const color = mode === "dark" ? "#e3a838" : "#e3a838";
        let meta = document.querySelector('meta[name="theme-color"]');

        if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", "theme-color");
            document.head.appendChild(meta);
        }

        meta.setAttribute("content", color);
    }, [mode]);

    const setModeHandler = useCallback(async (newMode: "light" | "dark") => {
        try {
            setMode(newMode);
            localStorage.setItem(THEME_KEY, newMode);
        } catch (error) {
            console.error("Failed to set theme mode in localStorage", error);
        }
    }, []);

    const contextValue = useMemo(() => ({
        mode: mode as "light" | "dark",
        setMode: setModeHandler,
    }), [mode, setModeHandler]);

    if (mode === null) {
        return null;
    }

    const theme = createTheme({
        palette: {
            tonalOffset: 0,
            // modeがnullの場合は'light'をフォールバックとして使用
            mode: mode || 'light',
            ...(mode === "dark"
                ? {
                    primary: {
                        main: "#e3a838",
                        dark: "#000000",
                    },
                    background: {
                        default: "#000000",
                        paper: "#000000",
                    },
                }
                : {
                    primary: {
                        main: "#e3a838",
                        light: "#ffffff"
                    },
                    background: {
                        default: "#ffffff",
                        paper: "#ffffff",
                    },
                }),
            action: {
                disabledOpacity: 0.25
            }
        },
        typography: {
            fontSize: 14,
            h1: {
                fontSize: '2rem',
            },
            h2: {
                fontSize: '1.5rem',
            },
            h3: {
                fontSize: '1.25rem',
            },
            h4: {
                fontSize: '1.1rem',
            },
            h5: {
                fontSize: '1rem',
            },
            h6: {
                fontSize: '0.875rem',
            },
            body1: {
                fontSize: '0.875rem',
            },
            body2: {
                fontSize: '0.8125rem',
            },
            button: {
                fontSize: '0.875rem',
            },
            caption: {
                fontSize: '0.75rem',
            },
        },
        components: {
            MuiAppBar: {
                styleOverrides: {
                    root: ({ theme }) =>
                        theme.palette.mode === 'dark'
                            ? {
                                // elevationによる色の変化（オーバーレイ）を無効化
                                backgroundImage: 'none',
                                backgroundColor: theme.palette.primary.dark,
                                color: "#ececec"
                            }
                            : {
                                backgroundColor: theme.palette.primary.light,
                                color: "#404040"
                            },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        ...(theme.palette.mode === "dark"
                            ? {
                                "& .MuiOutlinedInput-notchedOutline": {
                                    // borderColor: "#9e9e9e", // ダークモード時の枠線色
                                },
                            }
                            : {
                                "& .MuiOutlinedInput-notchedOutline": {
                                    // borderColor: "#000000", // ライトモード時の枠線色
                                },
                            }),
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#e3a838", // フォーカス時の枠線色
                            borderWidth: "2px",
                        },
                        "& input": {
                            "&::placeholder": {
                                color: "#9e9e9e", // プレースホルダーの色
                                opacity: 1, // 透過を防ぐ
                            },
                        },
                    }),
                    input: {
                        fontSize: "16px",
                        lineHeight: "20px",
                    }
                },
            },
            MuiInputBase: {
                styleOverrides: {
                    input: {
                        fontSize: "16px",
                        lineHeight: "20px",
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        "&:hover": {
                            backgroundColor: "#e3a84e"
                        },
                    }),
                },
            },
        },
        transitions: {
            create: (props, options) => themeForMediaQuery.transitions.create(props, options),
        },
    });

    return (
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
            <ThemeModeContext.Provider value={contextValue}>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    {children}
                </ThemeProvider>
            </ThemeModeContext.Provider>
        </AppRouterCacheProvider>
    );
}