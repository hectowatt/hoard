import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "@/app/(authenticated)/page";
import { useNoteContext } from "@/app/(authenticated)/context/NoteProvider";
import { useLabelContext } from "@/app/(authenticated)/context/LabelProvider";
import { useTableNoteContext } from "@/app/(authenticated)/context/TableNoteProvider";
import { useSearchWordContext } from "@/app/(authenticated)/context/SearchWordProvider";
import { useSearchLabelContext } from "@/app/(authenticated)/context/SearchLabelProvider";

// フックのモック化
jest.mock("@/app/(authenticated)/context/NoteProvider");
jest.mock("@/app/(authenticated)/context/LabelProvider");
jest.mock("@/app/(authenticated)/context/TableNoteProvider");
jest.mock("@/app/(authenticated)/context/SearchWordProvider");
jest.mock("@/app/(authenticated)/context/SearchLabelProvider");

// i18nextのモック
jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

jest.mock("@/app/context/AuthProvider", () => {
    return {
        useAuthContext: () => ({
            isTokenReady: true,
            setIsTokenReady: jest.fn(),
        }),
        AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    }
});

// 子コンポーネントの簡易モック
jest.mock("@/app/(authenticated)/components/InputForm", () => {
    return function MockInputForm() {
        return <div data-testid="input-form">InputForm</div>;
    };
});
jest.mock("@/app/(authenticated)/components/Note", () => {
    return function MockNote({ title }: { title: string }) {
        return <div data-testid="note">{title}</div>;
    };
});
jest.mock("@/app/(authenticated)/components/TableNote", () => {
    return function MockTableNote({ title }: { title: string }) {
        return <div data-testid="tablenote">{title}</div>;
    };
});

describe("Home Component", () => {
    const mockFetchNotes = jest.fn();
    const mockFetchTableNotes = jest.fn();
    const mockFetchLabels = jest.fn();

    const mockNotes = [
        { id: "1", title: "Note 1", content: "Content 1", label_id: "l1", is_pinned: false, updatedate: "2023-01-01" },
        { id: "2", title: "Pinned Note", content: "Content 2", label_id: "l1", is_pinned: true, updatedate: "2023-01-02" },
    ];

    const mockTableNotes = [
        { id: "t1", title: "Table 1", label_id: "l1", is_pinned: false, updatedate: "2023-01-01", columns: [], rowCells: [] },
    ];

    const mockLabels = [{ id: "l1", labelname: "Work" }];

    beforeEach(() => {
        jest.clearAllMocks();

        // デフォルトのContext戻り値を設定
        (useNoteContext as jest.Mock).mockReturnValue({
            notes: mockNotes,
            fetchNotes: mockFetchNotes,
            setNotes: jest.fn(),
        });
        (useLabelContext as jest.Mock).mockReturnValue({
            labels: mockLabels,
            fetchLabels: mockFetchLabels,
        });
        (useTableNoteContext as jest.Mock).mockReturnValue({
            tableNotes: mockTableNotes,
            fetchTableNotes: mockFetchTableNotes,
            setTableNotes: jest.fn(),
        });
        (useSearchWordContext as jest.Mock).mockReturnValue({ searchWord: "" });
        (useSearchLabelContext as jest.Mock).mockReturnValue({ searchLabel: "" });
    });

    afterEach(cleanup);

    it("初期表示時にノートとテーブルノートを取得する関数が実行されること", () => {
        render(<Home />);
        expect(mockFetchNotes).toHaveBeenCalledTimes(1);
        expect(mockFetchTableNotes).toHaveBeenCalledTimes(1);
    });

    it("ピン留めされたノートがリストの最初に表示されること", () => {
        render(<Home />);
        const notes = screen.getAllByTestId("note");

        expect(notes[0]).toHaveTextContent("Pinned Note");
        expect(notes[1]).toHaveTextContent("Note 1");
    });

    it("検索ワードを入力した際、該当するノートのみが表示されること", () => {
        (useSearchWordContext as jest.Mock).mockReturnValue({ searchWord: "Pinned" });
        render(<Home />);

        expect(screen.getByText("Pinned Note")).toBeInTheDocument();
        expect(screen.queryByText("Note 1")).not.toBeInTheDocument();
    });

    it("ラベルフィルターが有効な場合、フィルタリング中のメッセージが表示されること", () => {
        (useSearchLabelContext as jest.Mock).mockReturnValue({ searchLabel: "Work" });
        render(<Home />);

        expect(screen.getByText("label_filtered")).toBeInTheDocument();
    });

    it("テーブル内のセル値に検索ワードがヒットした場合、そのテーブルノートが表示されること", () => {
        const customTableNotes = [
            {
                id: "t2",
                title: "Searchable Table",
                label_id: "l1",
                is_pinned: false,
                updatedate: "2023-01-01",
                columns: [],
                rowCells: [[{ value: "FindMe" }]]
            }
        ];
        (useTableNoteContext as jest.Mock).mockReturnValue({
            tableNotes: customTableNotes,
            fetchTableNotes: jest.fn(),
        });
        (useSearchWordContext as jest.Mock).mockReturnValue({ searchWord: "findme" });

        render(<Home />);
        expect(screen.getByText("Searchable Table")).toBeInTheDocument();
    });
});