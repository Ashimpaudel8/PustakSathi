import { createContext, useContext, useState } from "react";

const PageStateContext = createContext(null);

export function PageStateProvider({ children }) {
    const [store, setStore] = useState({});

    const usePersistedState = (key, initialValue) => {
        const value = key in store ? store[key] : initialValue;
        const setValue = (update) => {
            setStore((prev) => {
                const current = key in prev ? prev[key] : initialValue;
                const next = typeof update === "function" ? update(current) : update;
                return { ...prev, [key]: next };
            });
        };
        return [value, setValue];
    };

    return (
        <PageStateContext.Provider value={{ usePersistedState }}>
            {children}
        </PageStateContext.Provider>
    );
}

export const usePageState = () => useContext(PageStateContext);