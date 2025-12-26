import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  exportVisibilityHistory,
  exportCompetitorData,
  exportDashboardData,
} from "@/lib/exportUtils";

interface ExportMenuProps {
  brandId?: string;
  dateRange?: number;
}

export function ExportMenu({ brandId, dateRange = 30 }: ExportMenuProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExport = async (
    type: "visibility" | "competitors" | "dashboard",
    format: "csv" | "excel"
  ) => {
    const key = `${type}-${format}`;
    setExporting(key);

    try {
      switch (type) {
        case "visibility":
          await exportVisibilityHistory(format, brandId);
          break;
        case "competitors":
          await exportCompetitorData(format);
          break;
        case "dashboard":
          await exportDashboardData(format, dateRange);
          break;
      }

      toast({
        title: "Export Successful",
        description: `Your ${type} data has been exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Data</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Visibility History
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleExport("visibility", "csv")}
          disabled={!!exporting}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("visibility", "excel")}
          disabled={!!exporting}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Competitor Data
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleExport("competitors", "csv")}
          disabled={!!exporting}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("competitors", "excel")}
          disabled={!!exporting}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Dashboard Summary
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleExport("dashboard", "csv")}
          disabled={!!exporting}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("dashboard", "excel")}
          disabled={!!exporting}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
