import { getCurrentUser } from "@/lib/auth";
import { NavContent } from "./nav-content";

export async function Navbar() {
  const user = await getCurrentUser();
  return <NavContent user={user} />;
}