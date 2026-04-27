import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import OrgPageClient from "./OrgPageClient";

export default async function OrgPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <OrgPageClient currentUserId={userId} />;
}
