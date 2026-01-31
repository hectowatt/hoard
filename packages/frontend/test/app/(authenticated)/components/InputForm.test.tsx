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

describe("InputForm", () => {
    const mockOnInsert = jest.fn();
    const mockOnInsertTableNote = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        if (typeof fetchMock !== "undefined") {
            fetchMock.resetMocks();
            fetchMock.mockResponse(JSON.stringify({}));
        }
    });

    it("openがfalseのとき、プレースホルダが表示される", () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        )

        expect(screen.getByTestId("input_content")).toBeVisible();
    });

    it("openがtrueのとき、タイトル入力フィールドが表示される", async () => {
        const user = userEvent.setup();
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );
        const input = screen.getByTestId("input_content");

        await act(async () => {
            fireEvent.click(input);
        });

        const titleInput = await screen.findByTestId("input_title");
        expect(titleInput).toBeVisible();
    });

    it("openがtrueのとき、保存ボタンが表示される", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const input = screen.getByTestId("input_content");

        await act(async () => {
            fireEvent.click(input);
        });


        const saveButton = await screen.getByTestId("button_save");
        expect(saveButton).toBeVisible();
    });

    it("openがtrueのとき、キャンセルボタンが表示される", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const input = screen.getByTestId("input_content");

        await act(async () => {
            fireEvent.click(input);
        });

        const buttonCancel = await screen.getByTestId("button_cancel");
        expect(buttonCancel).toBeVisible();
    });

    it("openがtrueのとき、ラベルのドロップダウンが表示される", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const input = screen.getByTestId("input_content");

        await act(async () => {
            fireEvent.click(input);
        });

        const selectLabel = await screen.getByTestId("select_label");
        expect(selectLabel).toBeVisible();
    });

    it("openがtrueのとき、ロックアイコンが表示される", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const input = screen.getByTestId("input_content");

        await act(async () => {
            fireEvent.click(input);
        });

        const buttonUnlock = await screen.getByTestId("unlock");
        expect(buttonUnlock).toBeInTheDocument();
    });

    it("openがtrueのとき、ピンボタンが表示される", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const buttonpin = screen.getByTestId("button_pin");

        await act(async () => {
            fireEvent.click(buttonpin);
        });

        const buttonUnlock = await screen.getByTestId("unlock");
        expect(buttonUnlock).toBeInTheDocument();
    });

    it("openがtrueのとき、テーブルノートアイコンが表示される", async () => {
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const input = screen.getByTestId("input_content");

        await act(async () => {
            fireEvent.click(input);
        });

        const buttonTablenote = await screen.getByTestId("tablenote");
        expect(buttonTablenote).toBeInTheDocument();
    });

    it("タイトルを入力できる", async () => {
        const user = userEvent.setup();
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
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

        const inputTitle = screen.getByTestId("input_title");

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
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
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
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
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
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
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
                                <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
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
        const tableNoteIcon = await screen.getByTestId("tablenote");

        await act(async () => {
            fireEvent.click(tableNoteIcon);
        });

        const column1 = await screen.getByTestId("column-input");

        await waitFor(() => {
            expect(column1).toBeVisible();
        });

    });

    it("フォーカスが外れたときに縮小化される", async () => {
        render(
            <>
                <LocaleProvider>
                    <AuthProvider>
                        <SnackbarProvider>
                            <NoteProvider>
                                <LabelProvider>
                                    <InputForm onInsert={mockOnInsert} onInsertTableNote={mockOnInsertTableNote} />
                                </LabelProvider>
                            </NoteProvider>
                        </SnackbarProvider>
                    </AuthProvider>
                </LocaleProvider>
                <input data-testid="dummy-input" placeholder="ダミー入力" />
            </>
        );

        const inputContent = screen.getByTestId("input_content");

        await act(async () => {
            fireEvent.click(inputContent);
        });

        expect(screen.getByTestId("input_title")).toBeVisible();

        // dummyにフォーカスを移す
        const dummyInput = screen.getByTestId("dummy-input");
        await act(async () => {
            fireEvent.click(dummyInput);
        });

        // Collapse が閉じてタイトルが消えるのを確認
        await waitFor(() => {
            const inputTitle = screen.getByTestId("input_title");
            expect(inputTitle.closest('.MuiCollapse-root')).toHaveStyle({
                height: '0px'
            });
        });
    })
});