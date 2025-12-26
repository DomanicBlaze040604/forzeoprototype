import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Wifi,
  WifiOff,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ServiceStatus {
  name: string;
  status: "online" | "offline" | "checking" | "degraded";
  latency?: number;
  lastChecked?: Date;
  error?: string;
}

export function HealthCheck() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Groq AI (LLM)", status: "checking" },
    { name: "Serper API", status: "checking" },
    { name: "Database", status: "checking" },
    { name: "Edge Functions", status: "checking" },
  ]);
  const [isChecking, setIsChecking] = useState(false);

  const checkServices = async () => {
    setIsChecking(true);
    const newServices: ServiceStatus[] = [];

    // Check Groq AI (LLM)
    try {
      const start = Date.now();
      const response = await supabase.functions.invoke("health-check", {
        body: { service: "groq" },
      });
      const latency = Date.now() - start;
      
      if (response.error) {
        newServices.push({
          name: "Groq AI (LLM)",
          status: "offline",
          error: response.error.message,
          lastChecked: new Date(),
        });
      } else {
        newServices.push({
          name: "Groq AI (LLM)",
          status: response.data?.groq ? "online" : "offline",
          latency,
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      newServices.push({
        name: "Groq AI (LLM)",
        status: "offline",
        error: error instanceof Error ? error.message : "Connection failed",
        lastChecked: new Date(),
      });
    }

    // Check Serper API
    try {
      const start = Date.now();
      const response = await supabase.functions.invoke("health-check", {
        body: { service: "serper" },
      });
      const latency = Date.now() - start;
      
      if (response.error) {
        newServices.push({
          name: "Serper API",
          status: "offline",
          error: response.error.message,
          lastChecked: new Date(),
        });
      } else {
        newServices.push({
          name: "Serper API",
          status: response.data?.serper ? "online" : "offline",
          latency,
          lastChecked: new Date(),
        });
      }
    } catch (error) {
      newServices.push({
        name: "Serper API",
        status: "offline",
        error: error instanceof Error ? error.message : "Connection failed",
        lastChecked: new Date(),
      });
    }

    // Check Database
    try {
      const start = Date.now();
      const { error } = await supabase.from("brands").select("id").limit(1);
      const latency = Date.now() - start;
      
      newServices.push({
        name: "Database",
        status: error ? "offline" : "online",
        latency,
        lastChecked: new Date(),
        error: error?.message,
      });
    } catch (error) {
      newServices.push({
        name: "Database",
        status: "offline",
        error: error instanceof Error ? error.message : "Connection failed",
        lastChecked: new Date(),
      });
    }

    // Check Edge Functions
    try {
      const start = Date.now();
      const response = await supabase.functions.invoke("health-check", {
        body: { service: "ping" },
      });
      const latency = Date.now() - start;
      
      newServices.push({
        name: "Edge Functions",
        status: response.error ? "offline" : "online",
        latency,
        lastChecked: new Date(),
        error: response.error?.message,
      });
    } catch (error) {
      newServices.push({
        name: "Edge Functions",
        status: "offline",
        error: error instanceof Error ? error.message : "Connection failed",
        lastChecked: new Date(),
      });
    }

    setServices(newServices);
    setIsChecking(false);
  };

  useEffect(() => {
    checkServices();
  }, []);

  const onlineCount = services.filter((s) => s.status === "online").length;
  const overallStatus = onlineCount === services.length ? "healthy" : onlineCount > 0 ? "degraded" : "down";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Real-time status of external API connections
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={overallStatus === "healthy" ? "default" : overallStatus === "degraded" ? "secondary" : "destructive"}
              className={cn(
                overallStatus === "healthy" && "bg-success text-success-foreground",
                overallStatus === "degraded" && "bg-warning text-warning-foreground"
              )}
            >
              {overallStatus === "healthy" ? "All Systems Operational" : 
               overallStatus === "degraded" ? "Partial Outage" : "System Down"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={checkServices}
              disabled={isChecking}
              className="gap-2"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-center justify-between rounded-lg border border-border p-4 transition-colors",
                service.status === "online" && "bg-success/5 border-success/30",
                service.status === "offline" && "bg-destructive/5 border-destructive/30",
                service.status === "checking" && "bg-secondary/50"
              )}
            >
              <div className="flex items-center gap-3">
                {service.status === "checking" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : service.status === "online" ? (
                  <Wifi className="h-5 w-5 text-success" />
                ) : (
                  <WifiOff className="h-5 w-5 text-destructive" />
                )}
                <div>
                  <p className="font-medium text-foreground">{service.name}</p>
                  {service.error && (
                    <p className="text-xs text-destructive">{service.error}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {service.latency && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {service.latency}ms
                  </div>
                )}
                {service.status === "online" ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : service.status === "offline" ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-secondary/30 p-3">
          <p className="text-xs text-muted-foreground">
            Last checked: {services[0]?.lastChecked?.toLocaleTimeString() || "Never"} • 
            Services automatically checked on page load
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
