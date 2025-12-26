import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportData {
  title: string;
  generatedAt: string;
  executiveSummary: string;
  keyMetrics: Array<{ name: string; value: string; change: string }>;
  analysis: string;
  competitorInsights: Array<{ name: string; score: number; trend: string }>;
  recommendations: Array<{ priority: string; action: string; impact: string }>;
  predictions: string;
}

export function useGenerateReport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateReport = async (
    reportType: "visibility" | "competitor" | "citation" | "full",
    brandName: string,
    data: any
  ): Promise<ReportData | null> => {
    setIsGenerating(true);

    try {
      const { data: reportData, error } = await supabase.functions.invoke(
        "generate-report",
        {
          body: { reportType, brandName, data },
        }
      );

      if (error) {
        throw error;
      }

      if (!reportData || reportData.error) {
        throw new Error(reportData?.error || "Failed to generate report");
      }

      toast({
        title: "Report generated",
        description: "Your report is ready for download.",
      });

      return reportData as ReportData;
    } catch (error) {
      console.error("Report generation error:", error);
      toast({
        title: "Report generation failed",
        description: error instanceof Error ? error.message : "Could not generate report. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToCsv = (data: any[], filename: string) => {
    if (!data || !data.length) {
      toast({
        title: "No data to export",
        description: "The report has no metrics data to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: "CSV exported",
      description: `${filename}.csv has been downloaded.`,
    });
  };

  const exportToPdf = async (reportData: ReportData, filename: string) => {
    // Create a well-formatted printable HTML version
    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return dateStr;
      }
    };

    const getTrendIcon = (trend: string) => {
      if (trend === "up") return "↑";
      if (trend === "down") return "↓";
      return "→";
    };

    const getTrendColor = (trend: string) => {
      if (trend === "up") return "#10b981";
      if (trend === "down") return "#ef4444";
      return "#6b7280";
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportData.title}</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 900px; 
              margin: 0 auto; 
              padding: 40px; 
              color: #1f2937;
              line-height: 1.6;
            }
            .header {
              border-bottom: 3px solid #10b981;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            h1 { 
              color: #10b981; 
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            .date {
              color: #6b7280;
              font-size: 14px;
            }
            h2 { 
              color: #1f2937; 
              margin-top: 30px;
              margin-bottom: 15px;
              font-size: 20px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 8px;
            }
            .summary {
              background: #f0fdf4;
              border-left: 4px solid #10b981;
              padding: 20px;
              margin: 20px 0;
              border-radius: 0 8px 8px 0;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin: 20px 0;
            }
            .metric { 
              padding: 20px; 
              background: #f9fafb; 
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .metric-name { 
              font-size: 13px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }
            .metric-value { 
              font-size: 28px; 
              font-weight: bold; 
              color: #10b981;
            }
            .metric-change {
              font-size: 14px;
              margin-top: 5px;
            }
            .metric-change.positive { color: #10b981; }
            .metric-change.negative { color: #ef4444; }
            .metric-change.neutral { color: #6b7280; }
            .analysis {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .competitor-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .competitor-table th,
            .competitor-table td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            .competitor-table th {
              background: #f9fafb;
              font-weight: 600;
              color: #374151;
            }
            .recommendation { 
              padding: 15px 20px; 
              margin: 10px 0; 
              border-radius: 8px;
              border-left: 4px solid;
            }
            .recommendation.high { 
              border-left-color: #ef4444; 
              background: #fef2f2; 
            }
            .recommendation.medium { 
              border-left-color: #f59e0b; 
              background: #fffbeb; 
            }
            .recommendation.low { 
              border-left-color: #10b981; 
              background: #f0fdf4; 
            }
            .priority-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .priority-badge.high { background: #fee2e2; color: #dc2626; }
            .priority-badge.medium { background: #fef3c7; color: #d97706; }
            .priority-badge.low { background: #d1fae5; color: #059669; }
            .action-text { font-weight: 500; margin-bottom: 5px; }
            .impact-text { font-size: 14px; color: #6b7280; }
            .predictions {
              background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border: 1px solid #d1fae5;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
              .metrics-grid { grid-template-columns: repeat(2, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportData.title}</h1>
            <p class="date">Generated: ${formatDate(reportData.generatedAt)}</p>
          </div>
          
          <h2>Executive Summary</h2>
          <div class="summary">
            <p>${reportData.executiveSummary}</p>
          </div>
          
          ${reportData.keyMetrics?.length > 0 ? `
          <h2>Key Metrics</h2>
          <div class="metrics-grid">
            ${reportData.keyMetrics.map(m => {
              const changeClass = m.change?.startsWith("+") ? "positive" : m.change?.startsWith("-") ? "negative" : "neutral";
              return `
              <div class="metric">
                <div class="metric-name">${m.name}</div>
                <div class="metric-value">${m.value}</div>
                <div class="metric-change ${changeClass}">${m.change}</div>
              </div>
            `;
            }).join("")}
          </div>
          ` : ""}
          
          ${reportData.analysis ? `
          <h2>Detailed Analysis</h2>
          <div class="analysis">
            <p>${reportData.analysis}</p>
          </div>
          ` : ""}
          
          ${reportData.competitorInsights?.length > 0 ? `
          <h2>Competitor Insights</h2>
          <table class="competitor-table">
            <thead>
              <tr>
                <th>Competitor</th>
                <th>Score</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.competitorInsights.map(c => `
                <tr>
                  <td>${c.name}</td>
                  <td>${c.score}%</td>
                  <td style="color: ${getTrendColor(c.trend)}">${getTrendIcon(c.trend)} ${c.trend}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          ` : ""}
          
          ${reportData.recommendations?.length > 0 ? `
          <h2>Recommendations</h2>
          ${reportData.recommendations.map(r => `
            <div class="recommendation ${r.priority}">
              <span class="priority-badge ${r.priority}">${r.priority} priority</span>
              <div class="action-text">${r.action}</div>
              <div class="impact-text">Expected Impact: ${r.impact}</div>
            </div>
          `).join("")}
          ` : ""}
          
          ${reportData.predictions ? `
          <h2>Future Outlook</h2>
          <div class="predictions">
            <p>${reportData.predictions}</p>
          </div>
          ` : ""}
          
          <div class="footer">
            <p>Generated by FORZEO AI Visibility Platform</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      // Wait for content to load before printing
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }

    toast({
      title: "PDF ready",
      description: "Print dialog opened for PDF export.",
    });
  };

  return { generateReport, exportToCsv, exportToPdf, isGenerating };
}
