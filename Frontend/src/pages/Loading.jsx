import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Loading = () => {

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/"); 
    }, 6000); 

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">

      <div className="flex flex-col items-center gap-4">

        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>

        {/* Text */}
        <p className="text-gray-500 text-sm">
          Please wait, loading...
        </p>

      </div>

    </div>
  );
};

export default Loading;