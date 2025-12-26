export interface ParsedPrompt {
  text: string;
  tag?: string;
  location_country?: string;
}

export interface CSVParseResult {
  prompts: ParsedPrompt[];
  errors: string[];
  totalRows: number;
}

export function parseCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
  const errors: string[] = [];
  const prompts: ParsedPrompt[] = [];

  if (lines.length === 0) {
    return { prompts: [], errors: ["CSV file is empty"], totalRows: 0 };
  }

  // Parse header
  const headerLine = lines[0].toLowerCase();
  const headers = parseCSVLine(headerLine);
  
  const textIndex = headers.findIndex((h) => 
    h === "text" || h === "prompt" || h === "prompt_text" || h === "query"
  );
  const tagIndex = headers.findIndex((h) => 
    h === "tag" || h === "category" || h === "topic"
  );
  const locationIndex = headers.findIndex((h) => 
    h === "location" || h === "location_country" || h === "country"
  );

  if (textIndex === -1) {
    return { 
      prompts: [], 
      errors: ["CSV must have a 'text', 'prompt', or 'query' column"], 
      totalRows: lines.length - 1 
    };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      const text = values[textIndex]?.trim();

      if (!text) {
        errors.push(`Row ${i + 1}: Missing prompt text`);
        continue;
      }

      if (text.length > 500) {
        errors.push(`Row ${i + 1}: Prompt text exceeds 500 characters`);
        continue;
      }

      const prompt: ParsedPrompt = { text };

      if (tagIndex !== -1 && values[tagIndex]) {
        prompt.tag = values[tagIndex].trim();
      }

      if (locationIndex !== -1 && values[locationIndex]) {
        const location = values[locationIndex].trim().toUpperCase();
        if (location.length === 2) {
          prompt.location_country = location;
        }
      }

      prompts.push(prompt);
    } catch (err) {
      errors.push(`Row ${i + 1}: Failed to parse row`);
    }
  }

  return {
    prompts,
    errors,
    totalRows: lines.length - 1,
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function generateCSVTemplate(): string {
  return `text,tag,location_country
"What is the best CRM software for small businesses?",CRM,US
"Top enterprise sales automation tools 2025",Sales,US
"Compare AI-powered marketing platforms",Marketing,GB
"Best customer support software with AI",Support,US`;
}
