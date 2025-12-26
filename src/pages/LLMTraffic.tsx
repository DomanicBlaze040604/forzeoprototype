import { useState } from "react";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Link2, 
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  features: string[];
}

const integrations: Integration[] = [
  {
    id: "ga4",
    name: "Google Analytics 4",
    description: "Connect your GA4 property to track AI-driven traffic and conversions",
    icon: "📊",
    connected: false,
    features: ["Traffic Attribution", "Conversion Tracking", "User Journey Analysis"]
  },
  {
    id: "adobe",
    name: "Adobe Analytics",
    description: "Enterprise analytics integration for comprehensive traffic insights",
    icon: "🔴",
    connected: false,
    features: ["Advanced Segmentation", "Custom Dimensions", "Real-time Data"]
  },
  {
    id: "segment",
    name: "Segment",
    description: "Customer data platform for unified analytics across tools",
    icon: "🟢",
    connected: false,
    features: ["Data Unification", "Identity Resolution", "Multi-tool Sync"]
  },
];

export default function LLMTraffic() {
  const { isOpen } = useSidebar();
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

  const connectedCount = integrations.filter(i => i.connected).length;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-200 ease-in-out", isOpen ? "ml-56" : "ml-0")}>
        <Header title="LLM Traffic" />
        <main className="p-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">LLM Traffic Analytics</h1>
            <p className="text-muted-foreground">
              Connect your analytics provider to correlate AI visibility with actual site traffic.
            </p>
          </div>

          {/* Connection Status */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Link2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Analytics Connections</h2>
                  <p className="text-sm text-muted-foreground">
                    {connectedCount === 0 
                      ? "No analytics providers connected yet" 
                      : `${connectedCount} provider${connectedCount > 1 ? 's' : ''} connected`}
                  </p>
                </div>
              </div>
              <Badge variant={connectedCount > 0 ? "default" : "secondary"}>
                {connectedCount > 0 ? "Active" : "Setup Required"}
              </Badge>
            </div>
          </div>

          {/* Main CTA Card */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-8 mb-8">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Connect your Google Analytics Account
              </h2>
              <p className="text-muted-foreground mb-6">
                To view the GEO Traffic Funnel and Attribution Models, please connect your existing 
                analytics provider. We use this data to correlate AI visibility with actual site traffic.
              </p>
              <Button size="lg" className="gap-2">
                Connect Google Analytics
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Integration Cards */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Supported Integrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className={cn(
                    "bg-card border rounded-xl p-5 cursor-pointer transition-all",
                    selectedIntegration === integration.id 
                      ? "border-primary ring-1 ring-primary" 
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setSelectedIntegration(integration.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{integration.icon}</span>
                    {integration.connected && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{integration.name}</h4>
                  <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
                  <div className="space-y-1">
                    {integration.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3 text-primary" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant={integration.connected ? "outline" : "default"} 
                    size="sm" 
                    className="w-full mt-4"
                  >
                    {integration.connected ? "Manage" : "Connect"}
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Features Preview */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              What You'll Get After Connecting
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">GEO Traffic Funnel</h4>
                    <p className="text-sm text-muted-foreground">
                      Visualize how AI visibility translates to actual website visits and conversions
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                    <Link2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Attribution Models</h4>
                    <p className="text-sm text-muted-foreground">
                      Understand which AI engines drive the most valuable traffic to your site
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">ROI Measurement</h4>
                    <p className="text-sm text-muted-foreground">
                      Calculate the business impact of your AI visibility improvements
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Traffic Correlation</h4>
                    <p className="text-sm text-muted-foreground">
                      See how changes in AI mentions correlate with traffic patterns
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
