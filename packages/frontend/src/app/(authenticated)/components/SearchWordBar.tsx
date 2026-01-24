"use client";

import { useSearchWordContext } from "@/app/(authenticated)/context/SearchWordProvider";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
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
                sx={{
                    width: {
                        xs: "100%",
                        sm: 350,
                        md: 500,
                    },
                    backgroundColor: mode === "dark" ? "#060606" : "#ffffff",
                    borderRadius: "5px"
                }}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton type="submit" edge="end" aria-label="search" onClick={() => setSearchWord(word)}>
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