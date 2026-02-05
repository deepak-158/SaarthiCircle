import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Import translations
import en from './locales/en.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';

const RESOURCES = {
    en: { translation: en },
    hi: { translation: hi },
    bn: { translation: bn },
    ta: { translation: ta },
    te: { translation: te },
    mr: { translation: mr },
    gu: { translation: gu },
    kn: { translation: kn },
    ml: { translation: ml },
    pa: { translation: pa },
};

const LANGUAGE_DETECTOR = {
    type: 'languageDetector',
    async: true,
    detect: async (callback) => {
        try {
            // Check async storage
            const storedLanguage = await AsyncStorage.getItem('user-language');
            if (storedLanguage) {
                return callback(storedLanguage);
            }

            // Fallback to device locale
            const locale = Localization.getLocales()[0].languageCode;
            return callback(locale);
        } catch (error) {
            callback('en');
        }
    },
    init: () => { },
    cacheUserLanguage: async (language) => {
        try {
            await AsyncStorage.setItem('user-language', language);
        } catch (error) {
            // ignore
        }
    },
};

i18n
    .use(LANGUAGE_DETECTOR)
    .use(initReactI18next)
    .init({
        resources: RESOURCES,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
