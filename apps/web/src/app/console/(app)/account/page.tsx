import type { Metadata } from "next";

import { MyAccount } from "@/features/console/components/my-account";

export const metadata: Metadata = { title: "My account" };

export default function ConsoleAccountPage() {
  return <MyAccount />;
}
