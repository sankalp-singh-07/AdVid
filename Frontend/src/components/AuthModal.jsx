import { useEffect, useMemo, useState } from "react";
import { X, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../utils/errors";

const countryCodes = [
  { label: "IN", code: "+91", digits: 10 },
  { label: "US", code: "+1", digits: 10 },
  { label: "GB", code: "+44", digits: 10 },
  { label: "AE", code: "+971", digits: 9 },
  { label: "SG", code: "+65", digits: 8 },
];

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  mobile: "",
  dob: "",
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePassword = (password) => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain one uppercase letter.";
  if (!/\d/.test(password)) return "Password must contain one digit.";
  if (!/[@$!%*?&]/.test(password)) {
    return "Password must contain one special character: @, $, !, %, *, ?, or &.";
  }
  return "";
};

const AuthModal = ({ isOpen, mode = "login", onClose }) => {
  const { login, register, setAuthModalMode } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [country, setCountry] = useState(countryCodes[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isLoginMode = mode === "login";

  const title = useMemo(
    () => (isLoginMode ? "Sign in to AdVid" : "Create your account"),
    [isLoginMode]
  );

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setShowPassword(false);
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeAndReset = () => {
    setForm(initialForm);
    setError("");
    onClose();
  };

  const getValidationError = () => {
    const email = form.email.trim();
    const password = form.password;

    if (!email || !password) return "Please enter your email and password.";
    if (!validateEmail(email)) return "Please enter a valid email address.";

    if (!isLoginMode) {
      const firstName = form.firstName.trim();
      const lastName = form.lastName.trim();
      const mobile = form.mobile.trim();

      if (!firstName || !lastName || !mobile || !form.dob) {
        return "Please fill in all required fields.";
      }

      if (firstName.length < 2) return "First name must be at least 2 characters.";
      if (!/^\d+$/.test(mobile)) return "Mobile number should contain digits only.";
      if (mobile.length !== country.digits) {
        return `${country.label} mobile numbers should be ${country.digits} digits.`;
      }

      const passwordError = validatePassword(password);
      if (passwordError) return passwordError;
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      if (isLoginMode) {
        await login(form.email.trim(), form.password);
      } else {
        await register({
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          email: form.email.trim(),
          password: form.password,
          mobile: `${country.code}${form.mobile.trim()}`,
          dob: form.dob,
        });
      }
      closeAndReset();
    } catch (err) {
      console.error(err);
      setError(formatApiError(err, "An authentication error occurred."));
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setAuthModalMode(isLoginMode ? "signup" : "login");
    setError("");
    setShowPassword(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeAndReset}
      />

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={closeAndReset}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-semibold text-center text-gray-800 mb-2">
          {title}
        </h2>

        <p className="text-center text-gray-500 text-sm mb-6">
          {isLoginMode
            ? "Welcome back. Enter your details to continue."
            : "Create your account and start with your free credits."}
        </p>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2 border border-red-100 whitespace-pre-line">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {!isLoginMode && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  className="min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoComplete="given-name"
                />
                <input
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  className="min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoComplete="family-name"
                />
              </div>

              <div className="grid grid-cols-[112px_1fr] gap-2">
                <select
                  value={country.code}
                  onChange={(e) => {
                    const selected = countryCodes.find((item) => item.code === e.target.value);
                    setCountry(selected || countryCodes[0]);
                  }}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Country code"
                >
                  {countryCodes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label} {item.code}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Mobile number"
                  value={form.mobile}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "");
                    setField("mobile", digitsOnly.slice(0, country.digits));
                  }}
                  className="min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  inputMode="numeric"
                  autoComplete="tel-national"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 pl-1" htmlFor="auth-dob">
                  Date of Birth
                </label>
                <input
                  id="auth-dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setField("dob", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
                  autoComplete="bday"
                />
              </div>
            </>
          )}

          <input
            placeholder="Email address"
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoComplete="email"
          />

          <div className="relative">
            <input
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              className="w-full border border-slate-200 rounded-lg pl-3 pr-11 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete={isLoginMode ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-indigo-600 rounded-md"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2 cursor-pointer disabled:bg-indigo-400"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isLoginMode ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          {isLoginMode ? "Don't have an account?" : "Already have an account?"}
          <button
            type="button"
            onClick={switchMode}
            className="text-indigo-600 font-medium hover:underline cursor-pointer ml-1"
          >
            {isLoginMode ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
