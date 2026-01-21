import { startTokenRefreshInterval, stopTokenRefreshInterval } from '@/app/(authenticated)/script/TokenRefresh';
import { jest } from '@jest/globals';
import "@testing-library/jest-dom";

global.URL.createObjectURL = jest.fn(() => "mock-object-url");
global.URL.revokeObjectURL = jest.fn();

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = fetchMock;

// グローバル fetch モック
beforeEach(() => {
  fetchMock.mockImplementation((url: RequestInfo | URL) => {
    if (typeof url === "string" && url.includes("/api/token")) {
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

describe('Token Refresh Interval', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        stopTokenRefreshInterval();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('startTokenRefreshInterval を呼ぶと、一定時間後に fetch が実行されること', async () => {

        startTokenRefreshInterval();

        jest.advanceTimersByTime(13 * 60 * 1000);

        expect(global.fetch).toHaveBeenCalledWith('/api/token/refresh', expect.objectContaining({
            method: 'POST',
            credentials: 'include',
        }));
    });

    it('stopTokenRefreshInterval を呼ぶと、それ以降 fetch が実行されないこと', async () => {

        startTokenRefreshInterval();
        
        stopTokenRefreshInterval();

        jest.advanceTimersByTime(13 * 60 * 1000);

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('リフレッシュに失敗した際、インターバルが停止すること', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            statusText: 'Unauthorized',
        } as Response);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementationOnce(() => Promise.resolve());
        
        startTokenRefreshInterval();

        await jest.advanceTimersByTimeAsync(13 * 60 * 1000);

        expect(consoleSpy).toHaveBeenCalledWith('Token refresh failed:', 'Unauthorized');

        jest.advanceTimersByTime(13 * 60 * 1000);
        expect(global.fetch).toHaveBeenCalledTimes(1);

        consoleSpy.mockRestore();
    });

    it('多重起動しても、以前のインターバルがクリアされること', async () => {
        startTokenRefreshInterval();
        startTokenRefreshInterval();

        jest.advanceTimersByTime(13 * 60 * 1000);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});