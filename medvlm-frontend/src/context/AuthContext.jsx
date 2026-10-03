import { createContext, useContext, useState, useEffect } from "react";

const AUTH_STORAGE_KEY = "medvlm_auth_user";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Pre-configured Verified Clinician Personas for instant demo evaluation
export const DEMO_PERSONAS = [
  {
    id: "demo-dr-chen",
    email: "sarah.chen@stanford.med",
    name: "Dr. Sarah Chen, MD",
    role: "Attending Radiologist",
    specialty: "Thoracic Imaging",
    institution: "Stanford Medical Imaging Network",
    license: "RAD-CA-409182",
    npi: "1948201948",
    avatarInitials: "SC",
    color: "#06b6d4",
    department: "Department of Radiology & Nuclear Medicine",
  },
  {
    id: "demo-dr-vance",
    email: "marcus.vance@jhmi.edu",
    name: "Dr. Marcus Vance, MD",
    role: "Chief of Pulmonology",
    specialty: "Pulmonary & Critical Care",
    institution: "Johns Hopkins Medicine",
    license: "PULM-MD-782014",
    npi: "1205938491",
    avatarInitials: "MV",
    color: "#0284c7",
    department: "Division of Pulmonary Medicine",
  },
  {
    id: "demo-dr-rostova",
    email: "e.rostova@mayo.edu",
    name: "Dr. Elena Rostova, MD",
    role: "Diagnostic Radiology Fellow",
    specialty: "Cardiothoracic Radiology",
    institution: "Mayo Clinic Rochester",
    license: "RAD-MN-119403",
    npi: "1839204857",
    avatarInitials: "ER",
    color: "#10b981",
    department: "Thoracic Radiology Fellowship Program",
  },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load user from localStorage:", e);
    }
    // Default to the first demo persona so studio is ready out of the box
    return DEMO_PERSONAS[0];
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("signin"); // "signin" | "signup" | "personas"

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to persist user to localStorage:", e);
    }
  }, [user]);

  const loginWithPersona = (personaId) => {
    const persona = DEMO_PERSONAS.find((p) => p.id === personaId) || DEMO_PERSONAS[0];
    setUser(persona);
    setAuthModalOpen(false);
    return persona;
  };

  const loginWithCredentials = async (email, password) => {
    // 1. Check if matches one of demo personas
    const matchedPersona = DEMO_PERSONAS.find(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (matchedPersona) {
      setUser(matchedPersona);
      setAuthModalOpen(false);
      return { success: true, user: matchedPersona };
    }

    // 2. Try backend authentication if available
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setAuthModalOpen(false);
        return { success: true, user: data.user };
      }
    } catch {
      // Backend offline: generate realistic clinician profile
    }

    // 3. Fallback client-side simulated auth for any valid input
    const nameFromEmail = email.split("@")[0].replace(/[^a-zA-Z]/g, " ");
    const formattedName =
      "Dr. " +
      nameFromEmail
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") +
      ", MD";

    const customUser = {
      id: "user-" + Date.now(),
      email: email.trim(),
      name: formattedName.length > 6 ? formattedName : "Dr. Medical Evaluator, MD",
      role: "Attending Radiologist",
      specialty: "Diagnostic Radiology",
      institution: "Metropolitan Academic Medical Center",
      license: "RAD-" + Math.floor(100000 + Math.random() * 900000),
      npi: String(Math.floor(1000000000 + Math.random() * 9000000000)),
      avatarInitials: "DR",
      color: "#06b6d4",
      department: "Diagnostic Radiology Services",
    };

    setUser(customUser);
    setAuthModalOpen(false);
    return { success: true, user: customUser };
  };

  const registerUser = async (formData) => {
    const initials = formData.name
      ? formData.name
          .replace(/^Dr\.\s*/i, "")
          .split(" ")
          .filter(Boolean)
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "MD";

    const newUser = {
      id: "user-" + Date.now(),
      email: formData.email.trim(),
      name: formData.name.startsWith("Dr.") ? formData.name : `Dr. ${formData.name}`,
      role: formData.role || "Radiologist",
      specialty: formData.specialty || "Diagnostic Radiology",
      institution: formData.institution || "Memorial Health Center",
      license: formData.license || "RAD-US-" + Math.floor(100000 + Math.random() * 900000),
      npi: formData.npi || String(Math.floor(1000000000 + Math.random() * 9000000000)),
      avatarInitials: initials || "MD",
      color: "#06b6d4",
      department: formData.department || "Radiology & Imaging Sciences",
    };

    // Attempt backend registration
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newUser,
          password: formData.password,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setAuthModalOpen(false);
          return { success: true, user: data.user };
        }
      }
    } catch {
      // Backend offline, fallback locally
    }

    setUser(newUser);
    setAuthModalOpen(false);
    return { success: true, user: newUser };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const openAuthModal = (tab = "signin") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authModalOpen,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
        loginWithPersona,
        loginWithCredentials,
        registerUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
