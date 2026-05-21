import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cumbre.explorer',
  appName: 'Recorre Argentina',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['facebook.com'],
    },
  },
};

export default config;
