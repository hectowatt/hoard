import React, { act } from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Note from "@/app/(authenticated)/components/Note";
import { SnackbarProvider } from "@/app/(authenticated)/context/SnackbarProvider";

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


import { LabelProvider } from "@/app/(authenticated)/context/LabelProvider";
import { NoteProvider } from "@/app/(authenticated)/context/NoteProvider";
import i18n from "@/app/lib/i18n";
import { LocaleProvider } from "@/app/context/LocaleProvider";


describe("Note", () => {
    const mockOnSave = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnPin = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        if (typeof fetchMock !== "undefined") {
            fetchMock.resetMocks();
            fetchMock.mockResponse(JSON.stringify({}));
        }
    });

    it("ピンボタンを押すとアイコンがPushPinOutlinedIconからPushPinIconに変わる", async () => {
        render(
            <LocaleProvider>
                <SnackbarProvider>
                    <NoteProvider>
                        <LabelProvider>
                            <Note id={"testid111"} title={"テストノートタイトル"} content={"テストノートcontent"} label_id={""} createdate="2025-07-05 05:33:05.864" updatedate="2025-07-06 05:33:05.864" is_locked={false} is_pinned={false} onSave={mockOnSave} onDelete={mockOnDelete} onPin={mockOnPin} />
                        </LabelProvider>
                    </NoteProvider>
                </SnackbarProvider>
            </LocaleProvider>
        );

        await act(async () => {
            fireEvent.click(screen.getByText("テストノートタイトル"));
        });

        // 初期状態ではPushPinOutlinedIconが表示されていることを確認
        const pinButton = await screen.findByTestId("icon_pin");

        // ピンボタンをクリック
        await act(async () => {
            fireEvent.click(pinButton);
        });

        // アイコンがPushPinIconに変わることを確認
        const pinnedButton = await screen.findByTestId("icon_pinned");
        expect(pinnedButton).toBeVisible();
    });

    it("openがfalseのとき、タイトルとcontent、作成日、更新日が表示される", () => {
        render(
            <LocaleProvider>
                <SnackbarProvider>
                    <NoteProvider>
                        <LabelProvider>
                            <Note id={"testid111"} title={"テストノートタイトル"} content={"テストノートcontent"} label_id={""} createdate="2025-07-05 05:33:05.864" updatedate="2025-07-06 05:33:05.864" is_locked={false} is_pinned={false} onSave={mockOnSave} onDelete={mockOnDelete} onPin={mockOnPin} />
                        </LabelProvider>
                    </NoteProvider>
                </SnackbarProvider>
            </LocaleProvider>
        );

        expect(screen.getByText("テストノートタイトル")).toBeVisible();
        expect(screen.getByText("テストノートcontent")).toBeVisible();
        expect(screen.getByText(/2025\/07\/05/)).toBeVisible();
        expect(screen.getByText(/2025\/07\/06/)).toBeVisible();
    })

    it("クリックした時、編集、削除、ロックアイコンボタン、ピンボタンが表示される", async () => {
        render(
            <LocaleProvider>
                <SnackbarProvider>
                    <NoteProvider>
                        <LabelProvider>
                            <Note id={"testid111"} title={"テストノートタイトル"} content={"テストノートcontent"} label_id={""} createdate="2025-07-05 05:33:05.864" updatedate="2025-07-06 05:33:05.864" is_locked={false} is_pinned={false} onSave={mockOnSave} onDelete={mockOnDelete} onPin={mockOnPin} />
                        </LabelProvider>
                    </NoteProvider>
                </SnackbarProvider>
            </LocaleProvider>
        );

        await act(async () => {
            fireEvent.click(screen.getByText("テストノートタイトル"));
        })

        expect(screen.getByTestId("button_edit")).toBeVisible();
        expect(screen.getByTestId("button_delete")).toBeVisible();
        expect(screen.getByTestId("unlock")).toBeVisible();
        expect(screen.getByTestId("icon_pin")).toBeVisible();
    })

    it("編集モード時、タイトルを編集できる", async () => {
        render(
            <LocaleProvider>
                <SnackbarProvider>
                    <NoteProvider>
                        <LabelProvider>
                            <Note id={"testid111"} title={"テストノートタイトル"} content={"テストノートcontent"} label_id={""} createdate="2025-07-05 05:33:05.864" updatedate="2025-07-06 05:33:05.864" is_locked={false} is_pinned={false} onSave={mockOnSave} onDelete={mockOnDelete} onPin={mockOnPin} />
                        </LabelProvider>
                    </NoteProvider>
                </SnackbarProvider>
            </LocaleProvider>
        );

        await act(async () => {
            fireEvent.click(screen.getByText("テストノートタイトル"));
        })

        await act(async () => {
            fireEvent.click(screen.getByTestId("button_edit"));
        })

        const titleInput = screen.getByDisplayValue("テストノートタイトル") as HTMLInputElement;

        await act(async () => {
            fireEvent.change(titleInput, { target: { value: "新しいタイトル" } });
        });

        expect(titleInput.value).toBe("新しいタイトル");

    });

    it("編集モード時、contentを編集できる", async () => {
        render(
            <LocaleProvider>
                <SnackbarProvider>
                    <NoteProvider>
                        <LabelProvider>
                            <Note id={"testid111"} title={"テストノートタイトル"} content={"テストノートcontent"} label_id={""} createdate="2025-07-05 05:33:05.864" updatedate="2025-07-06 05:33:05.864" is_locked={false} is_pinned={false} onSave={mockOnSave} onDelete={mockOnDelete} onPin={mockOnPin} />
                        </LabelProvider>
                    </NoteProvider>
                </SnackbarProvider>
            </LocaleProvider>
        );

        await act(async () => {
            fireEvent.click(screen.getByText("テストノートタイトル"));
        })

        await act(async () => {
            fireEvent.click(screen.getByTestId("button_edit"));
        })

        const contentInput = screen.getByDisplayValue("テストノートcontent") as HTMLInputElement;

        await act(async () => {
            fireEvent.change(contentInput, { target: { value: "新しいcontent" } });
        });

        expect(contentInput.value).toBe("新しいcontent");

    });

    it("編集モード時、ラベルを編集できる", async () => {
        render(
            <LocaleProvider>
                <SnackbarProvider>
                    <NoteProvider>
                        <LabelProvider>
                            <Note id={"testid111"} title={"テストノートタイトル"} content={"テストノートcontent"} label_id={""} createdate="2025-07-05 05:33:05.864" updatedate="2025-07-06 05:33:05.864" is_locked={false} is_pinned={false} onSave={mockOnSave} onDelete={mockOnDelete} onPin={mockOnPin} />
                        </LabelProvider>
                    </NoteProvider>
                </SnackbarProvider>
            </LocaleProvider>
        );

        await act(async () => {
            fireEvent.click(screen.getByText("テストノートタイトル"));
        });

        await act(async () => {
            fireEvent.click(screen.getByTestId("button_edit"));
        });


        fireEvent.mouseDown(screen.getByTestId("label-select").querySelector('[role="combobox"]')!);

        // リストが出現するのを待つ
        const option = await screen.findByText("プライベート");

        fireEvent.click(option);

        // 選択できたか確認
        expect(screen.getByTestId("label-select")).toHaveTextContent("プライベート");
    });

    it("フォーカスが外れたときに縮小化される", async () => {
        render(
            <>
                <LocaleProvider>
                    <SnackbarProvider>
                        <NoteProvider>
                            <LabelProvider>
                                <Note id={"testid111"} title={"テストノートタイトル"} content={"テストノートcontent"} label_id={""} createdate="2025-07-05 05:33:05.864" updatedate="2025-07-06 05:33:05.864" is_locked={false} is_pinned={false} onSave={mockOnSave} onDelete={mockOnDelete} onPin={mockOnPin} />
                            </LabelProvider>
                        </NoteProvider>
                    </SnackbarProvider>
                </LocaleProvider>
                <input data-testid="dummy-input" placeholder="ダミー入力" />
            </>
        );

        await act(async () => {
            fireEvent.click(screen.getByText("テストノートタイトル"));
        });



        // DialogのBackdropを取得してクリック
        const backdrop = document.querySelector('.MuiBackdrop-root') as HTMLElement;
        expect(backdrop).toBeTruthy();

        fireEvent.mouseDown(backdrop);
        fireEvent.click(backdrop);


        await waitFor(() => {
            expect(screen.queryByRole("dialog")).toBeNull();
        });
    });

    it("ロックボタンをクリックするとロックされる", async () => {
        const lockedText = i18n.t("label_lockednote");
        render(
            <LocaleProvider>
                <SnackbarProvider>
                    <NoteProvider>
                        <LabelProvider>
                            <Note id={"testid111"} title={"テストノートタイトル"} content={"テストノートcontent"} label_id={""} createdate="2025-07-05 05:33:05.864" updatedate="2025-07-06 05:33:05.864" is_locked={false} is_pinned={false} onSave={mockOnSave} onDelete={mockOnDelete} onPin={mockOnPin} />
                        </LabelProvider>
                    </NoteProvider>
                </SnackbarProvider>
            </LocaleProvider>
        );

        await act(async () => {
            fireEvent.click(screen.getByText("テストノートタイトル"));
        });

        const lockIcon = screen.getByTestId("unlock");

        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ password_id: "dummy" }),
        }).mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });

        await act(async () => {
            fireEvent.click(lockIcon);
        });

        await waitFor(() => {
            const texts = screen.getAllByText(lockedText);
            expect(texts.length).toBeGreaterThan(0);
            expect(texts[0]).toBeVisible();
        });
    });

    it("ロックされているノートはロックされている旨がcontentに表示される", async () => {
        const lockedText = i18n.t("label_lockednote");
        render(
            <LocaleProvider>
                <SnackbarProvider>
                    <NoteProvider>
                        <LabelProvider>
                            <Note id={"testid111"} title={"テストノートタイトル"} content={"テストノートcontent"} label_id={""} createdate="2025-07-05 05:33:05.864" updatedate="2025-07-06 05:33:05.864" is_locked={true} is_pinned={false} onSave={mockOnSave} onDelete={mockOnDelete} onPin={mockOnPin} />
                        </LabelProvider>
                    </NoteProvider>
                </SnackbarProvider>
            </LocaleProvider>
        );

        expect(await screen.findByText(lockedText)).toBeVisible();
    });

});