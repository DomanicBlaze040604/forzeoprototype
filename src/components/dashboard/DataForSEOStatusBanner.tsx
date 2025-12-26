import { useState, useEffect } from "react";
import { AlertTriangle, Info, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DataForSEOStatusBannerProps {
  className?: string;
}

type APIStatus = "connected" | "simulated" | "error" | "checking";

export function DataForSEOStatusBanner({ className }: DataForSEOStatusBannerProps) {
  const [status, setStatus] = useState<APIStatus>("checking");
  const [dismissed, setDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkAPIStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("dataforseo-client", {
          body: { action: "account_balance" },
        });

        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        if (data?.mock) {
          setStatus("simulated");
        } else if (data?.error) {
          setStatus("error");
          setErrorMessage(data.error);
        } else {
          setStatus("connected");
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Connection failed");
      }
    };

    checkAPIStatus();
  }, []);

  // Don't show banner if connected or dismissed
  if (status === "connected" || status === "checking" || dismissed) {
    return null;
  }

  const isSimulated = status === "simulated";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-[10px] border",
        isSimulated
          ? "bg-fz-amber/5 border-fz-amber/20"
          : "bg-fz-red/5 border-fz-red/20",
        className
      )}
    >
      {isSimulated ? (
        <Info className="h-4 w-4 text-fz-amber flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-fz-red flex-shrink-0" />
      )}
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-body-sm font-medium",
            isSimulated ? "text-fz-amber" : "text-fz-red"
          )}>
            {isSimulated ? "Simulated Data Mode" : "API Connection Error"}
          </span>
          <span className={cn(
            "px-1.5 py-0.5 text-[10px] font-medium rounded",
            isSimulated 
              ? "bg-fz-amber/10 text-fz-amber" 
              : "bg-fz-red/10 text-fz-red"
          )}>
            {isSimulated ? "DEMO" : "ERROR"}
          </span>
        </div>
        <p className="text-meta text-muted-foreground mt-0.5">
          {isSimulated ? (
            <>
              DataForSEO API not configured. Results are simulated and may not reflect real data.
              <span className="ml-1 text-fz-amber">Exports disabled.</span>
            </>
          ) : (
            errorMessage || "Unable to connect to DataForSEO API"
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {isSimulated && (
          <a
            href="https://dataforseo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-meta text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            Configure <ExternalLink className="h-3 w-3" />
          </a>
        )}
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
 * Hook to check DataForSEO API status
 */
export function useDataForSEOStatus() {
  const [status, setStatus] = useState<{
    isSimulated: boolean;
    isConnected: boolean;
    isError: boolean;
    errorMessage: string | null;
    checking: boolean;
  }>({
    isSimulated: false,
    isConnected: false,
    isError: false,
    errorMessage: null,
    checking: true,
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("dataforseo-client", {
          body: { action: "account_balance" },
        });

        if (error) {
          setStatus({
            isSimulated: false,
            isConnected: false,
            isError: true,
            errorMessage: error.message,
            checking: false,
          });
          return;
        }

        if (data?.mock) {
          setStatus({
            isSimulated: true,
            isConnected: false,
            isError: false,
            errorMessage: null,
            checking: false,
          });
        } else if (data?.error) {
          setStatus({
            isSimulated: false,
            isConnected: false,
            isError: true,
            errorMessage: data.error,
            checking: false,
          });
        } else {
          setStatus({
            isSimulated: false,
            isConnected: true,
            isError: false,
            errorMessage: null,
            checking: false,
          });
        }
      } catch (err) {
        setStatus({
          isSimulated: false,
          isConnected: false,
          isError: true,
          errorMessage: err instanceof Error ? err.message : "Connection failed",
          checking: false,
        });
      }
    };

    checkStatus();
  }, []);

  return status;
}
