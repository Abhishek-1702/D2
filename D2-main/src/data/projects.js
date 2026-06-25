// src/data/projects.js

export const PROJECTS = [
  {
    id: 1,
    name: "Demand Side Forecasting",
    shortName: "DSF",
    status: "In Progress",
    statusColor: "blue",
    members: ["Shivam Gupta", "Irtiqua Miran", "Nishtha Chakrawarti"],
    objective:
      "Future electricity demand prediction (daily/monthly/seasonal) to assist KESCO in proactive load management and infrastructure planning.",
    workingOn: [
      "Collecting 2–3 years feeder/substation load data",
      "Integrating weather data (temperature, humidity)",
      "Identifying seasonal and daily load patterns",
    ],
    methodology: [
      "Data cleaning — handling missing values and outliers",
      "Trend analysis (summer vs winter, weekday vs weekend)",
      "Forecasting via Excel (moving average) or Python (ARIMA)",
    ],
    deliverables: [
      "Forecast vs Actual graph",
      "Peak demand prediction report",
      "Planning recommendations document",
    ],
    progress: 30,
    updates: [
      {
        date: "2026-06-10",
        title: "Data Set Analysis",
        desc: "Currently analysing the data set and finalising the workflow. Decided to go with the SQL for data cleaning.",
        member: ["Shivam Gupta", "Irtiqua Miran", "Nishtha Chakrawarti"],
        time: "11:00 AM",
      },
      /*
      {
        date: "2026-06-09",
        title: "Weather Data Integration",
        desc: "Merged IMD temperature and humidity datasets with load data for Kanpur feeders. Missing values imputed via interpolation.",
        member: "Riya Singh",
        time: "03:30 PM",
      },
      {
        date: "2026-06-07",
        title: "Seasonal Pattern Analysis",
        desc: "Identified 34% higher load in May–June vs November–January. Weekday peaks at 18:00–21:00 confirmed.",
        member: "Neha Verma",
        time: "10:15 AM",
      },
      {
        date: "2026-06-05",
        title: "Data Collection Complete",
        desc: "Compiled 2023–2025 load data from 18 feeders across 6 substations. Initial EDA completed.",
        member: "Arjun Patel",
        time: "04:00 PM",
      },*/
    ],
    
    chartData: {
      bar: [
        { month: "Jan", forecast: 0, actual: 0 },
        { month: "Feb", forecast: 0, actual: 0 },
        { month: "Mar", forecast: 0, actual: 0 },
        { month: "Apr", forecast: 1, actual: 2 },
        { month: "May", forecast: 0, actual: 0 },
        { month: "Jun", forecast: 4, actual: 5 },
      ],
      line: [
        { day: "Mon", load: 4 },
        { day: "Tue", load: 6 },
        { day: "Wed", load: 0 },
        { day: "Thu", load: 2 },
        { day: "Fri", load: 0 },
        { day: "Sat", load: 0 },
        { day: "Sun", load: 0 },
      ],
    },
    ppt: null,
    pptName: null,
  },
  {
    id: 2,
    name: "Pattern Analysis & Theft Detection",
    shortName: "PA",
    status: "In Progress",
    statusColor: "blue",
    members: ["Sarthak", "Abhijeet", "Swapnil"],
    objective:
      "Understand electricity usage patterns across consumer categories to identify opportunities for demand-side management and energy efficiency.",
    workingOn: [
      "Analyzing kWh/kVAh consumption data by consumer segment",
      "Segmenting consumers: Domestic, Commercial, Industrial",
      "Identifying high-consumption users and irregular usage",
      "Analyzing peak usage timing per segment",
    ],
    methodology: [
      "Pivot tables and charts in Excel",
      "K-means clustering for consumer segmentation",
      "Peak hour analysis using time-series data",
    ],
    deliverables: [
      "Consumer segmentation report",
      "Usage pattern graphs",
      "Energy saving recommendations",
    ],
    progress: 40,
    updates: [
      {
        date: "2026-06-10",
        title: "Data Cleaning started",
        desc: "Converting data set to csv files for faster access and cleaning the data",
        member: ["Sarthak", "Abhijeet", "Swapnil"],
        time: "12:00 PM",
      },
      /*{
        date: "2026-06-07",
        title: "Irregular Usage Flagged",
        desc: "Identified 47 accounts with zero billing but positive consumption — flagged for field verification.",
        member: "Priya Sharma",
        time: "11:30 AM",
      },
      {
        date: "2026-06-05",
        title: "Data Preprocessing",
        desc: "Cleaned consumer billing records for Jan–May 2026. Removed duplicates and standardized account formats.",
        member: "Vivek Kumar",
        time: "09:45 AM",
      },*/
    ],
    
    chartData: {
      pie: [
        { name: "Domestic", value: 10, color: "#F5C400" },
        { name: "Commercial", value: 12, color: "#3B82F6" },
        { name: "Industrial", value: 14, color: "#10B981" },
      ],
      bar: [
        { segment: "Domestic", avgKwh: 10 },
        { segment: "Commercial", avgKwh: 12 },
        { segment: "Industrial", avgKwh: 14 },
      ],
    },
    ppt: null,
    pptName: null,
  },
  {
    id: 3,
    name: "Revenue Loss / Gap Analysis",
    shortName: "RL",
    status: "In Progress",
    statusColor: "blue",
    members: ["Sanskriti Jaiswal", "Abhay Agnihotri"],
    objective:
      "Identify and quantify revenue gaps in KESCO's billing and collection cycle, with root cause analysis for AT&C losses.",
    workingOn: [
      "Collecting energy input, billed, and collected data",
      "Calculating AT&C Loss % by division/feeder",
      "Analyzing billing efficiency and collection rates",
      "Identifying theft, meter issues, billing errors",
    ],
    methodology: [
      "AT&C Loss",
      "Feeder-level loss mapping",
      "Cross-referencing meter readings with billing data",
    ],
    deliverables: [
      "Loss percentage report by area",
      "High-loss area identification map",
      "Improvement suggestions and action plan",
    ],
    progress: 30,
    updates: [
      {
        date: "2026-06-10",
        title: "Categorization and analysis ",
        desc: "Categorizing complaints, analysing resoluion time, and identifying problem areas.",
        member: ["Sanskriti Jaiswal", "Abhay Agnihotri"],
        time: "12:00 PM",
      },
      /*{
        date: "2026-06-06",
        title: "Billing Efficiency Analysis",
        desc: "Found billing efficiency at 84% — 16% of consumed units remain unbilled. Cross-referencing with meter audit reports.",
        member: "Manav Jain",
        time: "01:00 PM",
      },
      {
        date: "2026-06-04",
        title: "Data Collection Initiated",
        desc: "Requested monthly energy input and billing data from KESCO accounts division. Data received for Q1 2026.",
        member: "Neha Verma",
        time: "10:00 AM",
      },*/
    ],
    
    chartData: {
      bar: [
        { division: "Div 1", loss: 2 },
        { division: "Div 2", loss: 0 },
        { division: "Div 3", loss: 1 },
        { division: "Div 4", loss: 0 },
        { division: "Div 5", loss: 6 },
        { division: "Div 6", loss: 3 },
      ],
      pie: [
        { name: "Theft/Tampering", value: 2, color: "#EF4444" },
        { name: "Meter Issues", value: 3, color: "#F59E0B" },
        { name: "Billing Errors", value: 5, color: "#3B82F6" },
        { name: "Other Losses", value: 0, color: "#6B7280" },
      ],
    },
    ppt: null,
    pptName: null,
  },
  {
    id: 4,
    name: "Complaint Analysis",
    shortName: "CA",
    status: "In Progress",
    statusColor: "blue",
    members: ["Hridhima Srivastav", "Sibgha"],
    objective:
      "Improve service quality by systematically analyzing consumer complaints — type, location, frequency, and resolution time.",
    workingOn: [
      "Gathering complaint data from CRM/helpdesk logs",
      "Categorizing complaints by type and area",
      "Tracking resolution time per complaint category",
      "Identifying recurring problem zones",
    ],
    methodology: [
      "Complaint categorization (power outage, billing, meter, voltage)",
      "Frequency and resolution time analysis",
      "Geographic heatmap of complaint density",
    ],
    deliverables: [
      "Complaint category report",
      "Resolution efficiency analysis",
      "Service improvement action plan",
    ],
    progress: 60,
    updates: [
      {
        date: "2026-06-10",
        title: "Analysis and cleaning the Data",
        desc: "Started analysis of the complaint data and its cleaning",
        member: ["Hridhima Srivastav", "Sibgha"],
        time: "11:00 AM",
      },
      {
        date: "2026-06-12",
        title: "Analysing help desk Data",
        desc: "Substation wise complaint profile uploaded.",
        member: ["Hridhima Srivastav", "Sibgha"],
        time: "12:30 PM",
      },
    ],
    
    chartData: {
      bar: [
        { category: "Power Outage", count: 20},
        { category: "Billing", count: 40 },
        { category: "Meter Issue", count: 25 },
        { category: "Voltage", count: 50 },
        { category: "Other", count: 60 },
      ],
      pie: [
        { name: "Awaiting Data", value: 50, color: "#D1D5DB" },
      ],
    },
    ppt: null,
    pptName: null,
  },
];

