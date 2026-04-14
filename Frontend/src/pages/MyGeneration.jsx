import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SectionTitle from "../components/SectionTitle";

const MyGeneration = () => {

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    setPosts(savedPosts);

    return () => clearTimeout(timer);
  }, []);

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

        {/* Heading */}
        <div className="mb-16 text-center">
          <SectionTitle
            text2="My Generations"
            text3="View and manage your AI-generated content"
          />
        </div>

        {/* EMPTY STATE */}
        {posts.length === 0 ? (
          <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">

            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No generations yet
            </h2>

            <p className="text-gray-500 mb-6">
              Start creating stunning product photos today
            </p>

            <button
              onClick={() => navigate("/generate")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition"
            >
              Create New Generation
            </button>

          </div>
        ) : (

          /* GRID */
          <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">

            {posts.map((post) => (
              <div
                key={post.id}
                className="break-inside-avoid rounded-xl overflow-hidden bg-white shadow-sm"
              >

                {/* IMAGE */}
                <div className="relative group overflow-hidden">

                  <img
                    src={post.src}
                    alt={post.name}
                    className="w-full h-auto object-cover transition duration-500 group-hover:opacity-0"
                  />

                  {/* VIDEO (future) */}
                  {post.video && (
                    <video
                      src={post.video}
                      muted
                      loop
                      className="absolute top-0 left-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition duration-500"
                      onMouseEnter={(e) => e.target.play()}
                      onMouseLeave={(e) => e.target.pause()}
                    />
                  )}

                  {/* ASPECT */}
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {post.aspect}
                  </div>

                </div>

                {/* CONTENT */}
                <div className="p-4 space-y-1">

                  <p className="font-semibold text-gray-800">
                    {post.name}
                  </p>

                  <p className="text-xs text-gray-500">
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
            ))}

          </div>

        )}

      </div>
    </div>
  );
};

export default MyGeneration;