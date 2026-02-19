export const AVAILABLE_SCOPES: Record<string, string> = {
  "profile:basic": "Read your basic identity (Name, PRN, SRN).",
  "profile:academic":
    "Read your academic details (Program, Branch, Semester, Section, Campus).",
  "profile:photo": "Read your profile photo.",
  "profile:contact": "Read your contact information (Email, Phone Number).",
};

export const SCOPE_FIELDS: Record<string, Record<string, string>> = {
  "profile:basic": {
    name: "Full Name",
    prn: "PRN (PES Registration Number)",
    srn: "SRN (Student Registration Number)",
  },
  "profile:academic": {
    program: "Program (e.g., B.Tech, M.Tech)",
    branch: "Branch/Department",
    semester: "Current Semester",
    section: "Section",
    campus: "Campus Name",
    campus_code: "Campus Code",
  },
  "profile:photo": {
    photo_base64: "Profile Photo",
  },
  "profile:contact": {
    email: "Email Address",
    phone: "Phone Number",
  },
};

export const ADMIN_PRNS: Set<string> = new Set(
  (process.env.ADMIN_USERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);