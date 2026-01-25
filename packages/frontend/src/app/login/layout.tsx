import { Viewport } from 'next';
import React from 'react';

export const viewport: Viewport = {
    minimumScale: 1,
    initialScale: 1,
    width: 'device-width',
    viewportFit: 'cover',
    themeColor: 'theme.palette.primary.main'
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
        </>
    );
}