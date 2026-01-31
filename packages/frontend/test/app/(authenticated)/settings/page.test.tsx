import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "@/app/(authenticated)/settings/page";
import i18n from "@/app/lib/i18n";
import { SnackbarProvider } from "@/app/(authenticated)/context/SnackbarProvider";
import { AuthProvider } from "@/app/context/AuthProvider";

const mockBlob = new Blob(["mock zip data"], { type: "application/zip" });
const mockZipFile = new File(["mock zip data"], "test.zip", { type: "application/zip" });
global.URL.createObjectURL = jest.fn(() => "mock-object-url");
global.URL.revokeObjectURL = jest.fn();

jest.mock("@/app/context/AuthProvider", () => {
    return {
        useAuthContext: () => ({
            isTokenReady: true,
            setIsTokenReady: jest.fn(),
        }),
        AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    }
});

// グローバル fetch モック
beforeEach(() => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
        if (url.includes("/api/password")) {
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        password_id: "12345",
                        password_hashed: "$2b$10$EIX",
                    }),
            });
        }
        if (url.includes("/api/export")) {
            return Promise.resolve({
                ok: true, // 成功ステータス
                status: 200,
                blob: () => Promise.resolve(mockBlob),
                json: () => Promise.resolve({}),
            });
        }
        if (url.includes("/api/import")) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ message: "Import successful" }),
            });
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
        });
    });
});

describe("Setting Page", () => {
    it("説明文と入力欄、ボタンが表示される", async () => {
        const label_settings = i18n.t("label_settings");
        const label_user_settings = i18n.t("label_user_settings");
        const label_user_settings_desc = i18n.t("label_user_settings_desc");
        const label_note_password_settings = i18n.t("label_note_password_settings");
        const label_note_password_settings_desc = i18n.t("label_note_password_settings_desc");
        render(
            <AuthProvider>
                <SnackbarProvider>
                    <Home />
                </SnackbarProvider>
            </AuthProvider>
        );

        expect(screen.getByText(label_settings)).toBeInTheDocument();
        expect(screen.getByText(label_user_settings)).toBeInTheDocument();
        expect(screen.getByText(label_user_settings_desc)).toBeInTheDocument();
        expect(screen.getByText(label_note_password_settings)).toBeInTheDocument();
        expect(screen.getByText(label_note_password_settings_desc)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId("prevnotepasswordinput")).toBeInTheDocument();
        });

        expect(screen.getByTestId("lang_select")).toBeInTheDocument();
        expect(screen.getByTestId("prevpasswordinput")).toBeInTheDocument();
        expect(screen.getByTestId("passwordinput")).toBeInTheDocument();
        expect(screen.getByTestId("notepasswordinput")).toBeInTheDocument();
        expect(screen.getByTestId("userinfosave")).toBeInTheDocument();
        expect(screen.getByTestId("notepasswordsave")).toBeInTheDocument();
    });

    it("ユーザ情報保存ボタンをクリックしたとき、/api/userにリクエストが送信される", async () => {
        render(
            <AuthProvider>
                <SnackbarProvider>
                    <Home />
                </SnackbarProvider>
            </AuthProvider>
        );

        const userNameInput = await screen.getByTestId("usernameinput");
        fireEvent.change(userNameInput.querySelector("input")!, {
            target: { value: "testusername" },
        });

        const saveButton = await screen.getByTestId("userinfosave");
        fireEvent.click(saveButton);

        expect(fetch).toHaveBeenCalledWith("/api/user", expect.any(Object));
    });


    it("ノートパスワード保存ボタンをクリックしたとき、/api/passwordにリクエストが送信される", async () => {
        render(
            <AuthProvider>
                <SnackbarProvider>
                    <Home />
                </SnackbarProvider>
            </AuthProvider>
        );

        const notePasswordInput = await screen.getByTestId("notepasswordinput");
        fireEvent.change(notePasswordInput.querySelector("input")!, {
            target: { value: "testpassword" },
        });

        const saveButton = await screen.getByTestId("notepasswordsave");
        fireEvent.click(saveButton);

        expect(fetch).toHaveBeenCalledWith("/api/password", expect.any(Object));
    });

    it("ダウンロードボタンをクリックしたとき、/api/exportにリクエストが送信される", async () => {
        render(
            <AuthProvider>
                <SnackbarProvider>
                    <Home />
                </SnackbarProvider>
            </AuthProvider>
        );

        const downloadButton = await screen.findByTestId("button-download");
        fireEvent.click(downloadButton);
        await waitFor(() => { });

        expect(fetch).toHaveBeenCalledWith("/api/export");
    });

    it("データアップロードボタンでファイルを選択したとき、/api/importにリクエストが送信される", async () => {
        render(
            <AuthProvider>
                <SnackbarProvider>
                    <Home />
                </SnackbarProvider>
            </AuthProvider>
        );

        // 初期ロード（fetchPasswordStatus）の完了を待つ
        const uploadButton = await screen.findByTestId("button-upload");

        // 1. ファイルを選択したイベントをシミュレート
        //    アップロードボタンをクリックしてもファイル選択ダイアログが開くだけなので、
        //    実際にはボタン内の隠された <input type="file"> に change イベントを発火させる
        const fileInput = uploadButton.querySelector('input[type="file"]') as HTMLInputElement;

        fireEvent.change(fileInput, {
            target: { files: [mockZipFile] },
        });

        // 2. 非同期処理（/api/import への fetch とその後の showSnackbar）の完了を待つ
        //    リロード（window.location.reload）が呼ばれるまで待機
        await waitFor(() => {
            // /api/import への POST リクエストが送信されたことを確認
            expect(fetch).toHaveBeenCalledWith("/api/import", expect.objectContaining({
                method: "POST",
                body: expect.any(FormData), // FormData が含まれていることを確認
            }));
        });
    });

});