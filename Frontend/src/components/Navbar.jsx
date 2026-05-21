import { MenuIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { navLinks } from "../data/navLinks";
import logo from "../assets/logo.png";

export default function Navbar() {

    const [openMobileMenu, setOpenMobileMenu] = useState(false);

    const pathname = useLocation().pathname;

    // CHANGE THIS
    const isLoggedIn = false;

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

        <nav className={`flex items-center justify-between fixed z-50 top-0 w-full px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-slate-200 bg-white/40 ${openMobileMenu ? 'bg-white/80' : 'backdrop-blur'}`}>

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

                {navLinks.map((link) => (

                    <NavLink
                        key={link.name}
                        to={link.href}
                        className="hover:text-indigo-600"
                    >
                        {link.name}
                    </NavLink>

                ))}

            </div>

            {/* Mobile menu */}
            <div className={`fixed inset-0 flex flex-col items-center justify-center gap-6 text-lg font-medium bg-white/40 backdrop-blur-md md:hidden transition duration-300 ${openMobileMenu ? "translate-x-0" : "-translate-x-full"}`}>

                {navLinks.map((link) => (

                    <NavLink
                        key={link.name}
                        to={link.href}
                        onClick={() => setOpenMobileMenu(false)}
                    >
                        {link.name}
                    </NavLink>

                ))}

                {!isLoggedIn && (
                    <button>
                        Sign in
                    </button>
                )}

                <button
                    className="aspect-square size-10 p-1 items-center justify-center bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-md flex"
                    onClick={() => setOpenMobileMenu(false)}
                >
                    <XIcon />
                </button>

            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">

                {/* Credits */}
                {isLoggedIn ? (

                    <div className="flex items-center border border-slate-300 rounded-full px-5 py-2 text-slate-700 text-sm bg-white/70 backdrop-blur">

                        Credits:
                        <span className="ml-1 text-indigo-600 font-semibold">
                            10
                        </span>

                    </div>

                ) : (

                    <>
                        <button className="hidden md:block hover:bg-slate-100 transition px-4 py-2 border border-indigo-600 rounded-md">
                            Sign in
                        </button>

                        <button className="hidden md:block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-md">
                            Get started
                        </button>
                    </>

                )}

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setOpenMobileMenu(!openMobileMenu)}
                    className="md:hidden"
                >
                    <MenuIcon size={26} className="active:scale-90 transition" />
                </button>

            </div>

        </nav>

    );
}