import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import SectionTitle from "../components/SectionTitle";
import UploadZone from "../components/UploadZone";
import AspectRatioSelector from "../components/AspectRatioSelector";
import { Wand2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { formatApiError } from "../utils/errors";

const Generator = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user, refreshUser, openAuthModal } = useAuth();

  const [name, setName] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");

  const [productImage, setProductImage] = useState(null);
  const [modelImage, setModelImage] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [error, setError] = useState("");

  if (!isLoggedIn) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-[#f9fafb] mt-12">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
            🔒
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-500 mb-8">
            Create an account or sign in to start generating high-quality context-aware images and video showcases for your products.
          </p>
          <button
            onClick={() => openAuthModal("signup")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition cursor-pointer shadow-lg hover:shadow-indigo-200"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError("");

    if (!productImage) {
      setError("Please upload a Product Image.");
      return;
    }
    if (!modelImage) {
      setError("Please upload a Model Image.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter a Project Name.");
      return;
    }

    if (user.credits < 5) {
      setError("Insufficient credits. You need at least 5 credits to generate a combined image.");
      return;
    }

    setIsGenerating(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("aspect_ratio", aspectRatio);
      
      if (productName.trim()) {
        formData.append("product_name", productName.trim());
      }
      if (productDescription.trim()) {
        formData.append("product_description", productDescription.trim());
      }
      if (userPrompt.trim()) {
        formData.append("user_prompt", userPrompt.trim());
      }
      
      formData.append("image1", productImage);
      formData.append("image2", modelImage);

      const response = await api.post("/projects", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Sync credit balance
      await refreshUser();

      // Redirect to result page
      navigate(`/result/${response.data.id}`);
    } catch (err) {
      console.error(err);
      setError(formatApiError(
        err,
        "Failed to generate project. Please check backend service connectivity."
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6 md:p-12 mt-12">
      <form
        className="max-w-5xl mx-auto mb-40 bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-100"
        onSubmit={handleGenerate}
      >
        <SectionTitle
          text2="Create In-Context Image"
          text3="Upload your model and product image to generate stunning video showcases."
        />

        {error && (
          <div className="mt-6 bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-start gap-2.5 border border-red-100">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
              {user?.credits < 5 && (
                <div className="mt-1">
                  <Link to="/plans" className="text-indigo-600 font-semibold hover:underline">
                    Get more credits &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-10 items-start justify-between w-full mt-6">
          {/* LEFT */}
          <div className="flex flex-col w-full md:w-1/3 gap-6">
            <UploadZone title="Product Image" onFileSelect={setProductImage} />
            <UploadZone title="Model Image" onFileSelect={setModelImage} />
          </div>

          {/* RIGHT */}
          <div className="w-full md:w-2/3">
            <div className="mb-5">
              <label className="text-sm font-semibold text-gray-700 block mb-1">Project Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer Hoodie Ad Showcase"
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="mb-5">
              <label className="text-sm font-semibold text-gray-700 block mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Classic Oversized Hoodie"
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="mb-5">
              <label className="text-sm font-semibold text-gray-700 block mb-1">Product Description</label>
              <textarea
                rows={3}
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe key features, styling, and material of the product..."
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <AspectRatioSelector
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
            />

            <div className="mt-6">
              <label className="text-sm font-semibold text-gray-700 block mb-1">Generation Prompt / Concept</label>
              <textarea
                rows={3}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g. Walking down a sunlit street in Milan, soft summer breeze, photorealistic cinematic lighting..."
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Generating combined image will cost <span className="font-semibold text-indigo-600">5 credits</span>.
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-indigo-700 transition cursor-pointer shadow-md hover:shadow-indigo-100 disabled:bg-indigo-400"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Combining & Processing Images...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Combine Images (Costs 5 Credits)
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Generator;
