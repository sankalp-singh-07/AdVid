import { Link } from "react-router-dom";
import { navLinks } from "../data/navLinks";
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
                        className="flex items-center gap-2"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6D5DFC] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            I
                        </div>
                        <span className="font-extrabold text-xl tracking-tight text-slate-800">
                            Intellect<span className="text-[#6D5DFC]">RAG</span>
                        </span>
                    </Link>

                    <p className="mt-6">
                        Secure, enterprise-grade AI Document Reader and Knowledge Assistant.
                        Upload documents, ask questions in natural language, and retrieve accurate answers with complete source citations.
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
                            <p>+1-800-KNOW-RAG</p>
                            <p>support@intellectrag.com</p>
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
                    IntellectRAG
                </Link>. All Rights Reserved.
            </p>
        </footer>
    );
}