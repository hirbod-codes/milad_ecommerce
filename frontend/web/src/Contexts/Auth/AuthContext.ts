import { createContext } from 'react';

export const AuthContext = createContext<{
    privileges?: string[]
    isAuthLoading: boolean
} | undefined>(undefined);
