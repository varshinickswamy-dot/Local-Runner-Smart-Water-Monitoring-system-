import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { AlertTriangle, Droplets, MapPinOff, RefreshCw } from "lucide-react";

import { getDashboardSummary } from "./services/api";

import Dashboard from "./pages/Dashboard/Dashboard";
import ZoneMap from "./pages/ZoneMap/ZoneMap";
import Devices from "./pages/Devices/Devices";
import Controls from "./pages/Controls/Controls";
import LiveData from "./pages/LiveData/LiveData";
import Alerts from "./pages/Alerts/Alerts";
import Leakage from "./pages/Leakage/Leakage";
import Theft from "./pages/Theft/Theft";
import WaterQuality from "./pages/WaterQuality/WaterQuality";
import AIAnalytics from "./pages/AIAnalytics/AIAnalytics";
import History from "./pages/History/History";
import ControlHistory from "./pages/ControlHistory/ControlHistory";
import Settings from "./pages/Settings/Settings";

import Register from "./pages/Register/Register";
import Login from "./pages/Login/Login";

import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import TopBar from "./components/TopBar/TopBar";
import AlertToasts from "./components/AlertCenter/AlertToasts";
import AlertCenterProvider from "./components/AlertCenter/AlertCenterProvider";

import ThemeProvider from "./context/ThemeProvider";
import SensorStreamProvider from "./context/SensorStreamProvider";
import LanguageProvider from "./i18n/LanguageProvider";

import "./App.css";
import "./styles/theme.css";

import Sidebar from "./components/Sidebar/Sidebar";
import "./components/Sidebar/Sidebar.css";


// =========================================================
// PAGES AND THEIR WEB ADDRESSES
// =========================================================
//
// Every page has its own URL, so refresh, the browser Back
// button and shared links all work.

const PAGES = [
  { name: "Dashboard", path: "/" },
  { name: "Zone Map", path: "/zone-map" },
  { name: "Devices", path: "/devices" },
  { name: "Controls", path: "/controls" },
  { name: "Live Data", path: "/live-data" },
  { name: "Alerts", path: "/alerts" },
  { name: "Leakage Detection", path: "/leakage" },
  { name: "Theft Detection", path: "/theft" },
  { name: "Water Quality", path: "/water-quality" },
  { name: "AI Analytics", path: "/ai-analytics" },
  { name: "History", path: "/history" },
  { name: "Control History", path: "/control-history" },
  { name: "Settings", path: "/settings" },
];

// Older addresses that still work (login redirects to /dashboard).
const PATH_ALIASES = {
  "/dashboard": "/",
};

function pageForPath(pathname) {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  const normalized = PATH_ALIASES[trimmed] || trimmed;
  return PAGES.find((page) => page.path === normalized) || null;
}


// =========================================================
// LOADING / ERROR / NOT FOUND SCREENS
// =========================================================

function AppLoadingScreen() {
  return (
    <div className="app-state-screen">
      <div className="app-state-logo">
        <Droplets size={34} />
      </div>
      <h1>JalRakshak AI</h1>
      <div className="app-state-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>Loading JalRakshak AI...</p>
    </div>
  );
}

function AppErrorScreen({ onRetry }) {
  return (
    <div className="app-state-screen">
      <div className="app-state-logo app-state-logo--error">
        <AlertTriangle size={34} />
      </div>
      <h1>Cannot reach the JalRakshak AI server</h1>
      <p>Make sure the backend is running on port 8000, then try again.</p>
      <button type="button" className="app-state-button" onClick={onRetry}>
        <RefreshCw size={16} />
        <span>Try Again</span>
      </button>
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="app-state-screen app-state-screen--inline">
      <div className="app-state-logo app-state-logo--muted">
        <MapPinOff size={34} />
      </div>
      <h1>Page not found</h1>
      <button type="button" className="app-state-button" onClick={() => navigate("/")}>
        <span>Go to Dashboard</span>
      </button>
    </div>
  );
}


// =========================================================
// MAIN JALRAKSHAK AI APPLICATION
// =========================================================

function MainApplication() {

  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [attempt, setAttempt] = useState(0);

  const location = useLocation();

  const navigate = useNavigate();

  const currentPage = pageForPath(location.pathname);

  const activePage = currentPage?.name || "";

  const setActivePage = (name) => {
    const page = PAGES.find((item) => item.name === name);

    if (page) {
      navigate(page.path);
    }
  };


  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  useEffect(() => {

    const loadDashboard = async () => {

      try {

        setLoading(true);

        setError("");

        const data =
          await getDashboardSummary();

        setDashboard(data);

      } catch (err) {

        console.error(
          "Dashboard API Error:",
          err
        );

        setError(
          "Unable to connect to JalRakshak AI backend."
        );

      } finally {

        setLoading(false);

      }

    };

    loadDashboard();

  }, [attempt]);


  // Scroll to the top when changing page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);


  if (loading) {
    return <AppLoadingScreen />;
  }

  if (error) {
    return <AppErrorScreen onRetry={() => setAttempt((value) => value + 1)} />;
  }


  // =====================================================
  // MAIN APPLICATION
  // =====================================================

  return (
    <SensorStreamProvider>
      <AlertCenterProvider>
        <div className="app-layout">

          <Sidebar
            activePage={activePage}
            setActivePage={setActivePage}
          />

          <main className="main-content">

            <TopBar />

            {activePage === "Dashboard" && (
              <div className="dashboard-page">
                <Dashboard
                  dashboard={dashboard}
                />
              </div>
            )}

            {activePage === "Zone Map" && <ZoneMap />}

            {activePage === "Devices" && <Devices />}

            {activePage === "Controls" && <Controls />}

            {activePage === "Live Data" && <LiveData />}

            {activePage === "Alerts" && <Alerts />}

            {activePage === "Leakage Detection" && <Leakage />}

            {activePage === "Theft Detection" && <Theft />}

            {activePage === "Water Quality" && <WaterQuality />}

            {activePage === "AI Analytics" && <AIAnalytics />}

            {activePage === "History" && <History />}

            {activePage === "Control History" && <ControlHistory />}

            {activePage === "Settings" && <Settings />}

            {!currentPage && <NotFound />}

          </main>

          <AlertToasts />

        </div>
      </AlertCenterProvider>
    </SensorStreamProvider>
  );
}


// =========================================================
// ROOT APPLICATION
// =========================================================

function App() {

  return (

    <ThemeProvider>

      <LanguageProvider>

        <BrowserRouter>

          <Routes>

            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/register"
              element={<Register />}
            />

            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <MainApplication />
                </ProtectedRoute>
              }
            />

          </Routes>

        </BrowserRouter>

      </LanguageProvider>

    </ThemeProvider>

  );

}

export default App;
