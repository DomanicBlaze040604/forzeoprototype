import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VerificationResult {
  id: string;
  sourceUrl: string;
  claimText: string;
  similarityScore: number | null;
  verificationStatus: string;
  hallucinationRisk: string;
  verifiedAt: string;
}

interface UseVerificationReturn {
  verifying: boolean;
  progress: number;
  results: VerificationResult[];
  verifyCitation: (sourceUrl: string, claimText: string) => Promise<VerificationResult | null>;
  verifyBatch: (citations: Array<{ url: string; claim: string }>) => Promise<VerificationResult[]>;
  loadingModel: boolean;
  modelLoaded: boolean;
}

export function useCitationVerification(): UseVerificationReturn {
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const pipelineRef = useRef<any>(null);
  const { toast } = useToast();

  // Load the embedding model lazily
  const loadModel = useCallback(async () => {
    if (pipelineRef.current) return pipelineRef.current;
    
    setLoadingModel(true);
    try {
      const { pipeline, env } = await import("@huggingface/transformers");
      
      // Configure for browser usage
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      
      // Load the embedding model (384 dimensions, matches our DB schema)
      const extractor = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        { device: "webgpu" }
      );
      
      pipelineRef.current = extractor;
      setModelLoaded(true);
      return extractor;
    } catch (error) {
      console.error("Failed to load embedding model:", error);
      toast({
        title: "Model loading failed",
        description: "Could not load the embedding model. Using fallback verification.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoadingModel(false);
    }
  }, [toast]);

  // Generate embeddings for text
  const generateEmbedding = useCallback(async (text: string): Promise<number[] | null> => {
    const extractor = await loadModel();
    if (!extractor) return null;
    
    try {
      // Truncate text if too long
      const truncatedText = text.substring(0, 512);
      const output = await extractor(truncatedText, { pooling: "mean", normalize: true });
      return Array.from(output.data as Float32Array);
    } catch (error) {
      console.error("Embedding generation failed:", error);
      return null;
    }
  }, [loadModel]);

  // Verify a single citation
  const verifyCitation = useCallback(async (
    sourceUrl: string,
    claimText: string
  ): Promise<VerificationResult | null> => {
    setVerifying(true);
    
    try {
      // Step 1: Fetch the source content via edge function
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "verify-citation",
        { body: { sourceUrl, claimText } }
      );

      if (verifyError) {
        throw new Error(verifyError.message);
      }

      const verificationId = verifyData.verification?.id;
      
      if (!verificationId) {
        throw new Error("No verification ID returned");
      }

      // Step 2: Generate embeddings locally
      const claimEmbedding = await generateEmbedding(claimText);
      
      // Get the source content from the verification
      let verification = null;
      try {
        const { data, error } = await supabase
          .from("citation_verifications")
          .select("source_content")
          .eq("id", verificationId)
          .single();
        
        if (!error) {
          verification = data;
        }
      } catch (err) {
        console.warn("Could not fetch verification from database:", err);
      }

      let similarityScore = null;
      let finalStatus = verifyData.verification.verificationStatus;
      let hallucinationRisk = verifyData.verification.hallucinationRisk;

      if (verification?.source_content && claimEmbedding) {
        const sourceEmbedding = await generateEmbedding(verification.source_content);
        
        if (sourceEmbedding) {
          // Step 3: Compute similarity via edge function
          const { data: similarityData, error: simError } = await supabase.functions.invoke(
            "compute-similarity",
            {
              body: {
                verificationId,
                claimEmbedding,
                sourceEmbedding,
              },
            }
          );

          if (!simError && similarityData) {
            similarityScore = similarityData.similarityScore;
            finalStatus = similarityData.verificationStatus;
            hallucinationRisk = similarityData.hallucinationRisk;
          }
        }
      }

      const result: VerificationResult = {
        id: verificationId,
        sourceUrl,
        claimText,
        similarityScore,
        verificationStatus: finalStatus,
        hallucinationRisk,
        verifiedAt: new Date().toISOString(),
      };

      setResults(prev => [...prev, result]);
      return result;
    } catch (error) {
      console.error("Citation verification failed:", error);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Could not verify citation",
        variant: "destructive",
      });
      return null;
    } finally {
      setVerifying(false);
    }
  }, [generateEmbedding, toast]);

  // Verify multiple citations in batch
  const verifyBatch = useCallback(async (
    citations: Array<{ url: string; claim: string }>
  ): Promise<VerificationResult[]> => {
    setVerifying(true);
    setProgress(0);
    const batchResults: VerificationResult[] = [];

    try {
      for (let i = 0; i < citations.length; i++) {
        const citation = citations[i];
        const result = await verifyCitation(citation.url, citation.claim);
        
        if (result) {
          batchResults.push(result);
        }
        
        setProgress(Math.round(((i + 1) / citations.length) * 100));
      }

      toast({
        title: "Verification complete",
        description: `Verified ${batchResults.length} of ${citations.length} citations`,
      });

      return batchResults;
    } catch (error) {
      console.error("Batch verification failed:", error);
      return batchResults;
    } finally {
      setVerifying(false);
      setProgress(100);
    }
  }, [verifyCitation, toast]);

  return {
    verifying,
    progress,
    results,
    verifyCitation,
    verifyBatch,
    loadingModel,
    modelLoaded,
  };
}
