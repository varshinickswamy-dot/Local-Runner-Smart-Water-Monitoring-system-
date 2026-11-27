import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Droplets,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Waves,
  ArrowRight,
} from "lucide-react";

import "./Login.css";

import { API_BASE_URL } from "../../config";


function Login() {

  const navigate = useNavigate();


  // =====================================================
  // FORM DATA
  // =====================================================

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });


  // =====================================================
  // UI STATES
  // =====================================================

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");


  // =====================================================
  // HANDLE INPUT CHANGE
  // =====================================================

  const handleChange = (event) => {

    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };


  // =====================================================
  // HANDLE LOGIN
  // =====================================================

  const handleSubmit = async (event) => {

    event.preventDefault();

    setError("");
    setSuccess("");


    // ---------------------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------------------

    const username = formData.username.trim();

    if (!username || !formData.password) {

      setError(
        "Please enter your username and password."
      );

      return;
    }


    setLoading(true);


    try {

      // -------------------------------------------------
      // LOGIN API REQUEST
      // -------------------------------------------------

      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            username: username,
            password: formData.password,
          }),
        }
      );


      // -------------------------------------------------
      // READ RESPONSE
      // -------------------------------------------------

      const result = await response.json();


      // -------------------------------------------------
      // HANDLE LOGIN ERROR
      // -------------------------------------------------

      if (!response.ok) {

        let message = "Login failed.";


        if (typeof result.detail === "string") {

          message = result.detail;

        } else if (Array.isArray(result.detail)) {

          message = result.detail
            .map((item) => item.msg)
            .join(", ");

        } else if (result.message) {

          message = result.message;

        }


        throw new Error(message);
      }


      // -------------------------------------------------
      // IMPORTANT:
      // LOGIN MUST RETURN JWT
      // -------------------------------------------------

      if (!result.access_token) {

        throw new Error(
          "Login succeeded, but no authentication token was received."
        );

      }


      // -------------------------------------------------
      // SAVE JWT TOKEN
      // -------------------------------------------------

      localStorage.setItem(
        "jalrakshak_access_token",
        result.access_token
      );


      // -------------------------------------------------
      // SAVE USER INFORMATION
      // -------------------------------------------------

      if (result.user) {

        localStorage.setItem(
          "jalrakshak_user",
          JSON.stringify(result.user)
        );

      }


      // -------------------------------------------------
      // DEBUG INFORMATION
      // -------------------------------------------------

      console.log(
        "JalRakshak AI: Login successful."
      );

      console.log(
        "Authentication token saved."
      );


      if (result.user) {

        console.log(
          "Logged-in user:",
          result.user
        );

      }


      // -------------------------------------------------
      // SUCCESS MESSAGE
      // -------------------------------------------------

      setSuccess(
        "Login successful! Opening JalRakshak AI..."
      );


      // -------------------------------------------------
      // GO TO DASHBOARD
      // -------------------------------------------------

      setTimeout(() => {

        navigate("/dashboard", {
          replace: true,
        });

      }, 500);


    } catch (err) {

      console.error(
        "JalRakshak AI Login Error:",
        err
      );


      setError(
        err.message ||
          "Unable to connect to the JalRakshak AI server."
      );


    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="login-page">


      {/* =================================================
          BACKGROUND
          ================================================= */}

      <div className="login-background"></div>

      <div className="login-overlay"></div>


      {/* =================================================
          ANIMATED WATER GLOW
          ================================================= */}

      <div className="water-orb water-orb-one"></div>

      <div className="water-orb water-orb-two"></div>


      {/* =================================================
          DECORATIVE PIPELINE LINES
          ================================================= */}

      <div className="pipeline-line pipeline-line-one"></div>

      <div className="pipeline-line pipeline-line-two"></div>


      {/* =================================================
          MAIN LAYOUT
          ================================================= */}

      <div className="login-layout">


        {/* =================================================
            LEFT SIDE
            ================================================= */}

        <section className="login-visual">


          {/* ------------------------------------------------
              BRAND
              ------------------------------------------------ */}

          <div className="login-brand">

            <div className="login-logo">

              <Droplets size={31} />

            </div>


            <div>

              <h1>
                JalRakshak AI
              </h1>

              <p>
                Smart Water Monitoring System
              </p>

            </div>

          </div>


          {/* ------------------------------------------------
              HERO
              ------------------------------------------------ */}

          <div className="login-hero">


            <div className="live-indicator">

              <span></span>

              SYSTEM MONITORING ACTIVE

            </div>


            <h2>

              Protecting

              <br />

              <span>
                Every Drop.
              </span>

            </h2>


            <p>

              Intelligent water monitoring powered by
              AI, real-time sensors and automated
              detection.

            </p>

          </div>


          {/* ------------------------------------------------
              MONITORING CARD
              ------------------------------------------------ */}

          <div className="monitor-card">


            <div className="monitor-header">

              <div>

                <span>
                  LIVE WATER NETWORK
                </span>

                <strong>
                  Monitoring System
                </strong>

              </div>


              <Activity size={22} />

            </div>


            {/* Water animation */}

            <div className="water-wave">

              <div className="wave wave-one"></div>

              <div className="wave wave-two"></div>


              <div className="wave-center">

                <Waves size={26} />

              </div>

            </div>


            {/* Monitoring values */}

            <div className="monitor-stats">


              <div>

                <span>
                  FLOW
                </span>

                <strong>
                  24.8 L/min
                </strong>

              </div>


              <div>

                <span>
                  PRESSURE
                </span>

                <strong>
                  2.4 bar
                </strong>

              </div>


              <div>

                <span>
                  QUALITY
                </span>

                <strong>
                  Normal
                </strong>

              </div>


            </div>

          </div>


          {/* ------------------------------------------------
              SECURITY FEATURES
              ------------------------------------------------ */}

          <div className="security-points">


            <div>

              <ShieldCheck size={18} />

              <span>
                Secure Authentication
              </span>

            </div>


            <div>

              <Activity size={18} />

              <span>
                Real-time Detection
              </span>

            </div>


            <div>

              <Droplets size={18} />

              <span>
                Water Intelligence
              </span>

            </div>


          </div>


        </section>


        {/* =================================================
            RIGHT SIDE LOGIN
            ================================================= */}

        <section className="login-form-section">


          <div className="login-card">


            {/* ------------------------------------------------
                LOGIN ICON
                ------------------------------------------------ */}

            <div className="login-card-icon">

              <LogIn size={25} />

            </div>


            {/* ------------------------------------------------
                HEADING
                ------------------------------------------------ */}

            <div className="login-heading">

              <h2>
                Welcome Back
              </h2>


              <p>

                Sign in to continue monitoring your
                water network.

              </p>

            </div>


            {/* ------------------------------------------------
                ERROR MESSAGE
                ------------------------------------------------ */}

            {error && (

              <div className="login-message login-error">

                <AlertCircle size={18} />

                <span>
                  {error}
                </span>

              </div>

            )}


            {/* ------------------------------------------------
                SUCCESS MESSAGE
                ------------------------------------------------ */}

            {success && (

              <div className="login-message login-success">

                <CheckCircle2 size={18} />

                <span>
                  {success}
                </span>

              </div>

            )}


            {/* =================================================
                LOGIN FORM
                ================================================= */}

            <form onSubmit={handleSubmit}>


              {/* ------------------------------------------------
                  USERNAME
                  ------------------------------------------------ */}

              <div className="login-field">

                <label htmlFor="username">

                  Username

                </label>


                <div className="login-input-wrapper">

                  <User size={18} />


                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleChange}
                    autoComplete="username"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* ------------------------------------------------
                  PASSWORD
                  ------------------------------------------------ */}

              <div className="login-field">


                <div className="password-label-row">

                  <label htmlFor="password">

                    Password

                  </label>


                  <span>
                    Secure Login
                  </span>

                </div>


                <div className="login-input-wrapper">

                  <Lock size={18} />


                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    disabled={loading}
                  />


                  {/* Show / Hide password */}

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (previous) => !previous
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    disabled={loading}
                  >

                    {showPassword ? (

                      <EyeOff size={18} />

                    ) : (

                      <Eye size={18} />

                    )}

                  </button>

                </div>

              </div>


              {/* ------------------------------------------------
                  LOGIN BUTTON
                  ------------------------------------------------ */}

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >

                {loading ? (

                  <>

                    <Loader2
                      size={19}
                      className="login-spinner"
                    />

                    Signing In...

                  </>

                ) : (

                  <>

                    Sign In

                    <ArrowRight size={19} />

                  </>

                )}

              </button>


            </form>


            {/* =================================================
                REGISTER LINK
                ================================================= */}

            <div className="login-register">

              <span>
                Don't have an account?
              </span>


              <Link to="/register">

                Create Account

              </Link>

            </div>


            {/* =================================================
                SECURITY FOOTER
                ================================================= */}

            <div className="login-security">

              <ShieldCheck size={15} />

              <span>
                Your connection is protected
              </span>

            </div>


          </div>

        </section>


      </div>

    </div>

  );

}


export default Login;