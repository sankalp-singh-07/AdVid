export default function SectionTitle({ text1, text2, text3 }) {
  return (
    <div className="text-center mt-20">      
      <p className="uppercase tracking-widest text-indigo-500 text-sm font-semibold">
        {text1}
      </p>
      <h1 className="text-4xl md:text-5xl font-bold mt-3 leading-tight bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
        {text2}
      </h1>
      <p className="text-gray-400 text-base md:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
        {text3}
      </p>
    </div>
  );
}