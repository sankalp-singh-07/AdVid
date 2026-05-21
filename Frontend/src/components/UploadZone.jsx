import { useRef, useState } from "react";

export default function UploadZone({ title }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");

  const handleClick = () => {
    inputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-500 transition bg-white shadow-md hover:shadow-lg"
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      {preview ? (
        <>
          <img
            src={preview}
            alt="preview"
            className="w-full h-40 object-cover rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-2 truncate">
            {fileName}
          </p>
        </>
      ) : (
        <>
          <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-500 text-xl">
            ⬆️
          </div>
          <h3 className="text-md font-semibold text-gray-800">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Drag & drop or click to upload
          </p>
        </>
      )}
    </div>
  );
}