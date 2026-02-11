import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "@/app/(authenticated)/trash/page";
import "@testing-library/jest-dom";
import i18n from "@/app/lib/i18n";
import { LocaleProvider } from "@/app/context/LocaleProvider";
import { SnackbarProvider } from "@/app/(authenticated)/context/SnackbarProvider";
import { AuthProvider } from "@/app/context/AuthProvider";

// モック：TrashNote, TrashTableNote
jest.mock("@/app/(authenticated)/components/TrashNote", () => (props: any) => (
    <div data-testid="trashnote">{props.title}</div>
));
jest.mock("@/app/(authenticated)/components/TrashTableNote", () => (props: any) => (
    <div data-testid="trashtablenote">{props.title}</div>
));

// モック：useLabelContext（ラベルは使われていないがエラー回避のため必要）
jest.mock("@/app/(authenticated)/context/LabelProvider", () => ({
    useLabelContext: () => ({
        labels: [],
        fetchLabels: jest.fn(),
    }),
}));

jest.mock("next/navigation", () => ({
    ...jest.requireActual("next/navigation"),
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
}));

jest.mock("@/app/context/AuthProvider", () => {
    return {
        verifyAndRefreshTokens: jest.fn().mockResolvedValue(true),
        useAuthContext: () => ({
            isInitializing: false
        }),
        AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    }
});


// グローバル fetch モック
beforeEach(() => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
        if (url.includes("/api/notes/trash")) {
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve([
                        {
                            id: "n1",
                            title: "Trash Note 1",
                            content: "Deleted content",
                            label_id: "",
                            is_locked: false,
                            createdate: "",
                            updatedate: "",
                        },
                    ]),
            });
        }

        if (url.includes("/api/tablenotes/trash")) {
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve([
                        {
                            id: "t1",
                            title: "Trash Table Note 1",
                            label_id: "",
                            is_locked: false,
                            createdate: "",
                            updatedate: "",
                        },
                    ]),
            });
        }

        return Promise.reject("unknown endpoint");
    });
});

describe("Trash Page", () => {
    it("renders trash notes and table notes", async () => {
        const label_trash_desc = i18n.t("label_trash_desc");
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        // 最初のテキスト
        expect(screen.getByText(label_trash_desc)).toBeInTheDocument();
        expect(screen.getByTestId("button_all_delete")).toBeInTheDocument();
        expect(screen.getByTestId("button_all_restore")).toBeInTheDocument();

        // 非同期描画を待つ
        await waitFor(() => {
            expect(screen.getByTestId("trashnote")).toHaveTextContent("Trash Note 1");
            expect(screen.getByTestId("trashtablenote")).toHaveTextContent("Trash Table Note 1");
        });

        // fetchが呼ばれていることを確認
        expect(fetch).toHaveBeenCalledWith("/api/notes/trash", expect.any(Object));
        expect(fetch).toHaveBeenCalledWith("/api/tablenotes/trash", expect.any(Object));
    });

    it("一括削除ボタンをクリックしたとき、/api/notes/trashと/api/tablenotes/trashにリクエストが送信される", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const allDeleteButton = await screen.getByTestId("button_all_delete");

        fireEvent.click(allDeleteButton);

        expect(fetch).toHaveBeenCalledWith("/api/notes/trash", expect.any(Object));
        expect(fetch).toHaveBeenCalledWith("/api/tablenotes/trash", expect.any(Object));
    });

    it("一括復元ボタンをクリックしたとき、/api/notes/trashと/api/tablenotes/trashにリクエストが送信される", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const allRestoreButton = await screen.getByTestId("button_all_restore");

        fireEvent.click(allRestoreButton);

        expect(fetch).toHaveBeenCalledWith("/api/notes/trash", expect.any(Object));
        expect(fetch).toHaveBeenCalledWith("/api/tablenotes/trash", expect.any(Object));
    });
});
