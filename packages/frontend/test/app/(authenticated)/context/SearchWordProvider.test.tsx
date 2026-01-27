import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SearchWordProvider, useSearchWordContext } from "@/app/(authenticated)/context/SearchWordProvider";
import "@testing-library/jest-dom";

const ConsumerComponent = () => {
    const { searchWord, setSearchWord } = useSearchWordContext();

    return (
        <div>
            <div data-testid="value">{searchWord}</div>
            <button onClick={() => setSearchWord("新しい検索語")}>更新</button>
        </div>
    );
};

describe("SearchWordContext", () => {
    it("プロバイダで値を渡していると useSearchWordContext が使える", () => {
        render(
            <SearchWordProvider>
                <ConsumerComponent />
            </SearchWordProvider>
        );

        expect(screen.getByTestId("value")).toHaveTextContent("");

        fireEvent.click(screen.getByText("更新"));

        expect(screen.getByTestId("value")).toHaveTextContent("新しい検索語");
    });
});
