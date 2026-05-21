import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [dob, setDob] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLoginMode) {
        if (!email || !password) {
          throw new Error("Please fill in all fields.");
        }
        await login(email, password);
        onClose();
      } else {
        if (!firstName || !lastName || !email || !password || !mobile || !dob) {
          throw new Error("Please fill in all fields.");
        }
        // Mobile number validation (matches backend regex: ^\+\d{1,3}\d{10}$)
        const cleanedMobile = mobile.trim();
        if (!/^\+\d{1,3}\d{10}$/.test(cleanedMobile)) {
          throw new Error("Mobile number must start with a country code followed by 10 digits (e.g. +911234567890).");
        }
        // Date of Birth validation & formatting (backend supports DD/MM/YYYY or YYYY-MM-DD)
        // If input is YYYY-MM-DD from HTML date picker, let's keep it or convert it.
        // It accepts YYYY-MM-DD directly, so that's perfect.
        const formattedDob = dob; // e.g. "1995-12-31"

        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        
        await register({
          name: fullName,
          email: email.trim(),
          password,
          mobile: cleanedMobile,
          dob: formattedDob,
        });
        onClose();
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(", "));
      } else {
        setError(detail || err.message || "An authentication error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 🔥 DARK OVERLAY */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 🔥 MODAL */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* TITLE */}
        <h2 className="text-xl font-semibold text-center text-gray-800 mb-2">
          {isLoginMode ? "Sign in to AdVid" : "Create your account"}
        </h2>

        <p className="text-center text-gray-500 text-sm mb-6">
          {isLoginMode
            ? "Welcome back! Please enter your details."
            : "Welcome! Please fill in the details to get started."}
        </p>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2 border border-red-100">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* SIGNUP FIELDS */}
          {!isLoginMode && (
            <>
              <div className="flex gap-3">
                <input
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-1/2 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <input
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-1/2 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <input
                placeholder="Mobile (e.g. +911234567890)"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 pl-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
                  required
                />
              </div>
            </>
          )}

          {/* COMMON FIELDS */}
          <input
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2 cursor-pointer disabled:bg-indigo-400"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isLoginMode ? (
              "Sign In"
            ) : (
              "Register & Get Started"
            )}
          </button>
        </form>

        {/* TOGGLE MODE */}
        <p className="text-center text-xs text-gray-500 mt-6">
          {isLoginMode ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError("");
            }}
            className="text-indigo-600 font-medium hover:underline cursor-pointer ml-1"
          >
            {isLoginMode ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;