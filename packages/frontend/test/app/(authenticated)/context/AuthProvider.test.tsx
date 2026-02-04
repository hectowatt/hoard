import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuthContext } from "@/app/context/AuthProvider";
import "@testing-library/jest-dom";

jest.mock("@/app/context/AuthProvider", () => {
    return {
        verifyAndRefreshTokens: jest.fn().mockResolvedValue(true),
        useAuthContext: () => ({
            isInitializing: false
        }),
        AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    }
});

const ConsumerComponent = () => {
    const { isInitializing } = useAuthContext();

    return (
        <div>
            <div data-testid="value">{isInitializing ? "TRUE" : "FALSE"}</div>
        </div>
    );
};

describe("useAuthContext", () => {
    it("プロバイダで値を渡していると useAuthContext が使える", () => {
        render(
            <AuthProvider>
                <ConsumerComponent />
            </AuthProvider>
        );

        expect(screen.getByTestId("value")).toHaveTextContent("FALSE");
    });
});