export const TEAM_MEMBERS = [
  { name: "Shivam Gupta", role: "Intern", avatar: "SG" },
  { name: "Irtiqua Miran", role: "Intern", avatar: "IM" },
  { name: "Nishtha Chakrwarti", role: "Intern", avatar: "NC" },
  { name: "Sarthak", role: "Intern", avatar: "SR" },
  { name: "Abhijeet", role: "Intern", avatar: "AB" },
  { name: "Swapnil", role: "Intern", avatar: "SW" },
  { name: "Hridhima Srivastav", role: "Intern", avatar: "HS" },
  { name: "Sibgha", role: "Intern", avatar: "SI" },
  { name: "Sanskriti Jaiswal", role: "Intern", avatar: "SJ" },
  { name: "Abhay Agnihotri", role: "Intern", avatar: "AA" },
  { name: "Abhishek Yadav", role: "Intern", avatar: "AY" },
  { name: "Nisha Gond", role: "Intern", avatar: "NG" },
  { name: "Harshika Sharma", role: "Intern", avatar: "HS" },
  { name: "chinmay kumar gupta", role:"Intern",avatar:"CKG"},
  { name: "mayank Snakhwar", role:"Intern",avatar:"MS"},
  
];

export const RECENT_ACTIVITY = [
  { task: "integrated new data received from complaint analysis and theft analysis teams", project:"Dashboard Analysis", member:"Harshika Sharma", time:"jun 24, 12:30 Pm", type:"update", avatar:"HS"},
  { task: "updated members details and project progress percentage in the dashboard", project:"Dashboard Analysis", member:"Nisha Gond", time:"jun 23, 11:40 Am", type:"update", avatar:"NG"},
  { task: "Completed the development of local tool for large data file analysis and summary report",project: "Theft Analysis", member:"Sarthak Katiyar", time:"jun 18, 12:50 Pm", type:"update", avatar:"SK"},
  { task: "Enhanced Deshboard UI with improved color scheme and modern visual design", project: "KESCO Dashboard", member:"Harshika Sharma", time: "jun 18, 2:00 pm",type: "update", avatar: "HS"},
  { task: "Complete Operational Analysis, Created detailed report on Problem Areas, Resolution Latency and Geographical Problem Analysis", project:"complaint analysis", member:"sibgha", time:"jun 18,3:00 Pm", type:"update", avatar:"SG"},
  { task: "Plots on master data drawn and visualized looking for problem specific data for further working", project:"Theft analysis", member:"Swapnil Hayaran", time:"jun 16,12:50 PM", type: "update", avatar:"SH"},
  {task: "Updated files tab. Drive links can be directly added.", project: "Dashboard Analysis", member: "Abhishek Yadav" , time: "Jun 15, 11:30 AM", type: "update", avatar: "AY"},
  {task: "Dashboard Updated with recent complaint analysis findings. Adding complaint trend to the dashboard.", project: "Dashboard Analysis", member: "Harshika Sharma" , time: "Jun 12, 2:30 PM", type: "update", avatar: "HS"},
  {task: "Substation wise complaint profile uploaded. Analysing Helpdesk data.", project: "Complaint Analysis", member: "Hridhima Srivastav" , time: "Jun 12, 12:30 PM", type: "update", avatar: "HS"},
  { task: "Enhanced UI and updated graphs. Improved codebase and debugged issues", project: "KESCO Dashboard", member: "Abhishek Yadav" , time: "Jun 11, 12:30 AM", type: "update", avatar: "AY"},
  { task: "Data Set Analysis", project: "Demand Side Forecasting", member: "Shivam Gupta", time: "Jun 10, 11:00 AM", type: "update", avatar: "SG" },
  { task: "Data Cleaning started", project: "Pattern and Theft Analysis", member: "Sarthak" , time: "Jun 10, 12:00 PM", type: "update", avatar: "SR"},
  { task: "Categorization and analysis", project: "Revenue - Loss Analysis", member: "Sanskriti Jaiswal", time: "Jun 10, 12:00 PM", type: "update", avatar: "SJ" },
  { task: "Analysis and cleaning the Data", project: "Complaint Analysis", member: "Hridhima Srivastav", time: "Jun 10, 11:00 AM", type: "update", avatar: "HS" },
  { task: "Dashboard Development started", project: "KESCO Dashboard", member: "Abhishek Yadav" , time: "Jun 10, 12:30 PM", type: "update", avatar: "AY"},
  ];
