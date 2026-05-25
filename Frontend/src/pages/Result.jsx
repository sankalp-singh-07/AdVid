import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { AlertCircle, ArrowLeft, Download, Video } from "lucide-react";

const Result = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [videoError, setVideoError] = useState("");

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
      setError("");
      setLoading(false);
      return response.data;
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(detail || "Failed to fetch project details.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  // Polling for video generation completion
  useEffect(() => {
    let intervalId;
    if (project?.is_generating_video) {
      intervalId = setInterval(async () => {
        const updated = await fetchProject();
        if (updated && !updated.is_generating_video) {
          // Completed generation, sync user credits
          refreshUser();
          clearInterval(intervalId);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [project?.is_generating_video]);

  const handleGenerateVideo = async () => {
    if (!project) return;
    if (user?.credits < 10) {
      setVideoError("Insufficient credits. Video generation requires 10 credits.");
      return;
    }
    setVideoError("");

    try {
      // Optimistic state update
      setProject((prev) => ({ ...prev, is_generating_video: true }));
      await api.post(`/projects/${projectId}/generate-video`, {
        combined_image_url: project.combined_image_url,
      });
      await fetchProject();
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setVideoError(detail || "Failed to trigger video generation.");
      await fetchProject();
    }
  };

  const downloadImage = async () => {
    if (!project?.combined_image_url) return;
    try {
      const response = await fetch(project.combined_image_url);
      const blob = await response.blob();
      const blobURL = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobURL;
      link.download = `${project.name.replace(/\s+/g, "_")}_image.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobURL);
    } catch {
      window.open(project.combined_image_url, "_blank");
    }
  };

  const downloadVideo = async () => {
    if (!project?.video_url) return;
    try {
      const response = await fetch(project.video_url);
      const blob = await response.blob();
      const blobURL = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobURL;
      link.download = `${project.name.replace(/\s+/g, "_")}_video.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobURL);
    } catch {
      window.open(project.video_url, "_blank");
    }
  };

  // LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm">Fetching generation result...</p>
        </div>
      </div>
    );
  }

  // NOT FOUND / ERROR STATE
  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f9fafb] p-6">
        <AlertCircle size={40} className="text-red-500 mb-4" />
        <p className="text-gray-700 font-semibold mb-4 text-center">{error || "Project not found"}</p>
        <button
          onClick={() => navigate("/my-generations")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg transition"
        >
          Go to Generations
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] px-6 md:px-16 py-20 mt-12">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div className="flex items-center gap-3">
            <Link
              to="/my-generations"
              className="p-2 bg-white border border-slate-200 text-gray-600 hover:text-indigo-600 rounded-lg transition"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
              Generation Result
            </h1>
          </div>

          <button
            onClick={() => navigate("/generate")}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium cursor-pointer"
          >
            New Generation
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* MEDIA BOX */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg min-h-[450px] flex items-center justify-center">
            {project.is_generating_video ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="font-semibold text-lg animate-pulse text-indigo-450">Generating Video Showcase...</h3>
                <p className="text-xs text-slate-400 mt-2 max-w-xs">
                  We are building a dynamic video showcase using Veo. This process can take 20-30 seconds. Feel free to wait or check back later!
                </p>
              </div>
            ) : project.video_url ? (
              <video
                src={project.video_url}
                controls
                autoPlay
                loop
                className="w-full h-full max-h-[500px] object-contain"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={project.combined_image_url}
                  alt={project.name}
                  className="w-full h-full max-h-[500px] object-contain"
                />
                <span className="absolute bottom-4 right-4 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur">
                  Combined Image
                </span>
              </div>
            )}
          </div>

          {/* RIGHT DETAILS PANEL */}
          <div className="space-y-6">
            {/* ACTIONS */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                Actions
              </h2>

              {videoError && (
                <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2 border border-red-100">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{videoError}</span>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={downloadImage}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium px-4 py-3 rounded-xl transition cursor-pointer border border-slate-150"
                >
                  <span className="flex items-center gap-2">
                    <Download size={18} className="text-indigo-600" />
                    Download Combined Image
                  </span>
                </button>

                {project.video_url ? (
                  <button
                    onClick={downloadVideo}
                    className="w-full flex items-center justify-between bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-4 py-3 rounded-xl transition cursor-pointer border border-indigo-100"
                  >
                    <span className="flex items-center gap-2">
                      <Download size={18} className="text-indigo-600" />
                      Download Video Showcase
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateVideo}
                    disabled={project.is_generating_video}
                    className="w-full flex items-center justify-between bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-3 rounded-xl transition cursor-pointer disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      <Video size={18} />
                      {project.is_generating_video ? "Generating Video..." : "Generate Video Showcase"}
                    </span>
                    <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full font-semibold">
                      Costs 10 Credits
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* METADATA INFO */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Project Name</h3>
                <p className="font-semibold text-gray-800 text-lg mt-0.5">{project.name}</p>
              </div>

              {project.product_name && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Name</h3>
                  <p className="text-sm text-gray-700 mt-0.5">{project.product_name}</p>
                </div>
              )}

              {project.product_description && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</h3>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{project.product_description}</p>
                </div>
              )}

              {project.user_prompt && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Concept Prompt</h3>
                  <p className="text-xs text-slate-500 italic mt-0.5 leading-relaxed">"{project.user_prompt}"</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs text-slate-400">
                <span>Aspect Ratio: {project.aspect_ratio || "9:16"}</span>
                <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;
