import {Platform} from 'react-native';
import {fetch as expoFetch} from 'expo/fetch';
/** Native streaming transport avoids buffering a whole provider feed before size checks. */
export const guideFetch: typeof globalThis.fetch = (...args) => Platform.OS === 'web' ? globalThis.fetch(...args) : expoFetch(...args);
