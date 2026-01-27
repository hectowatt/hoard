import React, { act } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import '@testing-library/jest-dom';
import TrashNote from "@/app/(authenticated)/components/TrashNote";
import { LabelProvider } from "@/app/(authenticated)/context/LabelProvider";
import { NoteProvider } from "@/app/(authenticated)/context/NoteProvider";
import i18n from "@/app/lib/i18n";
import { LocaleProvider } from "@/app/context/LocaleProvider";
import { SnackbarProvider } from "@/app/(authenticated)/context/SnackbarProvider";
import { AuthProvider } from "@/app/context/AuthProvider";

jest.mock("@/app/(authenticated)/context/LabelProvider", () => {
    return {
        ...jest.requireActual("@/app/(authenticated)/context/LabelProvider"),
        useLabelContext: () => ({
            labels: mockLabels,
        }),
        LabelProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

jest.mock("next/navigation", () => ({
    ...jest.requireActual("next/navigation"),
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
}));


// モックデータ
const mockNote = {
    id: "1",
    title: "テストノート",
    content: "これはテストノートです。",
    label_id: "label1",
    is_locked: false,
    createdate: "2024-07-01T12:00:00Z",
    updatedate: "2024-07-02T12:00:00Z",
    onRestore: jest.fn(),
    onDelete: jest.fn(),
};

// ロックされた削除済みノートのモック
const mockLockedNote = {
    id: "1",
    title: "テストノート",
    content: "これはテストノートです。",
    label_id: "label1",
    is_locked: true,
    createdate: "2024-07-01T12:00:00Z",
    updatedate: "2024-07-02T12:00:00Z",
    onRestore: jest.fn(),
    onDelete: jest.fn(),
};

// ラベルコンテキストのモック
const mockLabels = [
    { id: "label1", labelname: "仕事" },
    { id: "label2", labelname: "プライベート" },
];

beforeEach(() => {
    fetchMock.resetMocks();
    fetchMock.mockResponse(JSON.stringify({}));

    // i18nの初期化（まだ初期化されていない場合）
    if (!i18n.isInitialized) {
        i18n.init({
            lng: 'ja',
            fallbackLng: 'ja',
            ns: ['translation'],
            defaultNS: 'translation',
            interpolation: { escapeValue: false },
        });
    }
});


describe("TrashNote", () => {
    it("タイトル・内容・日付・ラベルが表示される", () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <TrashNote {...mockNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );
        expect(screen.getByText("テストノート")).toBeVisible();
        expect(screen.getByText("これはテストノートです。")).toBeVisible();
        expect(screen.getByText(/2024\/07\/01/)).toBeVisible();
        expect(screen.getByText(/2024\/07\/02/)).toBeVisible();
        expect(screen.getByText("仕事")).toBeVisible();
    });

    it("クリックでダイアログが開く", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <TrashNote {...mockNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );
        await act(async () => {
            fireEvent.click(screen.getByText("テストノート"));
        });
        expect(screen.getByRole("dialog")).toBeVisible();
        expect(screen.getByTestId("button_restore")).toBeVisible();
        expect(screen.getByTestId("button_permanently_delete")).toBeVisible();
        expect(screen.getByTestId("button_cancel")).toBeVisible();
    });

    it("復元ボタン・削除ボタンが表示される", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <TrashNote {...mockNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );
        await act(async () => {
            fireEvent.click(screen.getByText("テストノート"));
        });
        expect(screen.getByTestId("button_restore")).toBeVisible();
        expect(screen.getByTestId("button_permanently_delete")).toBeVisible();
    });

    it("ロックされているノートはロックされている旨がcontentに表示される", async () => {
        const lockedText = i18n.t("label_lockednote");
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <TrashNote {...mockLockedNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        expect(screen.getByText(lockedText)).toBeVisible();
    });

    it("キャンセルボタンを押したときにダイアログが閉じる", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <TrashNote {...mockNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        // ノートをクリックしてダイアログを開く
        await waitFor(() => {
            fireEvent.click(screen.getByText("テストノート"));
        });

        // ダイアログが開いていることを確認
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();

        // キャンセルボタンをクリック
        const cancelButton = screen.getByTestId("button_cancel");
        fireEvent.click(cancelButton);

        // ダイアログが閉じたことを確認
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });
});