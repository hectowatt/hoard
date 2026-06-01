import SearchWordBar from "@/app/(authenticated)/components/SearchWordBar";
import { SearchLabelProvider } from "@/app/(authenticated)/context/SearchLabelProvider";
import { SearchWordProvider } from "@/app/(authenticated)/context/SearchWordProvider";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("SearchWordBar", () => {
    it("検索バーがレンダリングされる", async() => {
        render(
            <SearchWordProvider>
                <SearchLabelProvider>
                    <SearchWordBar mode="dark" />
                </SearchLabelProvider>
            </SearchWordProvider>
        );
        const inputTitleWrapper = screen.getByTestId("searchWordInput");
        const inputTitle = inputTitleWrapper.querySelector('input') as HTMLInputElement;
        const clearButton = screen.queryByTestId("clearButton");
        const searchButton = screen.queryByTestId("searchButton");
        expect(inputTitle).toBeInTheDocument();
        expect(inputTitle.value).toBe("");
        expect(clearButton).not.toBeInTheDocument();
        expect(searchButton).toBeInTheDocument();
    });

    it("検索語が入力できる", async () => {
        const user = userEvent.setup();
        render(
            <SearchWordProvider>
                <SearchLabelProvider>
                    <SearchWordBar mode="dark" />
                </SearchLabelProvider>
            </SearchWordProvider>
        );

        const inputTitleWrapper = screen.getByTestId("searchWordInput");
        const inputTitle = inputTitleWrapper.querySelector('input') as HTMLInputElement;

        await user.type(inputTitle, "新しい検索ワード");

        expect(inputTitle).toHaveValue("新しい検索ワード");
    });

    it("検索ワードが入力されているとクリアボタンが表示される", async () => {
        const user = userEvent.setup();
        render(
            <SearchWordProvider>
                <SearchLabelProvider>
                    <SearchWordBar mode="dark" />
                </SearchLabelProvider>
            </SearchWordProvider>
        );

        const inputTitleWrapper = screen.getByTestId("searchWordInput");
        const inputTitle = inputTitleWrapper.querySelector('input') as HTMLInputElement;

        await user.type(inputTitle, "新しい検索ワード");

        const clearButton = screen.queryByTestId("clearButton");
        expect(clearButton).toBeInTheDocument();
    });
});