import { X } from "lucide-react";

const AuthModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      {/* 🔥 DARK OVERLAY */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 🔥 MODAL */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>

        {/* TITLE */}
        <h2 className="text-xl font-semibold text-center text-gray-800 mb-2">
          Create your account
        </h2>

        <p className="text-center text-gray-500 text-sm mb-6">
          Welcome! Please fill in the details to get started.
        </p>

        {/* GOOGLE BUTTON */}
        <button className="w-full border rounded-lg py-2 mb-4 hover:bg-gray-50">
          Continue with Google
        </button>

        <div className="text-center text-gray-400 text-sm mb-4">or</div>

        {/* INPUTS */}
        <div className="flex gap-3 mb-3">
          <input
            placeholder="First name"
            className="w-1/2 border rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Last name"
            className="w-1/2 border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <input
          placeholder="Email address"
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
        />

        <input
          placeholder="Password"
          type="password"
          className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
        />

        {/* BUTTON */}
        <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">
          Continue
        </button>

        {/* FOOTER */}
        <p className="text-center text-xs text-gray-500 mt-4">
          Already have an account? <span className="text-indigo-600">Sign in</span>
        </p>

      </div>
    </div>
  );
};

export default AuthModal;