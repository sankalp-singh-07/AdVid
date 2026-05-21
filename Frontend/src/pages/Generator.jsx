import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SectionTitle from "../components/SectionTitle";
import UploadZone from "../components/UploadZone";
import AspectRatioSelector from "../components/AspectRatioSelector";
import { Wand2 } from "lucide-react";

const Generator = () => {

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");

  const [productImage, setProductImage] = useState(null);
  const [modelImage, setModelImage] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");

  // FIXED GENERATE FUNCTION
  const handleGenerate = () => {
    console.log("CLICKED ✅"); // 

    setIsGenerating(true);

    setTimeout(() => {

      const newPost = {
        id: "gen_" + Date.now(),
        src: productImage
          ? URL.createObjectURL(productImage)
          : "/images/img1.jpg",

        name: productName || "Test Product",
        date: new Date().toLocaleString(),
        aspect: aspectRatio,
        description: productDescription || "Test description",
        prompt: userPrompt || "Test prompt",
        status: "Generated"
      };

      //  IMPORTANT FIX (safe parse)
      let oldPosts = [];
      try {
        oldPosts = JSON.parse(localStorage.getItem("posts")) || [];
      } catch {
        oldPosts = [];
      }

      const updatedPosts = [newPost, ...oldPosts];

      // SAVE
      localStorage.setItem("posts", JSON.stringify(updatedPosts));

      console.log("SAVED DATA 👉", updatedPosts); // 

      setIsGenerating(false);

      // REDIRECT
      navigate("/my-generations");

    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-12 mt-3">

      {/*  IMPORTANT FIX */}
      <form
        className="max-w-5xl mx-auto mb-40"
        onSubmit={(e) => e.preventDefault()}   // 
      >

        <SectionTitle
          text2="Create In-Context Image"
          text3="Upload your model and product image to generate stunning video..."
        />

        <div className="flex flex-col md:flex-row gap-10 items-start justify-between w-full">

          {/* LEFT */}
          <div className="flex flex-col w-full md:w-1/3 gap-6 mt-8">
            <UploadZone title="Product Image" onFileSelect={setProductImage} />
            <UploadZone title="Model Image" onFileSelect={setModelImage} />
          </div>

          {/* RIGHT */}
          <div className="w-full md:w-2/3 mt-8">

            <div className="mb-5">
              <label className="text-sm text-gray-700">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <div className="mb-5">
              <label className="text-sm text-gray-700">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <div className="mb-5">
              <label className="text-sm text-gray-700">Description</label>
              <textarea
                rows={3}
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <AspectRatioSelector
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
            />

            <div className="mt-6">
              <label className="text-sm text-gray-700">Prompt</label>
              <textarea
                rows={3}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg flex items-center justify-center gap-2"
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