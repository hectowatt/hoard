import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthenticatedLayout from "@/app/(authenticated)/layout";
import "@testing-library/jest-dom";
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

// fetch モック
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve(["Work", "Personal"]),
    })
) as jest.Mock;

const mockedUseRouter = jest.fn();

jest.mock("next/navigation", () => ({
    useRouter: () => mockedUseRouter(),
    usePathname: jest.fn().mockReturnValue("/"),
    useServerInsertedHTML: jest.fn(),
}));

// ThemeProvider をモック
const setModeMock = jest.fn();
jest.mock("@/app/context/ThemeProvider", () => {
    const originalModule = jest.requireActual("@/app/context/ThemeProvider");
    return {
        ...originalModule,
        useThemeMode: jest.fn(() => ({
            mode: "light",
            setMode: setModeMock,
        })),
        ThemeModeContext: {
            Provider: ({ children }: { children: React.ReactNode }) => (
                <div data-testid="mocked-theme-provider">{children}</div>
            ),
        },
    };
});

import { LabelProvider } from "@/app/(authenticated)/context/LabelProvider";
import { AuthProvider } from "@/app/context/AuthProvider";

describe("TopLayout", () => {
    it("renders logo, nav, and children", async () => {
        render(
            <SnackbarProvider>
                <AuthProvider>
                    <AuthenticatedLayout>
                        <div>Child Content</div>
                    </AuthenticatedLayout>
                </AuthProvider>
            </SnackbarProvider>
        );

        // ロゴ
        const logo = screen.getByAltText("Hoard Icon");
        expect(logo).toBeInTheDocument();

        // ナビゲーション項目
        expect(screen.getByTestId("noteicon")).toBeInTheDocument();
        expect(screen.getByTestId("labelicon")).toBeInTheDocument();
        expect(screen.getByTestId("trashicon")).toBeInTheDocument();
        expect(screen.getByTestId("settingicon")).toBeInTheDocument();
        expect(screen.getByTestId("reloadicon")).toBeInTheDocument();

        // 子コンテンツ
        expect(screen.getByText("Child Content")).toBeInTheDocument();
    });
    it("カラーテーマ切り替え", () => {
        render(
            <SnackbarProvider>
                <AuthProvider>
                    <AuthenticatedLayout>
                        <div>Toggle Test</div>
                    </AuthenticatedLayout>
                </AuthProvider>
            </SnackbarProvider>
        );

        const toggleButtons = screen.getAllByTestId("togglecolormode");
        expect(toggleButtons.length).toBeGreaterThan(0);

        // 最初のトグルボタンを使う
        const toggleButton = toggleButtons[0];

        // 初期状態はlight → iconは <LightModeOutlinedIcon />
        expect(toggleButton.querySelector("svg[data-testid='LightModeOutlinedIcon']")).toBeInTheDocument();

        fireEvent.click(toggleButton);

        // setMode が呼ばれていることを確認（状態変更はモック内で直接反映されないため）
        expect(setModeMock).toHaveBeenCalled();
    });

    it("ラベルアイテムがクリックされたとき、ダイアログが表示される", async () => {
        render(
            <SnackbarProvider>
                <AuthProvider>
                    <AuthenticatedLayout>
                        <div>Label Dialog Test</div>
                    </AuthenticatedLayout>
                </AuthProvider>
            </SnackbarProvider>
        );

        const labelButton = screen.getByTestId("labelicon");
        fireEvent.click(labelButton);

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
    });

    it("登録済みラベルがあるときにラベルリストが表示される", async () => {
        render(
            <SnackbarProvider>
                <AuthProvider>
                    <AuthenticatedLayout>
                        <div>Label List Test</div>
                    </AuthenticatedLayout>
                </AuthProvider>
            </SnackbarProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId("addedlabelicon-label1")).toBeInTheDocument();
            expect(screen.getByTestId("addedlabelicon-label2")).toBeInTheDocument();
        });
    });

    it('Hoardアイコンがトップページへのリンクを持っていること', () => {
        render(
            <SnackbarProvider>
                <AuthProvider>
                    <AuthenticatedLayout>
                        <div>Label List Test</div>
                    </AuthenticatedLayout>
                </AuthProvider>
            </SnackbarProvider>
        );

        // data-testid="hoardicon" を使って要素を取得
        const link = screen.getByTestId('hoardicon');

        // hrefプロパティが正しいか確認
        expect(link).toHaveAttribute('href', '/');
    });

});
