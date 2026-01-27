import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuthContext } from "@/app/context/AuthProvider";
import "@testing-library/jest-dom";

const ConsumerComponent = () => {
    const { isTokenReady, setIsTokenReady } = useAuthContext();

    return (
        <div>
            <div data-testid="value">{isTokenReady ? "TRUE" : "FALSE"}</div>
            <button onClick={() => setIsTokenReady(true)}>更新</button>
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

        fireEvent.click(screen.getByText("更新"));

        expect(screen.getByTestId("value")).toHaveTextContent("TRUE");
    });
});
