import { supabase } from "@/integrations/supabase/client";

interface AlertEmailData {
  userId: string;
  alertType: "visibility_drop" | "competitor_overtake" | "sentiment_shift";
  data: {
    brandName?: string;
    currentScore?: number;
    previousScore?: number;
    threshold?: number;
    competitorName?: string;
    competitorRank?: number;
    yourRank?: number;
    promptText?: string;
  };
}

export async function sendAlertEmail(alertData: AlertEmailData): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("send-alert-email", {
      body: alertData,
    });

    if (error) {
      console.error("Error sending alert email:", error);
      return false;
    }

    console.log("Alert email sent:", data);
    return true;
  } catch (error) {
    console.error("Failed to send alert email:", error);
    return false;
  }
}

export function checkVisibilityThreshold(
  currentScore: number,
  previousScore: number,
  threshold = 70
): boolean {
  return previousScore >= threshold && currentScore < threshold;
}

export function checkCompetitorOvertake(
  yourRank: number | null,
  competitorRank: number | null,
  previousYourRank: number | null
): boolean {
  if (!yourRank || !competitorRank || !previousYourRank) return false;
  return previousYourRank < competitorRank && yourRank > competitorRank;
}
