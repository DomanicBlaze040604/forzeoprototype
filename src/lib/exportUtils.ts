import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ExportableData {
  [key: string]: string | number | boolean | null | undefined;
}

// Google Sheets API configuration
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

interface GoogleSheetsConfig {
  accessToken: string;
  spreadsheetId?: string;
  sheetName?: string;
}

// Export to Google Sheets
export async function exportToGoogleSheets(
  data: ExportableData[],
  config: GoogleSheetsConfig,
  title: string = "FORZEO Export"
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  const headers = Object.keys(data[0]);
  const values = [
    headers,
    ...data.map((row) => headers.map((h) => row[h] ?? "")),
  ];

  // If no spreadsheet ID, create a new one
  if (!config.spreadsheetId) {
    const createResponse = await fetch(GOOGLE_SHEETS_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: `${title} - ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
        },
        sheets: [
          {
            properties: {
              title: config.sheetName || "Data",
            },
          },
        ],
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create spreadsheet: ${error}`);
    }

    const spreadsheet = await createResponse.json();
    config.spreadsheetId = spreadsheet.spreadsheetId;
  }

  // Write data to the spreadsheet
  const range = `${config.sheetName || "Sheet1"}!A1`;
  const updateResponse = await fetch(
    `${GOOGLE_SHEETS_API}/${config.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values,
      }),
    }
  );

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to write data: ${error}`);
  }

  // Apply formatting (header row bold, auto-resize columns)
  await fetch(`${GOOGLE_SHEETS_API}/${config.spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: 0,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: headers.length,
            },
          },
        },
      ],
    }),
  });

  return {
    spreadsheetId: config.spreadsheetId!,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
  };
}

// Helper to initiate Google OAuth for Sheets access
export function initiateGoogleSheetsAuth(): void {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google Client ID not configured");
  }

  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const scope = encodeURIComponent(GOOGLE_SHEETS_SCOPE);
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token&` +
    `scope=${scope}&` +
    `prompt=consent`;

  window.location.href = authUrl;
}

export function convertToCSV(data: ExportableData[], filename: string): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma or quote
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

export function convertToExcel(data: ExportableData[], filename: string): void {
  // For Excel, we create a more structured CSV that Excel handles well
  // A proper XLSX would require a library like xlsx, but CSV works for most cases
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const tsvRows = [
    headers.join("\t"),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          return String(value).replace(/\t/g, " ");
        })
        .join("\t")
    ),
  ];

  const tsvContent = tsvRows.join("\n");
  // Use tab-separated values with xls extension for Excel compatibility
  const blob = new Blob(["\ufeff" + tsvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  downloadBlob(blob, `${filename}.xls`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportVisibilityHistory(
  format: "csv" | "excel" = "csv",
  brandId?: string
): Promise<void> {
  let query = supabase
    .from("visibility_history")
    .select("*")
    .order("recorded_at", { ascending: false });

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching visibility history:", error);
    throw error;
  }

  const exportData = (data || []).map((row) => ({
    date: format === "csv" ? row.recorded_at : new Date(row.recorded_at).toLocaleString(),
    visibility_score: row.visibility_score,
    model: row.model || "All Models",
    brand_id: row.brand_id || "",
  }));

  const filename = `visibility_history_${format === "csv" ? "csv" : "excel"}_${Date.now()}`;
  
  if (format === "csv") {
    convertToCSV(exportData, filename);
  } else {
    convertToExcel(exportData, filename);
  }
}

export async function exportCompetitorData(
  format: "csv" | "excel" = "csv"
): Promise<void> {
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching competitors:", error);
    throw error;
  }

  const exportData = (data || []).map((row) => ({
    name: row.name,
    status: row.is_active ? "Active" : "Paused",
    last_visibility_score: row.last_visibility_score || 0,
    last_rank: row.last_rank || "N/A",
    created_at: new Date(row.created_at).toLocaleString(),
  }));

  const filename = `competitors_${format === "csv" ? "csv" : "excel"}_${Date.now()}`;
  
  if (format === "csv") {
    convertToCSV(exportData, filename);
  } else {
    convertToExcel(exportData, filename);
  }
}

export async function exportDashboardData(
  format: "csv" | "excel" = "csv",
  dateRange: number = 30
): Promise<void> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const { data: prompts, error: promptsError } = await supabase
    .from("prompts")
    .select("id, text, visibility_score, tag, created_at")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false });

  if (promptsError) {
    console.error("Error fetching prompts:", promptsError);
    throw promptsError;
  }

  const { data: results, error: resultsError } = await supabase
    .from("prompt_results")
    .select("prompt_id, model, brand_mentioned, sentiment, rank, analyzed_at");

  if (resultsError) {
    console.error("Error fetching results:", resultsError);
    throw resultsError;
  }

  const exportData = (prompts || []).map((prompt) => {
    const promptResults = (results || []).filter((r) => r.prompt_id === prompt.id);
    const mentionCount = promptResults.filter((r) => r.brand_mentioned).length;
    const avgRank = promptResults.filter((r) => r.rank).reduce((sum, r) => sum + (r.rank || 0), 0) / 
      (promptResults.filter((r) => r.rank).length || 1);

    return {
      prompt: prompt.text,
      tag: prompt.tag || "Uncategorized",
      visibility_score: prompt.visibility_score || 0,
      models_analyzed: promptResults.length,
      mentions: mentionCount,
      average_rank: avgRank.toFixed(1),
      created_at: new Date(prompt.created_at).toLocaleString(),
    };
  });

  const filename = `dashboard_data_${format === "csv" ? "csv" : "excel"}_${Date.now()}`;
  
  if (format === "csv") {
    convertToCSV(exportData, filename);
  } else {
    convertToExcel(exportData, filename);
  }
}
