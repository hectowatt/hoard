import React, { act } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import InputForm from "@/app/(authenticated)/components/InputForm";
import { LabelProvider } from "@/app/(authenticated)/context/LabelProvider";
import { NoteProvider } from "@/app/(authenticated)/context/NoteProvider";
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from "@/app/(authenticated)/context/SnackbarProvider";
import { LocaleProvider } from "@/app/context/LocaleProvider";
import i18n from "@/app/lib/i18n";
import { AuthProvider } from "@/app/context/AuthProvider";
import InputFormSmallScreen from "@/app/(authenticated)/components/InputFormSmallScreen";

// ラベルコンテキストのモック
const mockLabels = [
    { id: "label1", labelname: "仕事" },
    { id: "label2", labelname: "プライベート" },
];

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

describe("InputFormSmallScreen", () => {
    const mockOnInsert = jest.fn();
    const mockOnInsertTableNote = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        if (typeof fetchMock !== "undefined") {
            fetchMock.resetMocks();
            fetchMock.mockResponse(JSON.stringify({}));
        }
    });

    it("プレースホルダ、タイトル、内容入力欄、保存ボタン、キャンセルボタン、ラベルドロップダウン、ピンボタン、ロックボタン、テーブルノートボタンが表示される", async () => {
        const placeholderTitle = i18n.t("placeholder_input_title");
        const placeholderContent = i18n.t("placeholder_input_content");
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputFormSmallScreen open={true} onClose={mockOnClose} onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        )

        const inputTitleWrapper = screen.getByTestId("input_title");
        const inputContentWrapper = screen.getByTestId("input_content");
        const inputTitle = inputTitleWrapper.querySelector('input') as HTMLInputElement;
        const inputContent = inputContentWrapper.querySelector('textarea') as HTMLTextAreaElement;

        expect(inputTitle).toBeVisible();
        expect(inputContent).toBeVisible();
        expect(screen.getByTestId("button_save")).toBeVisible();
        expect(screen.getByTestId("button_cancel")).toBeVisible();
        expect(screen.getByTestId("select_label")).toBeVisible();
        expect(screen.getByTestId("button_pin")).toBeVisible();
        expect(screen.getByTestId("unlock")).toBeVisible();
        expect(screen.getByTestId("tablenote")).toBeVisible();

        expect(inputTitle).toHaveAttribute("placeholder", placeholderTitle);
        expect(inputContent).toHaveAttribute("placeholder", placeholderContent);
    });

    it("タイトルを入力できる", async () => {
        const user = userEvent.setup();
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputFormSmallScreen open={true} onClose={mockOnClose} onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const inputTitleWrapper = screen.getByTestId("input_title");
        const inputTitle = inputTitleWrapper.querySelector('input') as HTMLInputElement;

        await user.type(inputTitle, "新しいタイトル");

        expect(inputTitle).toHaveValue("新しいタイトル");
    });

    it("contentを入力できる", async () => {
        const user = userEvent.setup();
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputFormSmallScreen open={true} onClose={mockOnClose} onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );
        const inputContentWrapper = screen.getByTestId("input_content");
        const inputContent = inputContentWrapper.querySelector('textarea') as HTMLTextAreaElement;

        await user.type(inputContent, "新しいコンテンツ");

        expect(inputContent).toHaveValue("新しいコンテンツ");
    });

    it("titleもcontentもない状態で保存ボタンを押した時、snackbarが表示される", async () => {
        const warning = i18n.t("message_must_set_title_or_content");
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputFormSmallScreen open={true} onClose={mockOnClose} onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const button = screen.getByTestId("button_save");

        await act(async () => {
            fireEvent.click(button);
        });

        await waitFor(() => {
            const texts = screen.getAllByText(warning);
            expect(texts.length).toBeGreaterThan(0);
            expect(texts[0]).toBeVisible();
        });
    });

    it("ロックとアンロックを切り替えられる", async () => {
        // パスワード取得APIをモック
        global.fetch = jest.fn((url) => {
            if (url.includes("/api/password")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        password_id: "test-password-id",
                        password_hashed: "hashed-password"
                    })
                } as Response);
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            } as Response);
        }) as jest.Mock;

        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputFormSmallScreen open={true} onClose={mockOnClose} onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );
        const inputContent = screen.getByTestId("input_content");

        await act(async () => {
            fireEvent.click(inputContent);
        });

        const unlockIcon = await screen.findByTestId("unlock");

        await act(async () => {
            fireEvent.click(unlockIcon);
        });

        const lockIcon = await screen.findByTestId("lock");

        expect(lockIcon).toBeInTheDocument();
    });

    it("テーブルノート編集画面を開くことができる", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputFormSmallScreen open={true} onClose={mockOnClose} onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );
        const tableNoteIcon = await screen.getByTestId("tablenote");

        await act(async () => {
            fireEvent.click(tableNoteIcon);
        });

        const column1 = await screen.getByTestId("column-input");

        await waitFor(() => {
            expect(column1).toBeVisible();
        });

    });
});