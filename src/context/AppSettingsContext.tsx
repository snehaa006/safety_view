import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchAppSettings, saveAppSettings, type AppSettings } from '@/services/api';

interface AppSettingsContextValue {
  appName: string;
  logoData: string;
  save: (patch: Partial<AppSettings>) => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextValue>({
  appName: 'SafetyView',
  logoData: '',
  save: async () => {},
});

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [appName, setAppName] = useState('SafetyView');
  const [logoData, setLogoData] = useState('');

  useEffect(() => {
    fetchAppSettings().then((s) => {
      if (s.app_name) setAppName(s.app_name);
      if (s.logo_data) setLogoData(s.logo_data);
    }).catch(() => {});
  }, []);

  async function save(patch: Partial<AppSettings>) {
    await saveAppSettings(patch);
    if (patch.app_name !== undefined) setAppName(patch.app_name || 'SafetyView');
    if (patch.logo_data !== undefined) setLogoData(patch.logo_data || '');
  }

  return (
    <AppSettingsContext.Provider value={{ appName, logoData, save }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
