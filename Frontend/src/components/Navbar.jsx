import { MenuIcon, XIcon, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { navLinks } from "../data/navLinks";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const pathname = useLocation().pathname;
  const { isLoggedIn, user, logout, openAuthModal } = useAuth();

  const activeLinks = isLoggedIn
    ? [...navLinks, { name: "My Generations", href: "/my-generations" }]
    : navLinks;

  useEffect(() => {
    if (openMobileMenu) {
      document.body.classList.add("max-md:overflow-hidden");
    } else {
      document.body.classList.remove("max-md:overflow-hidden");
    }
  }, [openMobileMenu]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <nav
      className={`flex items-center justify-between fixed z-50 top-0 w-full px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-slate-200 bg-white/40 ${openMobileMenu ? "bg-white/80" : "backdrop-blur"}`}
    >
      {/* Logo */}
      <Link to="/">
        <img
          className="h-8 sm:h-9 md:h-6 w-auto shrink-0"
          src={logo}
          alt="Logo"
        />
      </Link>

      {/* Desktop Nav */}
      <div className="hidden items-center md:gap-8 lg:gap-9 font-medium md:flex lg:pl-20">
        {activeLinks.map((link) => (
          <NavLink
            key={link.name}
            to={link.href}
            className={({ isActive }) =>
              isActive
                ? "text-indigo-600 font-semibold transition"
                : "text-slate-600 hover:text-indigo-600 transition"
            }
          >
            {link.name}
          </NavLink>
        ))}
      </div>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center gap-6 text-lg font-medium bg-white/40 backdrop-blur-md md:hidden transition duration-300 ${openMobileMenu ? "translate-x-0" : "-translate-x-full"}`}
      >
        {activeLinks.map((link) => (
          <NavLink
            key={link.name}
            to={link.href}
            onClick={() => setOpenMobileMenu(false)}
            className={({ isActive }) =>
              isActive
                ? "text-indigo-600 font-semibold"
                : "text-slate-700 hover:text-indigo-600"
            }
          >
            {link.name}
          </NavLink>
        ))}

        {!isLoggedIn ? (
          <button
            onClick={() => {
              setOpenMobileMenu(false);
              openAuthModal("login");
            }}
            className="text-slate-700 hover:text-indigo-600 transition cursor-pointer"
          >
            Sign in
          </button>
        ) : (
          <button
            onClick={() => {
              setOpenMobileMenu(false);
              logout();
            }}
            className="text-red-600 hover:text-red-700 transition flex items-center gap-2 cursor-pointer font-semibold"
          >
            <LogOut size={18} /> Logout
          </button>
        )}

        <button
          className="aspect-square size-10 p-1 items-center justify-center bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-md flex cursor-pointer"
          onClick={() => setOpenMobileMenu(false)}
        >
          <XIcon />
        </button>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Credits / User Profile */}
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-slate-300 rounded-full px-5 py-2 text-slate-700 text-sm bg-white/70 backdrop-blur">
              Credits:
              <span className="ml-1 text-indigo-600 font-semibold">
                {user?.credits ?? 0}
              </span>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2.5 border border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-300 transition rounded-full cursor-pointer bg-white/70 backdrop-blur"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => openAuthModal("login")}
              className="hidden md:block hover:bg-slate-100 transition px-4 py-2 border border-indigo-600 rounded-md cursor-pointer"
            >
              Sign in
            </button>

            <button
              onClick={() => openAuthModal("signup")}
              className="hidden md:block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-md cursor-pointer"
            >
              Get started
            </button>
          </>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpenMobileMenu(!openMobileMenu)}
          className="md:hidden cursor-pointer"
        >
          <MenuIcon size={26} className="active:scale-90 transition" />
        </button>
      </div>
    </nav>
  );
}
