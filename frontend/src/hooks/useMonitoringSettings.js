import { useEffect, useState } from "react";
import { getSettings } from "../services/api";

function useMonitoringSettings() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const response = await getSettings();

        if (
          mounted &&
          response?.success &&
          response?.data
        ) {
          setAutoRefresh(
            response.data.auto_refresh ?? true
          );

          setRefreshInterval(
            Number(
              response.data.refresh_interval ?? 5
            )
          );
        }
      } catch (error) {
        console.error(
          "Unable to load monitoring settings:",
          error
        );
      } finally {
        if (mounted) {
          setSettingsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    autoRefresh,
    refreshInterval,
    settingsLoading,
  };
}

export default useMonitoringSettings;