import { createContext } from "react";
import { ThemeMode, ThemeOptions } from "../../Theme";
import { Calendar, LanguageCodes } from "../../Localization";
import { Config, TimeZone } from ".";

export type Configuration = Config & {
    updateTheme: (mode?: ThemeMode, themeOptions?: ThemeOptions) => void | Promise<void>,
    updateLocal: (languageCode?: LanguageCodes, calendar?: Calendar, direction?: 'rtl' | 'ltr', zone?: TimeZone) => void | Promise<void>,
    isConfigurationContextReady: boolean,
}

export const ConfigurationContext = createContext<Configuration | undefined>(undefined);
