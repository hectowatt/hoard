import { SnackbarProvider } from './(authenticated)/context/SnackbarProvider';
import { AuthProvider } from './context/AuthProvider';
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
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#e3a838' },
        { media: '(prefers-color-scheme: dark)', color: '#e3a838' }
    ]
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <html lang="ja" style={{ height: "100%" }}>
            <body style={{ margin: 0, minHeight: "100%" }}>
                <ThemeRegistry>
                    <LocaleProvider>
                        <AuthProvider>
                            <SnackbarProvider>
                                {children}
                            </SnackbarProvider>
                        </AuthProvider>
                    </LocaleProvider>
                </ThemeRegistry>
            </body>
        </html>
    );
}