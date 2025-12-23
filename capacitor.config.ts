import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lira.app',
  appName: 'LIRA',
  webDir: 'out',
  server: {
    url: 'https://lira365.com',
    cleartext: true
  }
};

export default config;
