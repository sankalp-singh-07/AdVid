export default function AspectRatioSelector({ aspectRatio, setAspectRatio }) {
  const options = [
    { label: "9:16", value: "9:16" },
    { label: "16:9", value: "16:9" },
  ];

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-gray-700 mb-2">
        Aspect Ratio
      </p>

      <div className="flex gap-4">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setAspectRatio(opt.value)}
            className={`w-12 h-12 rounded-lg border flex items-center justify-center
              ${
                aspectRatio === opt.value
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-300"
              }`}
          >
            {opt.value === "9:16" ? "📱" : "🖥️"}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Selected: {aspectRatio}
      </p>
    </div>
  );
}
