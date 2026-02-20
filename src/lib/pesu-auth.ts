import { loginToPESU, AuthError, PESUError } from "./pesu-api";

interface ParentInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  type: "father" | "mother";
  occupation: string | null;
  designation: string | null;
}

export interface PESUProfile {
  name: string | null;
  prn: string | null;
  srn: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  program: string | null;
  branch: string | null;
  semester: string | null;
  section: string | null;
  section_name: string | null;
  class_name: string | null;
  batch_class_id: unknown;
  class_batch_section_id: unknown;
  user_id: unknown;
  campus_code: number | null;
  campus: string | null;
  photo_base64: string | null;
  parents: ParentInfo[];
}

export interface LoginResult {
  success: boolean;
  profile: PESUProfile | null;
  error: string | null;
}

function parseCampus(loginId: string | null): {
  campus_code: number | null;
  campus: string | null;
} {
  if (!loginId) return { campus_code: null, campus: null };
  const match = loginId.match(/^PES(\d)/);
  if (!match) return { campus_code: null, campus: null };
  const code = parseInt(match[1], 10);
  return { campus_code: code, campus: code === 1 ? "RR" : "EC" };
}

function parsePhoto(rawPhoto: unknown): string | null {
  if (!rawPhoto || typeof rawPhoto !== "string") return null;
  if (rawPhoto.includes("base64,")) {
    return rawPhoto.split("base64,").pop()?.trim() ?? null;
  }
  return rawPhoto;
}

function parseSemesterSection(
  className: unknown
): [string | null, string | null] {
  if (!className || typeof className !== "string") return [null, null];
  const match = className.match(/Sem-(\d+),\s*Section\s+(\S+)/);
  if (match) return [match[1], match[2]];
  return [null, null];
}

function parseBranch(rawBranch: unknown): string | null {
  if (!rawBranch || typeof rawBranch !== "string") return null;
  return rawBranch.startsWith("Branch:")
    ? rawBranch.slice(7).trim()
    : rawBranch;
}

function str(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  return String(val);
}

export async function loginAndGetProfile(
  username: string,
  password: string
): Promise<LoginResult> {
  try {
    const user = await loginToPESU(username, password);
    const [semester, section] = parseSemesterSection(user.className);
    const campusInfo = parseCampus(str(user.loginId));

    const parents: ParentInfo[] = Array.isArray(user.userParentList)
      ? user.userParentList.map((p: Record<string, unknown>) => ({
          name: str(p.name),
          email: str(p.email),
          phone: str(p.mobileNumber),
          type: (p.type === 1 ? "father" : "mother") as "father" | "mother",
          occupation: str(p.occupation),
          designation: str(p.designation),
        }))
      : [];

    const profile: PESUProfile = {
      name: str(user.name),
      prn: str(user.loginId),
      srn: str(user.departmentId),
      date_of_birth: str(user.dateofBirth),
      email: str(user.email),
      phone: str(user.phone),
      program: str(user.program),
      branch: parseBranch(user.branch),
      semester,
      section,
      section_name: str(user.sectionName),
      class_name: str(user.className),
      batch_class_id: user.batchClass ?? null,
      class_batch_section_id: user.classBatchSection ?? null,
      user_id: user.userId ?? null,
      ...campusInfo,
      photo_base64: parsePhoto(user.photo),
      parents,
    };

    return { success: true, profile, error: null };
  } catch (e) {
    if (e instanceof AuthError || e instanceof PESUError) {
      return { success: false, profile: null, error: e.message };
    }
    return { success: false, profile: null, error: "An unexpected error occurred" };
  }
}