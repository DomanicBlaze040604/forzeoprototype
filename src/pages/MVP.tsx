/**
 * FORZEO MVP Page
 * 
 * Dedicated page for MVP AI Visibility Analysis
 * Uses the new backend APIs: execute-prompt, visibility-score, ai-summary
 */

import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MVPDashboard } from "@/components/dashboard/MVPDashboard";
import { cn } from "@/lib/utils";
import { useBrands } from "@/hooks/useBrands";

const MVP = () => {
  const { isOpen } = useSidebar();
  const { activeBrand } = useBrands();

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-fz ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header 
          title="AI Visibility MVP" 
          breadcrumb={[activeBrand?.name || "FORZEO", "MVP Analysis"]}
        />
        
        <div className="p-6">
          <MVPDashboard 
            defaultBrand={activeBrand?.name || "pTron"}
            defaultCompetitors={["boAt", "Noise", "Realme"]}
          />
        </div>
      </main>
    </div>
  );
};

export default MVP;
