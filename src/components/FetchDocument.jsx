import React, { useState } from "react";

const TOKEN_MAP = {
  "KESCO-2026-001": {
    title: "Dashboard Summary Brief",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  "KESCO-INTERN-18JUL": {
    title: "Project Token Document",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
};

export default function FetchDocument({ language }) {
  const [token, setToken] = useState("");
  const [docResult, setDocResult] = useState(null);
  const [docError, setDocError] = useState("");
  const isHindi = language === "hi";

  const handleFetchDocument = (e) => {
    e.preventDefault();
    const key = token.trim();
    if (!key) {
      setDocResult(null);
      setDocError(isHindi ? "कृपया टोकन आईडी दर्ज करें।" : "Please enter the token ID.");
      return;
    }

    const result = TOKEN_MAP[key.toUpperCase()];
    if (result) {
      setDocResult(result);
      setDocError("");
    } else {
      setDocResult(null);
      setDocError(
        isHindi
          ? "इस टोकन के लिए दस्तावेज़ नहीं मिला। कृपया पुनः जांचें या प्रशासक से संपर्क करें।"
          : "No document found for this token. Please recheck or contact admin."
      );
    }
  };

  const handleOpenFullScreen = () => {
    if (!docResult) return;
    window.open(docResult.url, "_blank", "noopener");
  };

  const handlePrint = () => {
    if (!docResult) return;
    const printWindow = window.open(docResult.url, "_blank", "noopener");
    if (printWindow) {
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-[#1f498c] tracking-tight border-b-2 border-[#1f498c] inline-block pr-8 pb-1">
          {isHindi ? "दस्तावेज़ खोज" : "Fetch Document"}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-gray-700 leading-8">
          {isHindi
            ? "यहां टोकन आईडी दर्ज करें और दस्तावेज़ देखें।"
            : "Enter the document ID for preview."}
        </p>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-gray-400 mb-2">
              {isHindi ? "दस्तावेज़ टोकन" : "Document Token"}
            </p>
            <h3 className="text-2xl font-bold text-[#1f498c]">
              {isHindi ? "पहचान करें और देखें" : "Verify and preview"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {isHindi
                ? ""
                : ""}
            </p>
          </div>
          {/*<div className="rounded-full bg-[#ffeb3b] px-4 py-2 text-sm font-semibold text-black text-center">
            8th June - 18th July 2026
          </div>*/}
        </div>

        <form onSubmit={handleFetchDocument} className="mt-6 grid gap-3 sm:grid-cols-[1.5fr_0.8fr]">
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={isHindi ? "उदा. KESCO-2026-001" : "e.g. KESCO-2026-001"}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#1f498c]"
          />
          <button
            type="submit"
            className="rounded-2xl bg-[#1f498c] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
          >
            {isHindi ? "खोजें" : "Fetch"}
          </button>
        </form>

        {docError && (
          <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {docError}
          </div>
        )}

        {docResult && (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-gray-200 overflow-hidden bg-gray-50">
              <iframe src={docResult.url} title={docResult.title} className="h-72 w-full" />
            </div>
            <div className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-4">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-[0.24em]">
                  {isHindi ? "दस्तावेज़" : "Document"}
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900">{docResult.title}</p>
              </div>
              <div className="grid gap-2">
                <a
                  href={docResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {isHindi ? "डाउनलोड करें" : "Download"}
                </a>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {isHindi ? "प्रिंट" : "Print"}
                </button>
                <button
                  type="button"
                  onClick={handleOpenFullScreen}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#1f498c] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  {isHindi ? "पूर्ण स्क्रीन" : "Full screen"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
