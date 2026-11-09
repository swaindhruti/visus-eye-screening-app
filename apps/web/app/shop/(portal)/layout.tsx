import type { ReactNode } from "react";

import { ShopShell } from "@/components/ShopShell";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
