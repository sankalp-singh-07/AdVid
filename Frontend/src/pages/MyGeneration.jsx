import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SectionTitle from "../components/SectionTitle";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const MyGeneration = () => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);

  const navigate = useNavigate();
  const { isLoggedIn, openAuthModal } = useAuth();

  const fetchProjects = async () => {
    try {
      const response = await api.get("/projects");
      setPosts(response.data.projects || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchProjects();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project? This will remove it from the database and public feed.")) return;
    try {
      await api.delete(`/projects/${id}`);
      setPosts(posts.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete project.");
    }
  };

  const handleDownloadImage = async (url, name) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobURL = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobURL;
      link.download = `${name.replace(/\s+/g, "_")}_image.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobURL);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleDownloadVideo = async (url, name) => {
    if (!url) return alert("No video yet generated for this project. View details to generate one.");
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobURL = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobURL;
      link.download = `${name.replace(/\s+/g, "_")}_video.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobURL);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleShare = (post) => {
    const shareUrl = `${window.location.origin}/result/${post.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Project result link copied to clipboard!");
  };

  const handlePublish = async (id) => {
    try {
      const response = await api.patch(`/projects/${id}/visibility`);
      setPosts(posts.map((p) => (p.id === id ? response.data : p)));
    } catch (err) {
      console.error(err);
      alert("Failed to update visibility.");
    }
  };

  // AUTH REQUIRED STATE
  if (!isLoggedIn) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-[#f9fafb] mt-12">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
            🔒
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-500 mb-8">
            Please sign in or create an account to view and manage your generated image and video showcases.
          </p>
          <button
            onClick={() => openAuthModal("login")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition cursor-pointer shadow-lg hover:shadow-indigo-200"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  // LOADER
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] px-6 md:px-16 py-20 mt-12">
      <div className="max-w-6xl mx-auto">
        {/* HEADING */}
        <div className="mb-16 text-center">
          <SectionTitle
            text2="My Generations"
            text3="View and manage your AI-generated content"
          />
        </div>

        {posts.length === 0 ? (
          <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No generations yet
            </h2>
            <p className="text-gray-500 mb-6">
              Start creating stunning product photos today
            </p>
            <button
              onClick={() => navigate("/generate")}
              className="bg-indigo-600 hover:bg-indigo-750 text-white px-6 py-3 rounded-lg transition font-medium cursor-pointer"
            >
              Create New Generation
            </button>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="break-inside-avoid rounded-xl bg-white shadow-sm relative border border-slate-100 hover:shadow-md transition"
              >
                {/* IMAGE */}
                <div className="relative group overflow-hidden rounded-t-xl">
                  <img
                    src={post.combined_image_url}
                    alt={post.name}
                    className="w-full h-auto object-cover rounded-t-xl transition duration-500 group-hover:scale-[1.02]"
                  />

                  {/* VIDEO */}
                  {post.video_url && (
                    <video
                      src={post.video_url}
                      muted
                      loop
                      className="absolute top-0 left-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition duration-300"
                      onMouseEnter={(e) => e.target.play()}
                      onMouseLeave={(e) => e.target.pause()}
                    />
                  )}

                  {/* STATUS BADGE */}
                  <div className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    post.is_published
                      ? "bg-green-500 text-white"
                      : "bg-slate-500 text-white"
                  }`}>
                    {post.is_published ? "Published" : "Private"}
                  </div>

                  {/* ASPECT */}
                  <div className="absolute top-3 right-12 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                    {post.aspect_ratio || "9:16"}
                  </div>

                  {/* 3 DOT MENU */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === post.id ? null : post.id);
                      }}
                      className="bg-black/60 hover:bg-black/80 text-white px-2 py-0.5 rounded-md cursor-pointer font-bold"
                    >
                      ⋮
                    </button>

                    {activeMenu === post.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-2 w-44 bg-[#2f2f2f]/90 backdrop-blur-md text-white rounded-xl shadow-lg p-2 space-y-1 z-50 text-xs"
                      >
                        <button
                          onClick={() => handleDownloadImage(post.combined_image_url, post.name)}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded cursor-pointer"
                        >
                          Download Image
                        </button>

                        <button
                          onClick={() => handleDownloadVideo(post.video_url, post.name)}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded cursor-pointer"
                        >
                          Download Video
                        </button>

                        <button
                          onClick={() => handleShare(post)}
                          className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded cursor-pointer"
                        >
                          Share Link
                        </button>

                        <button
                          onClick={() => handleDelete(post.id)}
                          className="block w-full text-left px-3 py-2 text-red-400 hover:bg-gray-700 rounded cursor-pointer font-medium"
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

                  <p className="text-[10px] text-gray-450">
                    Created: {new Date(post.created_at).toLocaleString()}
                  </p>

                  {post.product_description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {post.product_description}
                    </p>
                  )}

                  {post.user_prompt && (
                    <p className="text-xs text-gray-400 italic truncate">
                      "{post.user_prompt}"
                    </p>
                  )}

                  {/*  BUTTONS */}
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => navigate(`/result/${post.id}`)}
                      className="flex-1 border border-slate-200 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer text-slate-700"
                    >
                      Details & Video
                    </button>

                    <button
                      onClick={() => handlePublish(post.id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold text-white transition cursor-pointer ${
                        post.is_published
                          ? "bg-slate-400 hover:bg-slate-500"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {post.is_published ? "Unpublish" : "Publish"}
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
