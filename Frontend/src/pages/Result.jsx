import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const Result = () => {

  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const allPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const foundPost = allPosts.find(p => String(p.id) === String(projectId));
    setPost(foundPost);

    return () => clearTimeout(timer);
  }, [projectId]);

  //  LOADER
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Generating result...</p>
        </div>
      </div>
    );
  }

  //  NOT FOUND
  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <p className="text-gray-500">Result not found</p>
      </div>
    );
  }

  //  DOWNLOAD IMAGE
  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = post.src;
    link.download = "image.jpg";
    link.click();
  };

  //  DOWNLOAD VIDEO
  const downloadVideo = () => {
    const videoUrl = post.video || "/videos/demo.mp4";

    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = "video.mp4";
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] px-6 md:px-16 py-20">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-semibold text-gray-800">
            Generation Result
          </h1>

          <button
            onClick={() => navigate("/generate")}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            New Generation
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-10">

          {/*  IMAGE + VIDEO */}
          <div className="relative group rounded-xl overflow-hidden bg-white shadow-sm h-[400px]">

            {/* IMAGE */}
            <img
              src={post.src}
              alt={post.name}
              className="w-full h-full object-contain absolute top-0 left-0 transition duration-500 group-hover:opacity-0"
            />

            {/* VIDEO (ALWAYS render) */}
            <video
              src={post.video || "/videos/demo.mp4"}
              muted
              loop
              className="w-full h-full object-contain absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition duration-500"
              onMouseEnter={(e) => e.target.play()}
              onMouseLeave={(e) => e.target.pause()}
            />

          </div>

          {/* RIGHT PANEL */}
          <div className="space-y-6">

            {/* ACTIONS */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">

              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                Actions
              </h2>

              <div className="space-y-3">

                <button
                  onClick={downloadImage}
                  className="w-full text-left bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-lg transition"
                >
                  Download Image
                </button>

                <button
                  onClick={downloadVideo}
                  className="w-full text-left bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-lg transition"
                >
                  Download Video
                </button>

              </div>
            </div>

            {/* INFO */}
            <div className="bg-white rounded-xl p-6 shadow-sm border space-y-2">

              <p className="font-semibold text-gray-800 text-lg">
                {post.name}
              </p>

              <p className="text-sm text-gray-500">
                Created: {post.date}
              </p>

              <p className="text-sm text-gray-600">
                {post.description}
              </p>

              <p className="text-xs text-gray-400">
                {post.prompt}
              </p>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Result;