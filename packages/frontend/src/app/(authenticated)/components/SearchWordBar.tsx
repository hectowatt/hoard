"use client";

import { useSearchWordContext } from "@/app/(authenticated)/context/SearchWordProvider";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import React from "react";
import { useTranslation } from "react-i18next";

type searchWordBarProps = {
    mode: "light" | "dark";
};

export default function SearchWordBar({ mode }: searchWordBarProps) {
    // 検索バー

    const { setSearchWord } = useSearchWordContext();
    const [word, setWord] = React.useState<string>("");
    const { t } = useTranslation();

    return (
        <form
            onSubmit={(e => {
                e.preventDefault();
            })}>
            <TextField
                id="outlined-search-bar"
                variant="filled"
                size="medium"
                placeholder={t("placeholder_search")}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                data-testid="searchWordInput"
                sx={{
                    width: {
                        xs: "100%",
                        sm: 350,
                        md: 500,
                    },
                    backgroundColor: "transparent",
                    boxShadow: "none",
                    "& .MuiFilledInput-root": {
                        height: {
                            xs: 50,
                            sm: 55
                        },
                        backgroundColor: mode === "dark" ? "#060606" : "#ffffff",
                        borderRadius: "5px",
                        "&:hover": {
                            backgroundColor: mode === "dark" ? "#060606" : "#ffffff",
                        },
                        "&.Mui-focused": {
                            backgroundColor: mode === "dark" ? "#060606" : "#ffffff",
                        },
                        "&:before, &:after": {
                            display: "none",
                        },
                        "& .MuiFilledInput-input": {
                            display: "flex",
                            alignItems: "center",
                            padding: "0 14px",
                            minHeight: "100%",
                        },
                    },
                }}
                InputProps={{
                    disableUnderline: true,
                    endAdornment: (
                        <InputAdornment position="end">
                            {word && (
                                <IconButton edge="end" aria-label="clear" data-testid="clearButton" onClick={() => {setWord(""); setSearchWord("");}} sx={{ color: "gray"}}>
                                    <ClearOutlinedIcon />
                                </IconButton>
                            )}
                            <IconButton type="submit" edge="end" aria-label="search" data-testid="searchButton" onClick={() => setSearchWord(word)}>
                                <SearchOutlinedIcon />
                            </IconButton>
                        </InputAdornment>
                    ),
                    sx: {
                        "&::placeholder": {
                            color: "#9e9e9e", // プレースホルダーの色を設定
                        }
                    },
                }}
            />
        </form>
    );
}