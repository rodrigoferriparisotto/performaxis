import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { VersionService, AppVersion } from '../services/versionService';
import { useAuth } from './AuthContext';

interface VersionContextType {
  needsUpdate: boolean;
  currentVersion: string | null;
  newVersion: string | null;
  checkForUpdates: () => Promise<void>;
  handleUpdate: () => void;
}

const defaultVersionContext: VersionContextType = {
  needsUpdate: false,
  currentVersion: null,
  newVersion: null,
  checkForUpdates: async () => {},
  handleUpdate: () => {},
};

const VersionContext = createContext<VersionContextType>(defaultVersionContext);

interface VersionProviderProps {
  children: ReactNode;
}

export const VersionProvider: React.FC<VersionProviderProps> = ({ children }) => {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const { user } = useAuth();

  const checkForUpdates = async () => {
    try {
      const hasUpdate = await VersionService.checkForUpdates(user?.id);
      if (hasUpdate) {
        const latestVersion = await VersionService.getCurrentVersion();
        setNewVersion(latestVersion);
        setNeedsUpdate(true);
      }
    } catch (error) {
    }
  };

  const handleUpdate = async () => {
    if (newVersion && user?.id) {
      await VersionService.markVersionAsSeen(user.id, newVersion);
    }
    VersionService.reloadApp();
  };

  useEffect(() => {
    const initializeVersion = async () => {
      const version = await VersionService.getCurrentVersion();
      if (version) {
        setCurrentVersion(version);
      }
    };

    initializeVersion();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const checkUserVersion = async () => {
      // 1) Detecção automática: o deploy no ar é mais novo que este bundle?
      //    (newVersion fica null de propósito: o modal mostra o aviso sem
      //    número, e o handleUpdate não grava "versão vista" — depois do
      //    reload os builds coincidem e o aviso se resolve sozinho)
      const buildDesatualizado = await VersionService.checkBuildUpdate();
      if (buildDesatualizado) {
        setNewVersion(null);
        setNeedsUpdate(true);
        return;
      }

      // 2) Publicação manual (anúncio de versão com número, super admin)
      const latestVersion = await VersionService.getCurrentVersion();
      if (!latestVersion) return;

      const hasSeenVersion = await VersionService.checkUserSeenVersion(user.id, latestVersion);

      if (!hasSeenVersion) {
        setNewVersion(latestVersion);
        setNeedsUpdate(true);
      }
    };

    checkUserVersion();

    const handleNewVersion = (version: AppVersion) => {
      setNewVersion(version.version);
      setNeedsUpdate(true);
    };

    const channel = VersionService.subscribeToVersionUpdates(handleNewVersion);

    const intervalId = setInterval(() => {
      checkUserVersion();
    }, 5 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUserVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      VersionService.unsubscribe();
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  return (
    <VersionContext.Provider
      value={{
        needsUpdate,
        currentVersion,
        newVersion,
        checkForUpdates,
        handleUpdate,
      }}
    >
      {children}
    </VersionContext.Provider>
  );
};

export const useVersion = (): VersionContextType => {
  const context = useContext(VersionContext);
  return context;
};
