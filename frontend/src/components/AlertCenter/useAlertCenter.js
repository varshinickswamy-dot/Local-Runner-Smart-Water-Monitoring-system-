import { useContext } from "react";

import AlertCenterContext from "./AlertCenterContext";

function useAlertCenter() {
  const context = useContext(AlertCenterContext);

  if (!context) {
    throw new Error("useAlertCenter must be used inside AlertCenterProvider");
  }

  return context;
}

export default useAlertCenter;
