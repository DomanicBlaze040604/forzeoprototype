import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Globe,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Link2,
  Bot,
  Calendar,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface URLCitation {
  id: string;
  url: string;
  domain: string;
  citation_count: number;
  engines: string[];
  prompts: Array<{ id: string; text: string }>;
  first_seen_at: string;
  last_seen_at: string;
  verification_status: "verified" | "unverified" | "pending" | "failed";
  trust_score: number;
}

interface TopicCluster {
  name: string;
  urls: URLCitation[];
  totalCitations: number;
}

interface URLCitationHeatmapProps {
  citations: URLCitation[];
  loading?: boolean;
  onVerifyURL?: (url: string) => void;
}

function getVerificationIcon(status: string) {
  switch (status) {
    case "verified":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "pending":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    default:
      return <Link2 className="h-4 w-4 text-muted-foreground" />;
  }
}

function getTrustColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function getBubbleSize(count: number, maxCount: number): number {
  const minSize = 40;
  const maxSize = 120;
  return minSize + (count / maxCount) * (maxSize - minSize);
}

export function URLCitationHeatmap({
  citations,
  loading = false,
  onVerifyURL,
}: URLCitationHeatmapProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedURL, setSelectedURL] = useState<URLCitation | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"bubble" | "list" | "cluster">("bubble");

  // Filter and sort citations
  const filteredCitations = useMemo(() => {
    return citations
      .filter((c) => {
        const matchesSearch =
          c.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.domain.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          filterStatus === "all" || c.verification_status === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.citation_count - a.citation_count);
  }, [citations, searchQuery, filterStatus]);

  // Group by domain for clustering
  const topicClusters = useMemo(() => {
    const domainMap = new Map<string, URLCitation[]>();
    filteredCitations.forEach((c) => {
      const existing = domainMap.get(c.domain) || [];
      domainMap.set(c.domain, [...existing, c]);
    });

    return Array.from(domainMap.entries())
      .map(([domain, urls]) => ({
        name: domain,
        urls,
        totalCitations: urls.reduce((sum, u) => sum + u.citation_count, 0),
      }))
      .sort((a, b) => b.totalCitations - a.totalCitations);
  }, [filteredCitations]);

  const maxCitations = Math.max(...citations.map((c) => c.citation_count), 1);
  const totalCitations = citations.reduce((sum, c) => sum + c.citation_count, 0);
  const verifiedCount = citations.filter((c) => c.verification_status === "verified").length;
  const avgTrustScore = citations.length > 0
    ? Math.round(citations.reduce((sum, c) => sum + c.trust_score, 0) / citations.length)
    : 0;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              URL Citation Heatmap
            </CardTitle>
            <CardDescription>
              Detailed view of all URLs cited by AI engines
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-success border-success/30">
              {verifiedCount} Verified
            </Badge>
            <Badge variant="outline">
              {totalCitations} Total Citations
            </Badge>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{citations.length}</p>
            <p className="text-xs text-muted-foreground">Unique URLs</p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{topicClusters.length}</p>
            <p className="text-xs text-muted-foreground">Domains</p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{avgTrustScore}%</p>
            <p className="text-xs text-muted-foreground">Avg Trust</p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {citations.flatMap((c) => c.engines).filter((v, i, a) => a.indexOf(v) === i).length}
            </p>
            <p className="text-xs text-muted-foreground">Engines</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search URLs or domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All
            </Button>
            <Button
              variant={filterStatus === "verified" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("verified")}
            >
              Verified
            </Button>
            <Button
              variant={filterStatus === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("pending")}
            >
              Pending
            </Button>
            <Button
              variant={filterStatus === "failed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("failed")}
            >
              Failed
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="bubble">Bubble View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="cluster">Domain Clusters</TabsTrigger>
          </TabsList>

          {/* Bubble View */}
          <TabsContent value="bubble">
            <TooltipProvider>
              <div className="flex flex-wrap gap-3 justify-center p-4 min-h-[300px]">
                {filteredCitations.slice(0, 30).map((citation, index) => {
                  const size = getBubbleSize(citation.citation_count, maxCitations);
                  return (
                    <Tooltip key={citation.id}>
                      <TooltipTrigger>
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className={cn(
                            "rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 relative",
                            getTrustColor(citation.trust_score)
                          )}
                          style={{ width: size, height: size }}
                          onClick={() => setSelectedURL(citation)}
                        >
                          <span className="text-xs font-bold text-white">
                            {citation.citation_count}
                          </span>
                          <div className="absolute -top-1 -right-1">
                            {getVerificationIcon(citation.verification_status)}
                          </div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">{citation.domain}</p>
                        <p className="text-xs text-muted-foreground truncate">{citation.url}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span>{citation.citation_count} citations</span>
                          <span>•</span>
                          <span>{citation.trust_score}% trust</span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredCitations.map((citation, index) => (
                  <motion.div
                    key={citation.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedURL(citation)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                          getTrustColor(citation.trust_score)
                        )}
                      >
                        <span className="text-xs font-bold text-white">
                          {citation.citation_count}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {citation.domain}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {citation.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {citation.engines.slice(0, 3).map((engine) => (
                          <Badge key={engine} variant="outline" className="text-xs">
                            {engine}
                          </Badge>
                        ))}
                        {citation.engines.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{citation.engines.length - 3}
                          </Badge>
                        )}
                      </div>
                      {getVerificationIcon(citation.verification_status)}
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Cluster View */}
          <TabsContent value="cluster">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {topicClusters.slice(0, 15).map((cluster, index) => (
                  <motion.div
                    key={cluster.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{cluster.name}</span>
                      </div>
                      <Badge variant="secondary">
                        {cluster.totalCitations} citations
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cluster.urls.map((url) => (
                        <div
                          key={url.id}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs cursor-pointer transition-colors",
                            getTrustColor(url.trust_score),
                            "text-white hover:opacity-80"
                          )}
                          onClick={() => setSelectedURL(url)}
                        >
                          {url.citation_count}x
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>High Trust (80%+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span>Medium (60-79%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-orange-500" />
            <span>Low (40-59%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>Risk (&lt;40%)</span>
          </div>
        </div>
      </CardContent>

      {/* URL Detail Dialog */}
      <Dialog open={!!selectedURL} onOpenChange={() => setSelectedURL(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getVerificationIcon(selectedURL?.verification_status || "pending")}
              URL Details
            </DialogTitle>
            <DialogDescription>
              Detailed citation information for this URL
            </DialogDescription>
          </DialogHeader>
          {selectedURL && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary/30 p-4">
                <p className="text-sm font-medium text-foreground mb-1">
                  {selectedURL.domain}
                </p>
                <a
                  href={selectedURL.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {selectedURL.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-secondary/30 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {selectedURL.citation_count}
                  </p>
                  <p className="text-xs text-muted-foreground">Citations</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {selectedURL.trust_score}%
                  </p>
                  <p className="text-xs text-muted-foreground">Trust Score</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {selectedURL.engines.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Engines</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Cited by Engines
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedURL.engines.map((engine) => (
                    <Badge key={engine} variant="outline">
                      <Bot className="mr-1 h-3 w-3" />
                      {engine}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Related Prompts ({selectedURL.prompts.length})
                </p>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {selectedURL.prompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className="rounded-lg bg-secondary/20 p-2 text-sm text-muted-foreground"
                      >
                        {prompt.text}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  First seen: {format(new Date(selectedURL.first_seen_at), "MMM d, yyyy")}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Last seen: {format(new Date(selectedURL.last_seen_at), "MMM d, yyyy")}
                </div>
              </div>

              {onVerifyURL && selectedURL.verification_status !== "verified" && (
                <Button
                  className="w-full"
                  onClick={() => {
                    onVerifyURL(selectedURL.url);
                    setSelectedURL(null);
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Verify This URL
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
