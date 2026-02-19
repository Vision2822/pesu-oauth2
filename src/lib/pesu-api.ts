const BASE_URL = "https://www.pesuacademy.com/MAcademy";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/143.0 Mobile Safari/537.36",
  "X-Requested-With": "pes.pesu",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
};

export class PESUError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PESUError";
  }
}

export class AuthError extends PESUError {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

function buildFormData(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

class CookieJar {
  private cookies: Map<string, string> = new Map();

  extract(response: Response) {
    const raw = response.headers.get("set-cookie");
    if (!raw) return;

    const parts = raw.split(/,(?=\s*\w+=)/);
    for (const part of parts) {
      const pair = part.split(";")[0]?.trim();
      if (!pair) continue;
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) continue;
      const name = pair.substring(0, eqIndex).trim();
      const value = pair.substring(eqIndex + 1).trim();
      if (name && !["path", "expires", "domain", "max-age", "samesite", "httponly", "secure"].includes(name.toLowerCase())) {
        this.cookies.set(name, value);
      }
    }
  }

  toString(): string {
    const parts: string[] = [];
    this.cookies.forEach((value, name) => {
      parts.push(`${name}=${value}`);
    });
    return parts.join("; ");
  }
}

export async function loginToPESU(
  username: string,
  password: string
): Promise<Record<string, unknown>> {
  const jar = new CookieJar();

  const initResp = await fetch(`${BASE_URL}/mobile/dispatcher`, {
    method: "POST",
    headers: { ...DEFAULT_HEADERS },
    body: buildFormData({
      action: "20",
      mode: "5",
      callMethod: "background",
      minLimit: "0",
      limit: "10",
      randomNum: Math.random().toString(),
    }),
    redirect: "manual",
  });
  jar.extract(initResp);
  await initResp.text();

  const loginResp = await fetch(`${BASE_URL}/j_spring_security_check`, {
    method: "POST",
    headers: {
      ...DEFAULT_HEADERS,
      Cookie: jar.toString(),
    },
    body: buildFormData({
      j_username: username,
      j_password: password,
      j_mobile: "MOBILE",
      j_mobileApp: "YES",
      j_social: "NO",
      j_appId: "1",
      action: "0",
      mode: "0",
      randomNum: Math.random().toString(),
    }),
    redirect: "manual",
  });
  jar.extract(loginResp);

  if (loginResp.status !== 302) {
    throw new AuthError("Invalid credentials");
  }

  const followResp = await fetch(`${BASE_URL}/a/0`, {
    method: "GET",
    headers: {
      ...DEFAULT_HEADERS,
      Cookie: jar.toString(),
    },
    redirect: "manual",
  });
  jar.extract(followResp);
  await followResp.text();

  const successResp = await fetch(`${BASE_URL}/mobile/mobileAppLoginSuccess`, {
    method: "GET",
    headers: {
      ...DEFAULT_HEADERS,
      Cookie: jar.toString(),
    },
    redirect: "manual",
  });
  jar.extract(successResp);

  if (!successResp.ok) {
    throw new PESUError(
      `Login success endpoint returned ${successResp.status}`
    );
  }

  const text = await successResp.text();

  let userData: Record<string, unknown>;
  try {
    userData = JSON.parse(text);
  } catch {
    throw new PESUError(`Failed to parse response: ${text.substring(0, 200)}`);
  }

  if (userData.login !== "SUCCESS") {
    throw new AuthError("Login unsuccessful");
  }

  return userData;
}