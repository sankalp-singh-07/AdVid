import { useState, useEffect } from "react";
import SectionTitle from "../components/SectionTitle";

const Community = () => {

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  //  UPDATED DATA
  const posts = [
    {
      id: 1,
      src: "/images/img1.jpg",
      name: "Goggles",
      date: "15/3/2023",
      aspect: "9:16",
      description: "Sky Colored Trolly Bag",
      prompt: "Create the video where center of attraction is a trolly bag",
    },
    {
      id: 2,
      src: "/images/img2.jpg",
      name: "Headphones",
      date: "18/3/2023",
      aspect: "16:9",
      description: "Modern Wireless Headphones",
      prompt: "Emphasize the comfort and sound quality",
    },
    {
      id: 3,
      src: "/images/img3.jpg",
      name: "Polaroid Camera",
      date: "17/3/2023",
      aspect: "9:16",
      description: "Classic Polaroid Camera",
      prompt: "Highlight the vintage appeal of camera",
    },
    {
      id: 4,
      src: "/images/img4.jpg",
      name: "Sneakers",
      date: "20/3/2023",
      aspect: "16:9",
      description: "Trendy Sneakers",
      prompt: "Focus on comfort and street style",
    },
    {
      id: 5,
      src: "/images/img5.jpg",
      name: "Watch",
      date: "21/3/2023",
      aspect: "16:9",
      description: "Luxury Watch",
      prompt: "Show premium feel with cinematic lighting",
    },
    {
      id: 6,
      src: "/images/img6.jpg",
      name: "iPhone",
      date: "22/3/2023",
      aspect: "9:16",
      description: "iPhone Camera",
      prompt: "Highlight camera quality and aesthetics",
    },
  ];

  //  LOADER
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] px-6 md:px-16 py-20">

      <div className="max-w-6xl mx-auto">

        {/* Heading */}
        <div className="mb-16 text-center">
          <SectionTitle
            text2="Community"
            text3="See what others are creating with AdVid"
          />
        </div>

        {/* GRID */}
        <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">

          {posts.map((post) => (
            <div
              key={post.id}
              className="break-inside-avoid rounded-xl overflow-hidden bg-white shadow-sm"
            >
            
              {/* IMAGE */}
              <div className="relative overflow-hidden group">
                <img
                  src={post.src}
                  alt={post.name}
                  className="w-full h-auto object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-75"
                />

                {/* ASPECT BADGE */}
                <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {post.aspect}
                </div>
              </div>
          
              {/* CONTENT (ALWAYS VISIBLE) */}
              <div className="p-4 space-y-1">
          
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
          
              </div>
          
            </div>
          ))}

        </div>

      </div>
    </div>
  );
};

export default Community;