import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SearchLabelProvider, useSearchLabelContext } from "@/app/(authenticated)/context/SearchLabelProvider";
import "@testing-library/jest-dom";

const ConsumerComponent = () => {
    const { searchLabel, setSearchLabel } = useSearchLabelContext();

    return (
        <div>
            <div data-testid="value">{searchLabel}</div>
            <button onClick={() => setSearchLabel("新しい検索語")}>更新</button>
        </div>
    );
};

describe("SearchLabelContext", () => {
    it("プロバイダで値を渡していると useSearchLabelContext が使える", () => {
        render(
            <SearchLabelProvider>
                <ConsumerComponent />
            </SearchLabelProvider>
        );

        expect(screen.getByTestId("value")).toHaveTextContent("");

        fireEvent.click(screen.getByText("更新"));

        expect(screen.getByTestId("value")).toHaveTextContent("新しい検索語");
    });
});
