import { Platform, NativeModules } from 'react-native';

const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

const resolveBackendUrl = () => {
  if (envUrl) return envUrl;

  if (Platform.OS === 'web') {
    const hostname = globalThis?.location?.hostname || 'localhost';
    const protocol = globalThis?.location?.protocol || 'http:';
    return `${protocol}//${hostname}:4002`;
  }

  let host = 'localhost';
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (typeof scriptURL === 'string') {
    const m = scriptURL.match(/https?:\/\/([^:\/]+)(?::\d+)?/);
    if (m && m[1]) host = m[1];
  }

  if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
    host = '10.0.2.2';
  }

  return `http://${host}:4002`;
};

export const BACKEND_URL = resolveBackendUrl();
