import { useState, useEffect, useContext } from 'react';
import { useTranslation } from "react-i18next";
import { ThemeMode, ThemeOptions } from '../../Theme';
import { Calendar, LanguageCodes } from '../../Localization';
import { Config, TimeZone } from '.';
import { ColorStatic } from '../../Lib/Colors/ColorStatic';
import { defaultTheme } from '../../Theme/DefaultTheme';
import { StorageApi } from '@/src/Backend/Storage/StorageApi';
import { fetchData, getApiUrl } from '@/src/Backend/helpers';
import { FeedbackContext } from '../Feedback/FeedbackContext';
import { t } from 'i18next';

export function useConfigurationHook() {
    const defaultConfiguration: Config = {
        categories: undefined,
        languages: undefined,
        local: {
            calendar: 'Persian',
            zone: 'Asia/Tehran',
            language: 'en',
            direction: 'ltr'
        },
        themeOptions: {
            ...defaultTheme,
            mode: window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light',
        },
    }

    const feedback = useContext(FeedbackContext)
    const { i18n } = useTranslation()

    const [configuration, setConfiguration] = useState<Config>(defaultConfiguration)
    const [isConfigurationContextReady, setIsConfigurationContextReady] = useState<boolean>(false)

    const updateTheme = async (mode?: ThemeMode, themeOptions?: ThemeOptions) => {
        mode = mode ?? configuration.themeOptions.mode;
        themeOptions = themeOptions ?? configuration.themeOptions;

        configuration.themeOptions = themeOptions;
        configuration.themeOptions.mode = mode;

        (await StorageApi.getInstance()).setConfig(configuration)

        setConfiguration({ ...configuration, themeOptions: { ...configuration.themeOptions } })
        updateCssVars(mode, configuration.themeOptions)
    }
    const updateLocal = async (languageCode?: LanguageCodes, calendar?: Calendar, direction?: 'rtl' | 'ltr', zone?: TimeZone) => {
        direction = direction ?? configuration.local.direction
        zone = zone ?? configuration.local.zone
        languageCode = languageCode ?? configuration.local.language
        calendar = calendar ?? configuration.local.calendar

        const c: Config = {
            ...configuration,
            local: {
                ...configuration.local,
                language: languageCode,
                direction,
                zone,
                calendar,
            },
        };

        (await StorageApi.getInstance()).setConfig(c)

        await i18n.changeLanguage(c.local.language);

        document.dir = direction;

        setConfiguration(c);
    }
    const updateCssVars = (mode: ThemeMode, options: ThemeOptions) => {
        const stringifyColorForTailwind = (color: string) => {
            let hsl = ColorStatic.parse(color).toHsl()
            return `${hsl.getHue()} ${hsl.getSaturation()}% ${hsl.getLightness()}%`
        }

        const setCssVar = (k: string, v: string, isColor = false) => document.documentElement.style.setProperty(`--${k}`, isColor ? stringifyColorForTailwind(v) : v)

        setCssVar('radius', options.radius)
        setCssVar('scrollbar-width', options['scrollbar-width'])
        setCssVar('scrollbar-height', options['scrollbar-height'])
        setCssVar('scrollbar-border-radius', options['scrollbar-border-radius']);

        ['primary', 'secondary', 'tertiary', 'info', 'success', 'warning', 'error']
            .forEach(k => {
                Object
                    .keys(options.colors[k][mode])
                    .forEach((kk) => {
                        if (kk === 'main')
                            setCssVar(k, options.colors[k][mode][kk], true);
                        else
                            setCssVar(`${k}-${kk}`, options.colors[k][mode][kk], true);
                    })
            })

        Object
            .keys(options.colors.surface[mode])
            .forEach(k => {
                if (k === 'main')
                    setCssVar('surface', options.colors.surface[mode][k], true);
                else
                    setCssVar(`surface-${k}`, options.colors.surface[mode][k], true);
            })

        Object
            .keys(options.colors.outline[mode])
            .forEach(k => {
                if (k === 'main')
                    setCssVar('outline', options.colors.outline[mode][k], true);
                else
                    setCssVar(`outline-${k}`, options.colors.outline[mode][k], true);
            })

        setCssVar('scrollbar', options.colors.scrollbar, true);
    }

    useEffect(() => {
        if (!isConfigurationContextReady) {
            let fetches = undefined
            if (!configuration?.languages || !configuration?.categories)
                fetches = Promise.all([
                    fetchData(`${getApiUrl()}/languages`),
                    fetchData(`${getApiUrl()}/categories`),
                ])

            StorageApi.getInstance()
                .then(async (i) => {
                    if (i === undefined)
                        throw new Error('StorageApi instance is not available')

                    let c = await i.getConfig()
                    console.log({ c });

                    if (c === undefined) {
                        await i.setConfig(defaultConfiguration)
                        c = defaultConfiguration
                    }

                    document.dir = c.local.direction
                    updateCssVars(c.themeOptions.mode, c.themeOptions)
                    setConfiguration(c)
                    i18n.changeLanguage(c.local.language)
                    setIsConfigurationContextReady(true)

                    if (c.languages && c.categories)
                        return

                    const fs = await fetches

                    if (fs[0] && fs[0].response && fs[0].data)
                        setConfiguration({ ...configuration, languages: fs[0].data })
                    else
                        feedback.pushError({ node: t('configuration.LanguagesAreNotFetched') })

                    if (fs[1] && fs[1].response && fs[1].data)
                        setConfiguration({ ...configuration, categories: fs[1].data })
                    else
                        feedback.pushError({ node: t('configuration.CategoriesAreNotFetched') })
                })
        }
    }, [])

    return { ...configuration, updateTheme, updateLocal, isConfigurationContextReady }
}
