import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/login/page";
import "@testing-library/jest-dom";
import i18n from "@/app/lib/i18n";
import { LocaleProvider } from "@/app/context/LocaleProvider";
import { SnackbarProvider } from "@/app/(authenticated)/context/SnackbarProvider";
import { AuthProvider } from "@/app/context/AuthProvider";

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


const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = fetchMock;

// グローバル fetch モック
beforeEach(() => {
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
        if (typeof url === "string" && url.includes("/api/user/isexist")) {
            return Promise.resolve({
                ok: true,
                status: 200,
                statusText: "OK",
                json: async () => ({ exists: false }),
            } as Response);
        }

        if (typeof url === "string" && url.includes("/api/user")) {
            return Promise.resolve({
                ok: true,
                status: 200,
                statusText: "OK",
                json: async () => ({ message: "regist user success!" }),
            } as Response);
        }

        if (typeof url === "string" && url.includes("/api/login")) {
            return Promise.resolve({
                ok: true,
                status: 200,
                statusText: "OK",
                json: async () => ({ success: true }),
            } as Response);
        }

        return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [],
        } as Response);
    });
});

describe("Login Page", () => {
    it("初期表示でユーザ作成ボタンが表示される", async () => {
        const label_makeuser = i18n.t("button_create_user");
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        // 非同期描画を待つ
        await waitFor(() => {
            expect(screen.getByText(label_makeuser)).toBeInTheDocument();
        });

        // fetchが呼ばれていることを確認
        expect(fetch).toHaveBeenCalledWith("/api/user/isexist", expect.any(Object));
    });

    it("ユーザ登録済みの場合、初期表示でログインボタンが表示される", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            statusText: '',
            json: async () => ({ exists: true })
        } as Response);

        const buttonLogin = i18n.t("button_login");
        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        // 非同期描画を待つ
        await waitFor(() => {
            expect(screen.getByText(buttonLogin)).toBeInTheDocument();
        });

        // fetchが呼ばれていることを確認
        expect(fetch).toHaveBeenCalledWith("/api/user/isexist", expect.any(Object));
    });

    it("ユーザ作成ボタンをクリックしたとき、/api/userにリクエストが送信される", async () => {
        const user = userEvent.setup();

        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const userNameInput = screen.getByTestId("username") as HTMLInputElement;
        const passwordInput = screen.getByTestId("password") as HTMLInputElement;

        await user.type(userNameInput, "testuser");
        await user.type(passwordInput, "testpassword");

        const createUserButton = await screen.getByTestId("makeuser");

        await user.click(createUserButton);

        expect(fetch).toHaveBeenCalledWith("/api/user", expect.any(Object));
    });

    it("ログインボタンをクリックしたとき、/api/userにリクエストが送信される", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            statusText: '',
            json: async () => ({ exists: true })
        } as Response);
        const user = userEvent.setup();

        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const userNameInput = screen.getByTestId("username") as HTMLInputElement;
        const passwordInput = screen.getByTestId("password") as HTMLInputElement;

        await user.type(userNameInput, "testuser");
        await user.type(passwordInput, "testpassword");

        const loginButton = await screen.getByTestId("login");

        await user.click(loginButton);

        expect(fetch).toHaveBeenCalledWith("/api/user", expect.any(Object));
    });

    it("ユーザ名を入力せずにログインボタンをクリックしたとき、エラーメッセージが表示される", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            statusText: '',
            json: async () => ({ exists: true })
        } as Response);

        fetchMock.mockResolvedValueOnce({
            ok: false, // 失敗させる
            status: 404,
            json: async () => ({ message: "Unauthorized" })
        } as Response);
        const user = userEvent.setup();

        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const passwordInput = screen.getByTestId("password") as HTMLInputElement;

        await user.type(passwordInput, "testpassword");

        const loginButton = await screen.getByTestId("login");

        await user.click(loginButton);

        const errorElement = await screen.findByText(/fail/i);

        expect(errorElement).toBeInTheDocument();
    });

    it("ユーザ名を入力せずにユーザ作成ボタンをクリックしたとき、エラーメッセージが表示される", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            statusText: '',
            json: async () => ({ exists: false })
        } as Response);

        fetchMock.mockResolvedValueOnce({
            ok: false, // 失敗させる
            status: 400,
            json: async () => ({ message: "Unauthorized" })
        } as Response);
        const user = userEvent.setup();

        render(
            <LocaleProvider>
                <AuthProvider>
                    <SnackbarProvider>
                        <Home />
                    </SnackbarProvider>
                </AuthProvider>
            </LocaleProvider>
        );

        const passwordInput = screen.getByTestId("password") as HTMLInputElement;

        await user.type(passwordInput, "testpassword");

        const makeUserButton = await screen.getByTestId("makeuser");

        await user.click(makeUserButton);

        const errorElement = await screen.findByText(/fail/i);

        expect(errorElement).toBeInTheDocument();
    });
});
