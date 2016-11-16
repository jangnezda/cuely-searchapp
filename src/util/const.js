export const API_ROOT = (process.env.BACKEND === 'development') ? 'https://cuely-dev.ngrok.io' : 'https://backend.cuely.co';
export const ALGOLIA_INDEX = (process.env.BACKEND === 'development') ? 'cuely_dev_documents' : 'cuely_documents';
export const UPDATE_FEED_URL = (process.env.BACKEND === 'development') ? 'http://localhost:5123/updates/latest' : 'https://updates.cuely.co/updates/latest';

export function isProduction() {
  return (process.env.NODE_ENV === 'production');
}

export function isDevelopment() {
  return (process.env.NODE_ENV === 'development');
}

export function isBackendProduction() {
  return (process.env.BACKEND === 'production');
}

export function isBackendDevelopment() {
  return (process.env.BACKEND === 'development');
}
