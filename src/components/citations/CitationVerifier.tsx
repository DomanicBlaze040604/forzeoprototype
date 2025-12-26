import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCitationVerification } from "@/hooks/useCitationVerification";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldQuestion,
  Loader2,
  ExternalLink,
  Sparkles
} from "lucide-react";

interface CitationVerifierProps {
  onVerificationComplete?: (results: any[]) => void;
}

export function CitationVerifier({ onVerificationComplete }: CitationVerifierProps) {
  const [url, setUrl] = useState("");
  const [claim, setClaim] = useState("");
  const { 
    verifyCitation, 
    verifying, 
    progress, 
    results, 
    loadingModel, 
    modelLoaded 
  } = useCitationVerification();

  const handleVerify = async () => {
    if (!url || !claim) return;
    
    const result = await verifyCitation(url, claim);
    if (result && onVerificationComplete) {
      onVerificationComplete([result]);
    }
    
    setUrl("");
    setClaim("");
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "low":
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case "medium":
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case "high":
      case "very_high":
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      default:
        return <ShieldQuestion className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskBadgeVariant = (risk: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (risk) {
      case "low":
        return "default";
      case "medium":
        return "secondary";
      case "high":
      case "very_high":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Citation Verification Engine
          </CardTitle>
          <CardDescription>
            Verify if AI-cited URLs actually support their claims using local embeddings (no API cost)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant={modelLoaded ? "default" : "outline"}>
              {loadingModel ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Loading Model...
                </>
              ) : modelLoaded ? (
                "Model Ready"
              ) : (
                "Model Not Loaded"
              )}
            </Badge>
            <span className="text-muted-foreground">
              Using HuggingFace all-MiniLM-L6-v2 (384 dimensions)
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Source URL</label>
              <Input
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={verifying}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">AI Claim to Verify</label>
              <Textarea
                placeholder="Enter the claim made by the AI that cites this URL..."
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                disabled={verifying}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleVerify} 
              disabled={!url || !claim || verifying}
              className="w-full"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Verify Citation
                </>
              )}
            </Button>

            {verifying && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  {progress}% complete
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Results</CardTitle>
            <CardDescription>
              {results.length} citation{results.length !== 1 ? "s" : ""} verified
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result) => (
                <div 
                  key={result.id} 
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getRiskIcon(result.hallucinationRisk)}
                        <a 
                          href={result.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline truncate flex items-center gap-1"
                        >
                          {new URL(result.sourceUrl).hostname}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {result.claimText}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={getRiskBadgeVariant(result.hallucinationRisk)}>
                        {result.hallucinationRisk === "very_high" 
                          ? "Very High Risk" 
                          : `${result.hallucinationRisk.charAt(0).toUpperCase()}${result.hallucinationRisk.slice(1)} Risk`}
                      </Badge>
                      {result.similarityScore !== null && (
                        <span className="text-xs text-muted-foreground">
                          Similarity: {Math.round(result.similarityScore * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {result.verificationStatus}
                    </Badge>
                    <span>•</span>
                    <span>Verified {new Date(result.verifiedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
