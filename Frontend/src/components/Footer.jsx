import { Link } from "react-router-dom";
import { navLinks } from "../data/navLinks";
import logo from "../assets/logo.png";

export default function Footer() {
    return (
        <footer className="px-6 md:px-16 lg:px-24 xl:px-32 mt-40 w-full text-slate-500">
            <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-gray-200 pb-6">

                <div className="md:max-w-114">
                    <Link
                        to={"/"}
                        onClick={() =>
                            window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                            })
                        }
                    >
                        <img
                            className="h-9 md:h-9.5 w-auto shrink-0"
                            src={logo}
                            alt="Logo"
                            width={140}
                            height={40}
                            fetchPriority="high"
                        />
                    </Link>

                    <p className="mt-6">
                        Create high-converting ad videos from your product images using AI.
                        Designed for creators, marketers, and businesses to launch ads
                        faster and smarter.
                    </p>
                </div>

                <div className="flex-1 flex items-start md:justify-end gap-20">

                    <div>
                        <h2 className="font-semibold mb-5 text-gray-800">
                            Company
                        </h2>

                        <ul className="space-y-2">
                            {navLinks.map((link, index) => (
                                <li key={index}>
                                    <Link
                                        to={link.href}
                                        className="hover:text-indigo-600"
                                        onClick={() =>
                                            window.scrollTo({
                                                top: 0,
                                                behavior: "smooth",
                                            })
                                        }
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h2 className="font-semibold mb-5 text-gray-800">
                            Get in touch
                        </h2>

                        <div className="space-y-2">
                            <p>+91-114-214-1714</p>
                            <p>advid@example.com</p>
                        </div>
                    </div>

                </div>
            </div>

            <p className="pt-4 text-center pb-5">
                © {new Date().getFullYear()}{" "}
                <Link
                    to={"/"}
                    onClick={() =>
                        window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                        })
                    }
                >
                    AdVid
                </Link>. All Rights Reserved.
            </p>
        </footer>
    );
}