const BASE_URL = "https://www.pesuacademy.com/MAcademy";

const HEADERS = {
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

export async function loginToPESU(
  username: string,
  password: string
): Promise<Record<string, unknown>> {
  const cookieJar: string[] = [];

  function extractCookies(response: Response) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      const pair = raw.split(";")[0];
      if (pair) cookieJar.push(pair);
    }
  }

  function cookieHeader(): string {
    return cookieJar.join("; ");
  }

  const initResp = await fetch(`${BASE_URL}/mobile/dispatcher`, {
    method: "POST",
    headers: { ...HEADERS, Cookie: cookieHeader() },
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
  extractCookies(initResp);
  await initResp.text();

  const loginResp = await fetch(`${BASE_URL}/j_spring_security_check`, {
    method: "POST",
    headers: { ...HEADERS, Cookie: cookieHeader() },
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
  extractCookies(loginResp);

  if (loginResp.status !== 302) {
    throw new AuthError("Invalid credentials");
  }

  const followResp = await fetch(`${BASE_URL}/a/0`, {
    method: "GET",
    headers: { ...HEADERS, Cookie: cookieHeader() },
    redirect: "manual",
  });
  extractCookies(followResp);
  await followResp.text();

  const successResp = await fetch(`${BASE_URL}/mobile/mobileAppLoginSuccess`, {
    method: "GET",
    headers: { ...HEADERS, Cookie: cookieHeader() },
    redirect: "manual",
  });
  extractCookies(successResp);

  if (!successResp.ok) {
    throw new PESUError(`Login success endpoint returned ${successResp.status}`);
  }

  const userData = (await successResp.json()) as Record<string, unknown>;

  if (userData.login !== "SUCCESS") {
    throw new AuthError("Login unsuccessful");
  }

  return userData;
}