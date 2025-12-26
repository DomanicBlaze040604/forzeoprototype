import { ReactNode } from "react";
import { Sidebar, useSidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      <main
        className={cn(
          "transition-all duration-200 ease-in-out",
          isOpen ? "pl-56" : "pl-0"
        )}
      >
        {children}
      </main>
    </div>
  );
}
