import {
  LayoutDashboard,
  Cpu,
  SlidersHorizontal,
  Activity,
  Bell,
  Droplets,
  ShieldAlert,
  FlaskConical,
  Brain,
  History,
  Settings,
  LogOut,
  ClipboardList,
  Map,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

function Sidebar({ activePage, setActivePage }) {
  const navigate = useNavigate();

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Zone Map",
      icon: Map,
    },
    {
      name: "Devices",
      icon: Cpu,
    },
    {
      name: "Controls",
      icon: SlidersHorizontal,
    },
    {
      name: "Live Data",
      icon: Activity,
    },
    {
      name: "Alerts",
      icon: Bell,
    },
    {
      name: "Leakage Detection",
      icon: Droplets,
    },
    {
      name: "Theft Detection",
      icon: ShieldAlert,
    },
    {
      name: "Water Quality",
      icon: FlaskConical,
    },
    {
      name: "AI Analytics",
      icon: Brain,
    },
    {
      name: "History",
      icon: History,
    },
    {
      name: "Control History",
      icon: ClipboardList,
    },
    {
      name: "Settings",
      icon: Settings,
    },
  ];

  /* =====================================================
     LOGOUT
     ===================================================== */

  const handleLogout = () => {
    // Remove authentication token
    localStorage.removeItem(
      "jalrakshak_access_token"
    );

    // Remove stored user information
    localStorage.removeItem(
      "jalrakshak_user"
    );

    // Go to login page
    navigate("/login", {
      replace: true,
    });
  };

  return (
    <aside className="sidebar">

      {/* =================================================
          LOGO
          ================================================= */}

      <div className="sidebar-logo">

        <div className="logo-icon">
          <Droplets size={24} />
        </div>

        <div>
          <h2>JalRakshak</h2>

          <span>
            AI Water Intelligence
          </span>
        </div>

      </div>


      {/* =================================================
          NAVIGATION
          ================================================= */}

      <nav className="sidebar-navigation">

        <p className="sidebar-section-title">
          MAIN MENU
        </p>


        {menuItems.map((item) => {

          const Icon = item.icon;

          return (

            <button
              key={item.name}
              className={`sidebar-item ${
                activePage === item.name
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActivePage(item.name)
              }
            >

              <Icon size={19} />

              <span>
                {item.name}
              </span>

            </button>

          );

        })}

      </nav>


      {/* =================================================
          BOTTOM SECTION
          ================================================= */}

      <div className="sidebar-bottom">


        {/* =================================================
            SYSTEM STATUS
            ================================================= */}

        <div className="sidebar-system-card">

          <div className="system-dot"></div>

          <div>

            <strong>
              System Status
            </strong>

            <span>
              Monitoring Active
            </span>

          </div>

        </div>


        {/* =================================================
            LOGOUT BUTTON
            ================================================= */}

        <button
          className="sidebar-logout"
          onClick={handleLogout}
        >

          <LogOut size={18} />

          <span>
            Logout
          </span>

        </button>


        {/* =================================================
            VERSION
            ================================================= */}

        <div className="sidebar-version">
          JalRakshak AI · v1.0
        </div>

      </div>


    </aside>
  );
}

export default Sidebar;