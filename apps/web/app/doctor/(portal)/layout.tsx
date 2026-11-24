import type { ReactNode } from "react";

import { DoctorShell } from "@/components/DoctorShell";

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return <DoctorShell>{children}</DoctorShell>;
}
