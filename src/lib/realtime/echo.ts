import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getApiLanguage } from '@/lib/locale/apiHeaders';
import { apiUrl, reverbConfig } from '@/lib/realtime/config';

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo?: Echo<'reverb'>;
  }
}

window.Pusher = Pusher;

let echoInstance: Echo<'reverb'> | null = null;
let activeToken: string | null = null;
const readyListeners = new Set<() => void>();

export function getEcho(): Echo<'reverb'> | null {
  return echoInstance;
}

export function whenEchoReady(listener: () => void): () => void {
  if (echoInstance) {
    listener();
    return () => {};
  }
  readyListeners.add(listener);
  return () => readyListeners.delete(listener);
}

function notifyReady(): void {
  for (const listener of readyListeners) {
    listener();
  }
  readyListeners.clear();
}

export function connectEcho(token: string): Echo<'reverb'> {
  if (echoInstance && activeToken === token) {
    return echoInstance;
  }

  disconnectEcho();

  activeToken = token;
  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: reverbConfig.key,
    wsHost: reverbConfig.host,
    wsPort: reverbConfig.port,
    wssPort: reverbConfig.port,
    forceTLS: reverbConfig.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiUrl}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Accept-Language': getApiLanguage(),
      },
    },
  });

  window.Echo = echoInstance;
  notifyReady();
  return echoInstance;
}

export function disconnectEcho(): void {
  echoInstance?.disconnect();
  echoInstance = null;
  activeToken = null;
  window.Echo = undefined;
  readyListeners.clear();
}
