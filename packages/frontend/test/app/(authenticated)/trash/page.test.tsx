import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "@/app/(authenticated)/trash/page";
import "@testing-library/jest-dom";
import i18n from "@/app/lib/i18n";
import { LocaleProvider } from "@/app/context/LocaleProvider";
import { SnackbarProvider } from "@/app/(authenticated)/context/SnackbarProvider";
import { AuthProvider } from "@/app/context/AuthProvider";
import { useSearchWordContext } from "@/app/(authenticated)/context/SearchWordProvider";
import { useSearchLabelContext } from "@/app/(authenticated)/context/SearchLabelProvider";

jest.mock("@/app/(authenticated)/context/SearchWordProvider");
jest.mock("@/app/(authenticated)/context/SearchLabelProvider");

// モック：TrashNote, TrashTableNote
jest.mock("@/app/(authenticated)/components/TrashNote", () => (props: any) => (
    <div data-testid="trashnote">{props.title}</div>
));
jest.mock("@/app/(authenticated)/components/TrashTableNote", () => (props: any) => (
    <div data-testid="trashtablenote">{props.title}</div>
));

// モック：useLabelContext
jest.mock("@/app/(authenticated)/context/LabelProvider", () => ({
    useLabelContext: () => ({
        labels: [["1", "test"]],
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
                            title: "TrashNote 1",
                            content: "Deleted content",
                            label_id: "1",
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
                            title: "TrashTableNote 1",
                            label_id: "",
                            is_locked: false,
                            createdate: "",
                            updatedate: "",
                            columns: [],
                            rowCells: [],
                        },
                    ]),
            });
        }

        return Promise.reject("unknown endpoint");
    });

    (useSearchWordContext as jest.Mock).mockReturnValue({ searchWord: "" });
    (useSearchLabelContext as jest.Mock).mockReturnValue({ searchLabel: "" });
});

afterEach(cleanup);

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

        // 非同期描画を待つ
        await waitFor(() => {
            expect(screen.getByTestId("trashnote")).toHaveTextContent("TrashNote 1");
            expect(screen.getByTestId("trashtablenote")).toHaveTextContent("TrashTableNote 1");
        });

        // fetchが呼ばれていることを確認
        expect(fetch).toHaveBeenCalledWith("/api/notes/trash", expect.any(Object));
        expect(fetch).toHaveBeenCalledWith("/api/tablenotes/trash", expect.any(Object));
    });

    it("一括削除ボタンをクリックしたとき、確認ダイアログが表示されて/api/notes/trashと/api/tablenotes/trashにリクエストが送信される", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const confirmAllDeleteButton = await screen.getByTestId("button_confirm_all_delete");

        fireEvent.click(confirmAllDeleteButton);
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

        const confirmAllRestoreButton = await screen.getByTestId("button_confirm_all_restore");

        fireEvent.click(confirmAllRestoreButton);

        const allRestoreButton = await screen.getByTestId("button_all_restore");

        fireEvent.click(allRestoreButton);

        expect(fetch).toHaveBeenCalledWith("/api/notes/trash", expect.any(Object));
        expect(fetch).toHaveBeenCalledWith("/api/tablenotes/trash", expect.any(Object));
    });

    it("検索ワードを入力した際、該当するノートのみが表示されること", async () => {
        (useSearchWordContext as jest.Mock).mockReturnValue({ searchWord: "TrashNote 1" });
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        await waitFor(() => {
            expect(screen.getByText("TrashNote 1")).toBeInTheDocument();
            expect(screen.queryByText("TrashTableNote 1")).not.toBeInTheDocument();
        });
    });

    it("ラベルフィルターが有効な場合、フィルタリング中のメッセージが表示されること", () => {
        const label_filtered = i18n.t("label_filtered");
        (useSearchLabelContext as jest.Mock).mockReturnValue({ searchLabel: "test" });
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        expect(screen.getByText(label_filtered)).toBeInTheDocument();
    });
});
