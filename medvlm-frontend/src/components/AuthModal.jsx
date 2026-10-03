import { useState } from "react";
import { useAuth, DEMO_PERSONAS } from "../context/AuthContext";
import {
  X,
  Lock,
  User,
  Building,
  Award,
  ShieldCheck,
  ArrowRight,
  LogIn,
  UserPlus,
  AlertCircle,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import "./AuthModal.css";

export default function AuthModal({ onAuthSuccess }) {
  const {
    authModalOpen,
    authModalTab,
    setAuthModalTab,
    closeAuthModal,
    loginWithPersona,
    loginWithCredentials,
    registerUser,
  } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("sarah.chen@stanford.med");
  const [loginPassword, setLoginPassword] = useState("••••••••••••");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Signup form state
  const [signupData, setSignupData] = useState({
    name: "Dr. Alex Mercer, MD",
    email: "",
    password: "",
    specialty: "Diagnostic Radiology",
    role: "Attending Radiologist",
    institution: "Metropolitan General Hospital",
    license: "RAD-NY-849201",
    department: "Department of Radiology & Thoracic Imaging",
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState(null);

  if (!authModalOpen) return null;

  const handlePersonaSelect = (personaId) => {
    loginWithPersona(personaId);
    if (onAuthSuccess) onAuthSuccess();
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setLoginError("Please enter your clinical email.");
      return;
    }
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await loginWithCredentials(loginEmail, loginPassword);
      if (res.success) {
        if (onAuthSuccess) onAuthSuccess();
      } else {
        setLoginError(res.error || "Authentication failed.");
      }
    } catch {
      setLoginError("Unable to authenticate. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!signupData.email.trim() || !signupData.name.trim()) {
      setSignupError("Name and institutional email are required.");
      return;
    }
    setSignupLoading(true);
    setSignupError(null);

    try {
      const res = await registerUser(signupData);
      if (res.success) {
        if (onAuthSuccess) onAuthSuccess();
      } else {
        setSignupError(res.error || "Registration failed.");
      }
    } catch {
      setSignupError("Registration error. Please check your details.");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div
      className="mvlm-auth-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="mvlm-auth-card">
        {/* Header */}
        <div className="mvlm-auth-header">
          <div className="mvlm-auth-title-wrap">
            <div className="mvlm-auth-icon-badge">
              <Stethoscope size={22} />
            </div>
            <div>
              <h2 id="auth-modal-title" className="mvlm-auth-title">
                Clinician Portal Access
              </h2>
              <div className="mvlm-auth-subtitle">
                HIPAA-conscious authentication for verified radiology staff
              </div>
            </div>
          </div>

          <button
            onClick={closeAuthModal}
            className="mvlm-auth-close-btn"
            title="Close dialog"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="mvlm-auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={authModalTab === "personas"}
            className={`mvlm-auth-tab ${authModalTab === "personas" ? "active" : ""}`}
            onClick={() => setAuthModalTab("personas")}
          >
            <Sparkles size={14} />
            <span>Instant Demo Personas</span>
          </button>

          <button
            role="tab"
            aria-selected={authModalTab === "signin"}
            className={`mvlm-auth-tab ${authModalTab === "signin" ? "active" : ""}`}
            onClick={() => setAuthModalTab("signin")}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>

          <button
            role="tab"
            aria-selected={authModalTab === "signup"}
            className={`mvlm-auth-tab ${authModalTab === "signup" ? "active" : ""}`}
            onClick={() => setAuthModalTab("signup")}
          >
            <UserPlus size={14} />
            <span>Register Clinician</span>
          </button>
        </div>

        {/* Body */}
        <div className="mvlm-auth-body">
          {/* TAB 1: Instant Personas */}
          {authModalTab === "personas" && (
            <div>
              <p
                style={{
                  fontSize: 12.5,
                  color: "#cbd5e1",
                  marginBottom: 16,
                  lineHeight: 1.5,
                }}
              >
                Select an authorized clinical persona to immediately access the diagnostic
                workstation with pre-loaded credentials and digital sign-off privileges:
              </p>

              <div className="mvlm-persona-list">
                {DEMO_PERSONAS.map((p) => (
                  <div
                    key={p.id}
                    className="mvlm-persona-card"
                    onClick={() => handlePersonaSelect(p.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handlePersonaSelect(p.id);
                    }}
                  >
                    <div className="mvlm-persona-left">
                      <div
                        className="mvlm-persona-avatar"
                        style={{ background: p.color || "#06b6d4" }}
                      >
                        {p.avatarInitials}
                      </div>
                      <div>
                        <div className="mvlm-persona-name">{p.name}</div>
                        <div className="mvlm-persona-meta">
                          <span>{p.role}</span>
                          <span>•</span>
                          <span>{p.specialty}</span>
                        </div>
                        <div className="mvlm-persona-inst">{p.institution}</div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="mvlm-persona-badge">{p.license}</span>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--color-cyan)",
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 4,
                        }}
                      >
                        Launch <ArrowRight size={11} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 18,
                  fontSize: 11.5,
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={14} color="#10b981" />
                <span>Simulated Institutional Credentials for Peer Review & Grading</span>
              </div>
            </div>
          )}

          {/* TAB 2: Sign In */}
          {authModalTab === "signin" && (
            <form onSubmit={handleLoginSubmit} className="mvlm-auth-form">
              {loginError && (
                <div className="mvlm-auth-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="mvlm-form-group">
                <label htmlFor="signin-email" className="mvlm-form-label">
                  Institutional Email
                </label>
                <input
                  id="signin-email"
                  type="email"
                  required
                  autoComplete="username"
                  className="mvlm-form-input"
                  placeholder="doctor.name@hospital.org"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div className="mvlm-form-group">
                <label htmlFor="signin-password" className="mvlm-form-label">
                  Security Passkey / Password
                </label>
                <input
                  id="signin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mvlm-form-input"
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="mvlm-auth-submit-btn"
              >
                {loginLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Authenticate & Access Studio</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="mvlm-demo-quick-banner">
                <div>
                  <p><strong>Evaluating this project?</strong></p>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>
                    Skip manual typing with one-click test credentials
                  </p>
                </div>
                <button
                  type="button"
                  className="mvlm-demo-quick-btn"
                  onClick={() => setAuthModalTab("personas")}
                >
                  View 3 Personas
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Register */}
          {authModalTab === "signup" && (
            <form onSubmit={handleSignupSubmit} className="mvlm-auth-form">
              {signupError && (
                <div className="mvlm-auth-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{signupError}</span>
                </div>
              )}

              <div className="mvlm-form-row">
                <div className="mvlm-form-group">
                  <label htmlFor="signup-name" className="mvlm-form-label">
                    Full Name & Title
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    className="mvlm-form-input"
                    placeholder="Dr. Jane Doe, MD"
                    value={signupData.name}
                    onChange={(e) =>
                      setSignupData({ ...signupData, name: e.target.value })
                    }
                  />
                </div>

                <div className="mvlm-form-group">
                  <label htmlFor="signup-role" className="mvlm-form-label">
                    Clinical Role
                  </label>
                  <select
                    id="signup-role"
                    className="mvlm-form-select"
                    value={signupData.role}
                    onChange={(e) =>
                      setSignupData({ ...signupData, role: e.target.value })
                    }
                  >
                    <option value="Attending Radiologist">Attending Radiologist</option>
                    <option value="Radiology Resident">Radiology Resident</option>
                    <option value="Chief of Pulmonology">Chief of Pulmonology</option>
                    <option value="Emergency Physician">Emergency Physician</option>
                    <option value="AI Clinical Fellow">AI Clinical Fellow</option>
                  </select>
                </div>
              </div>

              <div className="mvlm-form-group">
                <label htmlFor="signup-email" className="mvlm-form-label">
                  Institutional Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  autoComplete="username"
                  className="mvlm-form-input"
                  placeholder="doctor.doe@universityhospital.edu"
                  value={signupData.email}
                  onChange={(e) =>
                    setSignupData({ ...signupData, email: e.target.value })
                  }
                />
              </div>

              <div className="mvlm-form-row">
                <div className="mvlm-form-group">
                  <label htmlFor="signup-inst" className="mvlm-form-label">
                    Hospital / Institution
                  </label>
                  <input
                    id="signup-inst"
                    type="text"
                    className="mvlm-form-input"
                    placeholder="e.g. Memorial Sloan Kettering"
                    value={signupData.institution}
                    onChange={(e) =>
                      setSignupData({ ...signupData, institution: e.target.value })
                    }
                  />
                </div>

                <div className="mvlm-form-group">
                  <label htmlFor="signup-license" className="mvlm-form-label">
                    Medical License / NPI
                  </label>
                  <input
                    id="signup-license"
                    type="text"
                    className="mvlm-form-input"
                    placeholder="e.g. RAD-CA-102938"
                    value={signupData.license}
                    onChange={(e) =>
                      setSignupData({ ...signupData, license: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="mvlm-form-group">
                <label htmlFor="signup-pwd" className="mvlm-form-label">
                  Create Passkey / Password
                </label>
                <input
                  id="signup-pwd"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="mvlm-form-input"
                  placeholder="Minimum 8 characters"
                  value={signupData.password}
                  onChange={(e) =>
                    setSignupData({ ...signupData, password: e.target.value })
                  }
                />
              </div>

              <button
                type="submit"
                disabled={signupLoading}
                className="mvlm-auth-submit-btn"
              >
                {signupLoading ? (
                  <span>Registering...</span>
                ) : (
                  <>
                    <Award size={16} />
                    <span>Create Clinician Credentials</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
