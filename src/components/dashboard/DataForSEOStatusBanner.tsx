import { useState, useEffect } from "react";
import { AlertTriangle, Info, X, ExternalLink, CheckCircle, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DataForSEOStatusBannerProps {
  className?: string;
}

type APIStatus = "connected" | "simulated" | "low_balance" | "error" | "checking";

export function DataForSEOStatusBanner({ className }: DataForSEOStatusBannerProps) {
  const [status, setStatus] = useState<APIStatus>("checking");
  const [dismissed, setDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const checkAPIStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("dataforseo-enhanced", {
          body: { action: "check_balance" },
        });

        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        if (data?.balance !== undefined) {
          setBalance(data.balance);
        }

        if (!data?.available && data?.reason === "DataForSEO not configured") {
          setStatus("simulated");
        } else if (!data?.available && data?.reason === "Balance exhausted") {
          setStatus("low_balance");
        } else if (data?.available) {
          setStatus("connected");
        } else {
          setStatus("error");
          setErrorMessage(data?.reason || "Unknown error");
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Connection failed");
      }
    };

    checkAPIStatus();
  }, []);

  // Don't show banner if checking or dismissed
  if (status === "checking" || dismissed) {
    return null;
  }

  // Show success banner briefly for connected status
  if (status === "connected") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-[10px] border",
          "bg-fz-green/5 border-fz-green/20",
          className
        )}
      >
        <CheckCircle className="h-4 w-4 text-fz-green flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-body-sm font-medium text-fz-green">
              DataForSEO Connected
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-fz-green/10 text-fz-green">
              LIVE
            </span>
          </div>
          <p className="text-meta text-muted-foreground mt-0.5">
            Real AI engine responses enabled. Balance: ${balance.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const isSimulated = status === "simulated";
  const isLowBalance = status === "low_balance";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-[10px] border",
        isSimulated
          ? "bg-fz-amber/5 border-fz-amber/20"
          : isLowBalance
          ? "bg-fz-amber/5 border-fz-amber/20"
          : "bg-fz-red/5 border-fz-red/20",
        className
      )}
    >
      {isLowBalance ? (
        <DollarSign className="h-4 w-4 text-fz-amber flex-shrink-0" />
      ) : isSimulated ? (
        <Info className="h-4 w-4 text-fz-amber flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-fz-red flex-shrink-0" />
      )}
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-body-sm font-medium",
            isSimulated || isLowBalance ? "text-fz-amber" : "text-fz-red"
          )}>
            {isLowBalance 
              ? "Low DataForSEO Balance" 
              : isSimulated 
              ? "Fallback Mode Active" 
              : "API Connection Error"}
          </span>
          <span className={cn(
            "px-1.5 py-0.5 text-[10px] font-medium rounded",
            isSimulated || isLowBalance
              ? "bg-fz-amber/10 text-fz-amber" 
              : "bg-fz-red/10 text-fz-red"
          )}>
            {isLowBalance ? `$${balance.toFixed(2)}` : isSimulated ? "FALLBACK" : "ERROR"}
          </span>
        </div>
        <p className="text-meta text-muted-foreground mt-0.5">
          {isLowBalance ? (
            <>
              DataForSEO balance exhausted (${balance.toFixed(2)}). Using Groq + Serper fallback.
              <span className="ml-1 text-fz-amber">Add credits to resume real AI scraping.</span>
            </>
          ) : isSimulated ? (
            <>
              Using Groq AI simulation + Serper SERP. Results are simulated, not from real AI engines.
              <span className="ml-1 text-fz-amber">Configure DataForSEO for real responses.</span>
            </>
          ) : (
            errorMessage || "Unable to connect to DataForSEO API"
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://dataforseo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-meta text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {isLowBalance ? "Add Credits" : "Configure"} <ExternalLink className="h-3 w-3" />
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to check DataForSEO API status with balance info
 */
export function useDataForSEOStatus() {
  const [status, setStatus] = useState<{
    isSimulated: boolean;
    isConnected: boolean;
    isLowBalance: boolean;
    isError: boolean;
    errorMessage: string | null;
    checking: boolean;
    balance: number;
    balanceFormatted: string;
  }>({
    isSimulated: false,
    isConnected: false,
    isLowBalance: false,
    isError: false,
    errorMessage: null,
    checking: true,
    balance: 0,
    balanceFormatted: "$0.00",
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("dataforseo-enhanced", {
          body: { action: "check_balance" },
        });

        if (error) {
          setStatus({
            isSimulated: true,
            isConnected: false,
            isLowBalance: false,
            isError: true,
            errorMessage: error.message,
            checking: false,
            balance: 0,
            balanceFormatted: "$0.00",
          });
          return;
        }

        const balance = data?.balance || 0;
        const isConnected = data?.available === true;
        const isLowBalance = balance > 0 && balance < 5;

        setStatus({
          isSimulated: !isConnected,
          isConnected,
          isLowBalance,
          isError: false,
          errorMessage: data?.reason || null,
          checking: false,
          balance,
          balanceFormatted: `$${balance.toFixed(2)}`,
        });
      } catch (err) {
        setStatus({
          isSimulated: true,
          isConnected: false,
          isLowBalance: false,
          isError: true,
          errorMessage: err instanceof Error ? err.message : "Connection failed",
          checking: false,
          balance: 0,
          balanceFormatted: "$0.00",
        });
      }
    };

    checkStatus();
  }, []);

  return status;
}
