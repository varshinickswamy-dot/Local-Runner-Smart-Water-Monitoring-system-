import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { API_BASE_URL } from "../../config";

function ProtectedRoute({ children }) {

  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);


  useEffect(() => {

    let mounted = true;


    const verifyToken = async () => {

      const token = localStorage.getItem(
        "jalrakshak_access_token"
      );


      // =================================================
      // NO TOKEN
      // =================================================

      if (!token) {

        if (mounted) {
          setAuthenticated(false);
          setChecking(false);
        }

        return;
      }


      // =================================================
      // VERIFY TOKEN WITH BACKEND
      // =================================================

      try {

        console.log(
          "JalRakshak AI: Verifying authentication..."
        );


        const response = await fetch(
          `${API_BASE_URL}/api/auth/me`,
          {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );


        console.log(
          "Authentication response:",
          response.status
        );


        // =================================================
        // TOKEN VALID
        // =================================================

        if (response.ok) {

          const user = await response.json();

          console.log(
            "Authenticated user:",
            user
          );


          localStorage.setItem(
            "jalrakshak_user",
            JSON.stringify(user)
          );


          if (mounted) {
            setAuthenticated(true);
            setChecking(false);
          }

          return;
        }


        // =================================================
        // TOKEN INVALID / EXPIRED
        // =================================================

        console.warn(
          "JalRakshak AI: Authentication failed."
        );


        localStorage.removeItem(
          "jalrakshak_access_token"
        );

        localStorage.removeItem(
          "jalrakshak_user"
        );


        if (mounted) {
          setAuthenticated(false);
          setChecking(false);
        }

      } catch (error) {

        console.error(
          "Authentication verification error:",
          error
        );


        /*
          IMPORTANT:

          If the backend itself is temporarily unavailable,
          don't immediately destroy the user's token.

          This prevents accidental logout because of a
          temporary connection problem.
        */

        if (mounted) {
          setAuthenticated(true);
          setChecking(false);
        }

      }

    };


    verifyToken();


    return () => {
      mounted = false;
    };

  }, []);


  // =====================================================
  // VERIFYING SESSION
  // =====================================================

  if (checking) {

    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1020",
          color: "#F8FAFC",
          fontFamily:
            'Inter, "Segoe UI", Arial, sans-serif',
        }}
      >

        <div
          style={{
            textAlign: "center",
          }}
        >

          <div
            style={{
              width: "42px",
              height: "42px",
              margin: "0 auto 18px",
              borderRadius: "50%",
              border:
                "3px solid rgba(108, 92, 231, 0.20)",
              borderTopColor: "#6C5CE7",
              animation:
                "jalrakshak-auth-spin 0.8s linear infinite",
            }}
          />

          <h2
            style={{
              margin: 0,
              fontSize: "20px",
            }}
          >
            JalRakshak AI
          </h2>

          <p
            style={{
              marginTop: "7px",
              color: "#94A3B8",
              fontSize: "13px",
            }}
          >
            Verifying your session...
          </p>

        </div>


        <style>
          {`
            @keyframes jalrakshak-auth-spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>

      </div>
    );

  }


  // =====================================================
  // NOT AUTHENTICATED
  // =====================================================

  if (!authenticated) {

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );

  }


  // =====================================================
  // AUTHENTICATED
  // =====================================================

  return children;

}

export default ProtectedRoute;