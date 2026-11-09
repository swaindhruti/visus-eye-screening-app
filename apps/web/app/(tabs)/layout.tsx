import { ShopRedirect } from "@/components/ShopShell";
import { GuestBar, TabBar, TopNav } from "@/components/TabBar";

export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <ShopRedirect />
      <TopNav />
      {children}
      <TabBar />
      <GuestBar />
    </>
  );
}
