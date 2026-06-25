// src/components/KescoLogo.jsx

export default function KescoLogo() {
  return (
    <div className="flex flex-col items-center text-center px-4 py-6">

      <img
        src="/kesco-logo.png"
        alt="KESCO Logo"
        className="w-32 h-32 object-contain mb-5"
      />

      <h1 className="text-2xl font-bold text-gray-800 leading-tight">
        KESCO Summer
        <br />
        Internship 2026
      </h1>

      <p className="mt-3 text-sm text-gray-500 leading-relaxed">
        Kanpur Electricity
        <br />
        Supply Company Ltd.
      </p>

    </div>
  );
}