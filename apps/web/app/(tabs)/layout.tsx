import { GuestBar, TabBar, TopNav } from "@/components/TabBar";

export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <TopNav />
      {children}
      <TabBar />
      <GuestBar />
    </>
  );
}
