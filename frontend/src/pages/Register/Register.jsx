import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Eye,
  EyeOff,
  Droplets,
  User,
  Mail,
  Lock,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Leaf,
  ArrowRight,
  Quote,
} from "lucide-react";

import "./Register.css";

import { API_BASE_URL } from "../../config";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const fullName = formData.full_name.trim();
    const email = formData.email.trim();
    const username = formData.username.trim();

    if (!fullName || !email || !username || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            full_name: fullName,
            email,
            username,
            password: formData.password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        let message = "Registration failed.";

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

      /*
       * IMPORTANT:
       * Do NOT save the access token here.
       *
       * After registration, the user must login manually.
       * The Login page will create/save the authentication
       * token after successful login.
       */

      localStorage.removeItem("jalrakshak_access_token");
      localStorage.removeItem("jalrakshak_user");

      console.log("JalRakshak AI: Registration successful.");
      console.log(
        "Account created for username:",
        username
      );

      setSuccess(
        "Registration successful! Redirecting to login..."
      );

      /*
       * Store username temporarily so the Login page can
       * optionally use it later if needed.
       */
      sessionStorage.setItem(
        "jalrakshak_registered_username",
        username
      );

      /*
       * Redirect to Login page.
       */
      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1200);
    } catch (err) {
      console.error(
        "JalRakshak AI Registration Error:",
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

  return (
    <div className="register-page">

      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="register-overlay"></div>

      <div className="register-glow register-glow-one"></div>
      <div className="register-glow register-glow-two"></div>


      {/* =====================================================
          MAIN LAYOUT
      ====================================================== */}

      <div className="register-layout">

        {/* =================================================
            LEFT SIDE - PROJECT INFORMATION
        ================================================== */}

        <section className="register-info">

          <div className="info-content">

            {/* Brand */}

            <div className="project-brand">

              <div className="project-logo">
                <Droplets size={31} />
              </div>

              <div>
                <h1>JalRakshak AI</h1>
                <p>Smart Water Monitoring System</p>
              </div>

            </div>


            {/* Small line */}

            <div className="brand-line"></div>


            {/* Main text */}

            <div className="info-intro">

              <h2>
                Smarter Water.
                <br />
                <span>Safer Future.</span>
              </h2>

              <p>
                Monitor, detect and protect water resources
                using intelligent real-time technology.
              </p>

            </div>


            {/* Features */}

            <div className="feature-list">

              <div className="feature-item">

                <div className="feature-icon">
                  <Activity size={21} />
                </div>

                <div>
                  <h3>Real-time Monitoring</h3>

                  <p>
                    Track water flow, pressure and quality
                    continuously.
                  </p>
                </div>

              </div>


              <div className="feature-item">

                <div className="feature-icon">
                  <ShieldCheck size={21} />
                </div>

                <div>
                  <h3>Leakage & Theft Detection</h3>

                  <p>
                    Intelligent alerts for unusual water
                    consumption.
                  </p>
                </div>

              </div>


              <div className="feature-item">

                <div className="feature-icon">
                  <Leaf size={21} />
                </div>

                <div>
                  <h3>Water Conservation</h3>

                  <p>
                    Protecting valuable water resources
                    for future generations.
                  </p>
                </div>

              </div>

            </div>


            {/* Quote */}

            <div className="water-quote">

              <Quote size={25} />

              <div>
                <p>
                  Water is life.
                  <br />
                  Let's protect every drop.
                </p>
              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            RIGHT SIDE - REGISTER FORM
        ================================================== */}

        <section className="register-form-section">

          <div className="register-card">

            {/* Heading */}

            <div className="register-heading">

              <div className="register-heading-icon">
                <UserPlus size={24} />
              </div>

              <div>
                <h2>Create Account</h2>

                <p>
                  Join JalRakshak AI and help build a
                  smarter, sustainable future.
                </p>
              </div>

            </div>


            {/* Error */}

            {error && (
              <div className="register-message register-error">

                <AlertCircle size={18} />

                <span>{error}</span>

              </div>
            )}


            {/* Success */}

            {success && (
              <div className="register-message register-success">

                <CheckCircle2 size={18} />

                <span>{success}</span>

              </div>
            )}


            {/* Form */}

            <form onSubmit={handleSubmit}>

              {/* Full Name */}

              <div className="register-field">

                <label htmlFor="full_name">
                  Full Name
                </label>

                <div className="register-input-wrapper">

                  <User size={18} />

                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.full_name}
                    onChange={handleChange}
                    autoComplete="name"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* Email */}

              <div className="register-field">

                <label htmlFor="email">
                  Email Address
                </label>

                <div className="register-input-wrapper">

                  <Mail size={18} />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* Username */}

              <div className="register-field">

                <label htmlFor="username">
                  Username
                </label>

                <div className="register-input-wrapper">

                  <User size={18} />

                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleChange}
                    autoComplete="username"
                    disabled={loading}
                  />

                </div>

              </div>


              {/* Password */}

              <div className="register-field">

                <label htmlFor="password">
                  Password
                </label>

                <div className="register-input-wrapper">

                  <Lock size={18} />

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-toggle"
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


              {/* Confirm Password */}

              <div className="register-field">

                <label htmlFor="confirm_password">
                  Confirm Password
                </label>

                <div className="register-input-wrapper">

                  <Lock size={18} />

                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Confirm your password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) => !previous
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </div>


              {/* Password requirement */}

              <div className="password-requirement">

                <span></span>

                Password must contain at least 8 characters.

              </div>


              {/* Submit */}

              <button
                type="submit"
                className="register-submit"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <Loader2
                      size={19}
                      className="register-spinner"
                    />

                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account

                    <ArrowRight size={19} />
                  </>
                )}

              </button>

            </form>


            {/* Login */}

            <div className="register-login-link">

              <span>
                Already have an account?
              </span>

              <Link to="/login">
                Login
              </Link>

            </div>


            {/* Footer */}

            <div className="register-card-footer">

              <span></span>

              <div>
                <Leaf size={14} />
                Together for Water Security
              </div>

              <span></span>

            </div>

          </div>

        </section>

      </div>

    </div>
  );
}

export default Register;