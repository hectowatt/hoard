import { SnackbarProvider } from './(authenticated)/context/SnackbarProvider';
import { LocaleProvider } from './context/LocaleProvider';
import ThemeRegistry from './context/ThemeProvider';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: "Hoard",
    description: "A Notes app with table and password lock",
    icons: {
        icon: '/favicon.ico',
        apple: '/apple-touch-icon.png',
    },
    manifest: '/manifest.json',

    appleWebApp: {
        statusBarStyle: 'black-translucent',
        title: 'Hoard',
    },
};

export const viewport: Viewport = {
    minimumScale: 1,
    initialScale: 1,
    width: 'device-width',
    viewportFit: 'cover',
    themeColor: 'theme.palette.primary.main'
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <html lang="ja">
            <body style={{ margin: 0 }}>
                <ThemeRegistry>
                    <LocaleProvider>
                        <SnackbarProvider>
                            {children}
                        </SnackbarProvider>
                    </LocaleProvider>
                </ThemeRegistry>
            </body>
        </html>
    );
}