import { Box, CssBaseline } from '@mui/material';
import { Viewport } from 'next';
import React from 'react';

const backgroundColor = '#e3a838';

export const viewport: Viewport = {
    minimumScale: 1,
    initialScale: 1,
    width: 'device-width',
    viewportFit: 'cover',
    themeColor: '#e3a838',
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <CssBaseline />
            <Box
                component="main"
                sx={{
                    minHeight: '100dvh',
                    pt: 'env(safe-area-inset-top)',
                    pb: 'env(safe-area-inset-bottom)',
                    bgcolor: backgroundColor,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {children}
            </Box>
        </>
    );
}