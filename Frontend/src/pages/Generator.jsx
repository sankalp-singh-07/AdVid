import { useState } from "react";
import SectionTitle from "../components/SectionTitle";
import UploadZone from "../components/UploadZone";
import AspectRatioSelector from "../components/AspectRatioSelector";
import { Wand2 } from "lucide-react";

const Generator = () => {

  // ALL STATES
  const [name, setName] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");

  const [productImage, setProductImage] = useState(null);
  const [modelImage, setModelImage] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");

  // HANDLE GENERATE
  const handleGenerate = async () => {
    setIsGenerating(true); // start loading

    console.log({
      name,
      productName,
      productDescription,
      aspectRatio,
      userPrompt,
      productImage,
      modelImage
    });

    // fake delay (API simulate)
    setTimeout(() => {
      setIsGenerating(false); // stop loading
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-12 mt-3">
      <form className="max-w-5xl mx-auto mb-40">

        <SectionTitle
          text2="Create In-Context Image"
          text3="Upload your model and product image to generate stunning video, short-form video and social media posts."
        />

        <div className="flex flex-col md:flex-row gap-10 items-start justify-between w-full">

          {/*  LEFT */}
          <div className="flex flex-col w-full md:w-1/3 gap-6 mt-8">
            <UploadZone title="Product Image" onFileSelect={setProductImage} />
            <UploadZone title="Model Image" onFileSelect={setModelImage} />
          </div>

          {/*  RIGHT */}
          <div className="w-full md:w-2/3 mt-8">

            {/* Project Name */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name your project"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Product Name */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter the name of the product"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Description */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Description (optional)
              </label>
              <textarea
                rows={3}
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Enter the description of the product"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Aspect Ratio */}
            <AspectRatioSelector
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
            />

            {/* User Prompt */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Prompt
              </label>

              <textarea
                rows={3}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g. Create a luxury perfume ad with soft lighting and cinematic background"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
              />
            </div>

            {/*  Generate Button with Spinner */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                <Wand2 size={18} />
                Generate
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