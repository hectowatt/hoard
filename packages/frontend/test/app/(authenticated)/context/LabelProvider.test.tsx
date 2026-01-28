// LabelProvider.test.tsx
import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { LabelProvider, useLabelContext } from "@/app/(authenticated)/context/LabelProvider";
import "@testing-library/jest-dom";
import { LocaleProvider } from "@/app/context/LocaleProvider";
import { SnackbarProvider } from "@/app/(authenticated)/context/SnackbarProvider";
import { AuthProvider, useAuthContext } from "@/app/context/AuthProvider";

const mockLabels = [
  { id: "1", labelname: "仕事" },
  { id: "2", labelname: "プライベート" },
];

type label = { id: string; labelname: string }

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
    useAuthContext: () => ({
      isTokenReady: true,
      setIsTokenReady: jest.fn(),
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
});


// テスト用の子コンポーネント
const TestComponent = () => {
  const { labels } = useLabelContext();
  return (
    <ul>
      {labels.map((label: label) => (
        <li key={label.id}>{label.labelname}</li>
      ))}
    </ul>
  );
};

describe("LabelProvider", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLabels,
    }) as jest.Mock;
  });

  it("fetchLabelsでAPIからラベルを取得し、コンテキスト経由で提供する", async () => {
    render(
      <LocaleProvider>
        <AuthProvider>
          <SnackbarProvider>
            <LabelProvider>
              <TestComponent />
            </LabelProvider>
          </SnackbarProvider>
        </AuthProvider>
      </LocaleProvider>
    );

    // fetch の完了と再レンダリングを待つ
    await waitFor(() => {
      expect(screen.getByText("仕事")).toBeInTheDocument();
      expect(screen.getByText("プライベート")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/labels", { "credentials": "include", "method": "GET" });
  });
});
