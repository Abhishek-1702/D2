// src/data/officers.js

export const AUTHORITY_HIERARCHY = [
  {
    label: "Managing Director (MD)",
    children: [
      {
        label: "Directors",
        children: [
          { label: "Director (Finance)", children: [{ label: "DGM Finance" }, { label: "Deputy Chief Account Officer" }] },
          {
            label: "Director (Technical)",
            children: [
              {
                label: "Superintending Engineer (Projects)",
                children: [
                  { label: "Executive Engineer (Works)" },
                  { label: "Executive Engineer (Special Projects)" },
                  { label: "Executive Engineer (Quality Management)" },
                  { label: "Executive Engineer (GIS)" },
                ],
              },
              {
                label: "Superintending Engineer (Testing & Network Analysis)",
                children: [
                  { label: "Executive Engineer (Test) – Other than Meter Testing" },
                  { label: "Executive Engineer (Meter Testing & Raids)" },
                  { label: "Executive Engineer (Network Analysis & Forecasting)" },
                  { label: "Executive Engineer (High Tech Lab)" },
                ],
              },
              {
                label: "Superintending Engineer (Technical)",
                children: [
                  { label: "Executive Engineer-I (11 KV & LT)" },
                  { label: "Executive Engineer-II (11 KV & LT)" },
                  { label: "Executive Engineer (Electrical Safety & 33 KV)" },
                  { label: "Junior Engineer" },
                  { label: "T.G.-2 & Line Man" },
                  { label: "Ministerial Staff" },
                ],
              },
            ],
          },
          {
            label: "Director (Commercial)",
            children: [
              {
                label: "Superintending Engineer (Commercial)",
                children: [
                  { label: "Executive Engineer-I (Less than 10 KW) – NSC, CoT, LC, PD" },
                  { label: "Executive Engineer-II (Greater than 10 KW) – NSC, CoT, LC, PD" },
                  { label: "Executive Engineer (Billing Below 05 KW)" },
                  { label: "Executive Engineer (Billing 05 KW & Above)" },
                  { label: "Executive Engineer (Metering Below 05 KW)" },
                  { label: "Executive Engineer (Metering 05 KW & Above)" },
                  { label: "Executive Engineer (Collection Below 10 KW)" },
                  { label: "Executive Engineer (Collection 10 KW & Above)" },
                  { label: "Executive Engineer (Smart Metering / AMISP & EA)" },
                  { label: "Executive Engineer (1912 Helpline, IGRS & Consumer Centric Services)" },
                  { label: "Executive Engineer (HVC, Public Relations, Innovation & Inter-Department Coordination)" },
                ],
              },
            ],
          },
        ],
      },
      {
        label: "Other Officials",
        children: [
          { label: "Company Secretary" },
          { label: "Information Technology & Digitization" },
          { label: "Procurement & Purchase" },
          { label: "Store & Warehousing" },
          { label: "Workshops" },
          { label: "Human Resource Management" },
          { label: "Legal Cell, Forum & RTI" },
          { label: "Civil Works" },
          { label: "Staff Officer (MD)" },
        ],
      },
    ],
  },
];

export const OFFICERS = AUTHORITY_HIERARCHY.flatMap((item) => [item, ...item.children.flatMap((child) => child.children || [])]);

export function resolveMeetingDesignation(selectedPosition) {
  return selectedPosition || "";
}
