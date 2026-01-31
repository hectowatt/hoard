import React, { Children, createContext, useContext } from "react";

type screenSizeType = {
    isSmallScreen: boolean;
    setIsSmallScreen: React.Dispatch<React.SetStateAction<boolean>>;
};

const ScreenSizeContext = createContext<screenSizeType | undefined>(undefined);

export function useScreenSizeContext() {
    const ctx = useContext(ScreenSizeContext);
    if (!ctx) throw new Error("ScreenSizeContext must be used within ScreenSizeProvider");
    return ctx;
}

export const ScreenSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSmallScreen, setIsSmallScreen] = React.useState<boolean>(false);

    return (
        <ScreenSizeContext.Provider value={{ isSmallScreen, setIsSmallScreen }}>
            {children}
        </ScreenSizeContext.Provider>
    );
}