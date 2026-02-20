export async function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method: string
): Promise<boolean> {
  if (method !== "S256") return false;

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  const computed = Buffer.from(digest)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return computed === challenge;
}