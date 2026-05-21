import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SectionTitle from "../components/SectionTitle";

const MyGeneration = () => {

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    setPosts(savedPosts);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  //  DELETE
  const handleDelete = (id) => {
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    localStorage.setItem("posts", JSON.stringify(updated));
  };

  //  DOWNLOAD IMAGE
  const handleDownloadImage = (url) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = "image.jpg";
    link.click();
  };

  //  DOWNLOAD VIDEO
  const handleDownloadVideo = (url) => {
    if (!url) return alert("No video yet");
    const link = document.createElement("a");
    link.href = url;
    link.download = "video.mp4";
    link.click();
  };

  //  SHARE
  const handleShare = (post) => {
    navigator.clipboard.writeText(post.src);
    alert("Link copied!");
  };

  //  PUBLISH TOGGLE
  const handlePublish = (id) => {
    const updated = posts.map((p) =>
      p.id === id ? { ...p, published: !p.published } : p
    );
    setPosts(updated);
    localStorage.setItem("posts", JSON.stringify(updated));
  };

  // LOADER
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] px-6 md:px-16 py-20">

      <div className="max-w-6xl mx-auto">

        {/* HEADING */}
        <div className="mb-16 text-center">
          <SectionTitle
            text2="My Generations"
            text3="View and manage your AI-generated content"
          />
        </div>

        {posts.length === 0 ? (
          <div className="max-w-3xl mx-auto bg-white border rounded-2xl p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No generations yet
            </h2>
            <p className="text-gray-500 mb-6">
              Start creating stunning product photos today
            </p>
            <button
              onClick={() => navigate("/generate")}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg"
            >
              Create New Generation
            </button>
          </div>
        ) : (

          <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">

            {posts.map((post) => (
              <div
                key={post.id}
                className="break-inside-avoid rounded-xl bg-white shadow-sm relative"
              >

                {/* IMAGE */}
                <div className="relative group">

                  <img
                    src={post.src}
                    alt={post.name}
                    className="w-full h-auto object-cover rounded-t-xl transition duration-500 group-hover:opacity-0"
                  />

                  {/* VIDEO */}
                  {post.video && (
                    <video
                      src={post.video}
                      muted
                      loop
                      className="absolute top-0 left-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition"
                      onMouseEnter={(e) => e.target.play()}
                      onMouseLeave={(e) => e.target.pause()}
                    />
                  )}

                  {/* STATUS BADGE */}
                  <div className={`absolute top-3 left-3 text-xs px-2 py-1 rounded ${
                    post.published
                      ? "bg-green-500 text-white"
                      : "bg-yellow-400 text-black"
                  }`}>
                    {post.published ? "Published" : "Generating"}
                  </div>

                  {/* ASPECT */}
                  <div className="absolute top-3 right-12 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {post.aspect}
                  </div>

                  {/* 3 DOT MENU */}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === post.id ? null : post.id);
                      }}
                      className="bg-black/60 text-white px-2 py-1 rounded-md"
                    >
                      ⋮
                    </button>

                    {activeMenu === post.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-2 w-44 bg-[#2f2f2f]/90 backdrop-blur-md text-white rounded-xl shadow-lg p-2 space-y-1 z-50"
                      >
                        <button
                          onClick={() => handleDownloadImage(post.src)}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded"
                        >
                          Download Image
                        </button>

                        <button
                          onClick={() => handleDownloadVideo(post.video)}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded"
                        >
                          Download Video
                        </button>

                        <button
                          onClick={() => handleShare(post)}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded"
                        >
                          Share
                        </button>

                        <button
                          onClick={() => handleDelete(post.id)}
                          className="block w-full text-left px-3 py-2 text-red-400 hover:bg-gray-700 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* CONTENT */}
                <div className="p-4 space-y-2">

                  <p className="font-semibold text-gray-800">{post.name}</p>

                  <p className="text-xs text-gray-500">
                    Created: {post.date}
                  </p>

                  <p className="text-sm text-gray-600">
                    {post.description}
                  </p>

                  <p className="text-xs text-gray-400">
                    {post.prompt}
                  </p>

                  {/*  BUTTONS */}
                  <div className="flex gap-3 mt-3">

                    <button
                      onClick={() => navigate(`/result/${post.id}`)}
                      className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-100"
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => handlePublish(post.id)}
                      className={`flex-1 py-2 rounded-lg text-sm text-white ${
                        post.published
                          ? "bg-gray-500"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {post.published ? "Unpublish" : "Publish"}
                    </button>

                  </div>

                </div>

              </div>
            ))}

          </div>

        )}

      </div>
    </div>
  );
};

export default MyGeneration;