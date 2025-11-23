import { en } from './en';

const dictionaries = {
  en,
};

type LocaleKey = keyof typeof dictionaries;

const DEFAULT_LOCALE: LocaleKey = 'en';

const getValue = (obj: Record<string, any>, path: string) => {
  return path.split('.').reduce<any>((acc, segment) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, segment)) {
      return acc[segment];
    }
    return undefined;
  }, obj);
};

export const t = (path: string, locale: LocaleKey = DEFAULT_LOCALE): string => {
  const dictionary = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  const value = getValue(dictionary, path);
  if (typeof value === 'string') {
    return value;
  }
  return path;
};

export type { Dictionary } from './en';
