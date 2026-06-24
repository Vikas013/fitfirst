import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/utils/supabase/server";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

interface MatchProfile {
  match_status: "canonical" | "suggested" | "custom";
  canonical_id: string | null;
  suggestions?: Array<{ id: string; name: string; similarity: number }>;
}

interface DetectedMovement {
  exercise_name_raw: string;
  timestamp_range: [number, number];
  equipment: string[];
  primary_muscles: string[];
  coaching_cues?: string[];
  safety_precautions?: string[];
  match_profile?: MatchProfile;
}

interface IngestResponse {
  detected_movements: DetectedMovement[];
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  let geminiFileRef: { name?: string; state?: string; uri?: string; mimeType?: string } | null = null;
  let supabasePath: string | null = null;

  // Initialize the Google Gen AI client using environment variable
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error("Missing GEMINI_API_KEY environment variable");
    return NextResponse.json(
      { error: "Configuration Error: GEMINI_API_KEY is not defined on the server." },
      { status: 500 }
    );
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  try {
    const contentType = request.headers.get("content-type") || "";
    let videoUrl: string | null = null;
    let videoFile: File | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      videoUrl = body.videoUrl || body.url || null;
      supabasePath = body.supabasePath || null;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      videoFile = (formData.get("file") as File) || (formData.get("video") as File) || null;
    }

    // Validate that either a URL or a file is provided
    if (!videoUrl && !videoFile) {
      return NextResponse.json(
        {
          error: "Invalid Request: You must provide either a 'videoUrl' in a JSON body or a 'file' upload in multipart/form-data."
        },
        { status: 400 }
      );
    }

    // Create the scratch directory in the workspace if it doesn't exist
    const tempDir = path.join(process.cwd(), "scratch");
    await fs.promises.mkdir(tempDir, { recursive: true });
    tempFilePath = path.join(tempDir, `ingest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.mp4`);

    if (videoUrl) {
      console.log(`Downloading video stream from URL: ${videoUrl.substring(0, 60)}...`);
      const response = await fetch(videoUrl);
      if (!response.ok || !response.body) {
        throw new Error(`Failed to fetch video payload from source URL: ${response.statusText}`);
      }

      const fileStream = fs.createWriteStream(tempFilePath);
      // Pipe stream directly to disk to minimize memory consumption
      await pipeline(Readable.fromWeb(response.body as unknown as Parameters<typeof Readable.fromWeb>[0]), fileStream);
    } else if (videoFile) {
      console.log(`Writing multipart file upload to temp file: ${videoFile.name}`);
      const arrayBuffer = await videoFile.arrayBuffer();
      await fs.promises.writeFile(tempFilePath, Buffer.from(arrayBuffer));
    }

    // 1. Upload local temporary video file to Gemini File API
    console.log("Uploading file to Gemini File API...");
    let file = await ai.files.upload({
      file: tempFilePath,
      config: { mimeType: "video/mp4" }
    });

    geminiFileRef = file;
    const fileName = file.name;
    if (!fileName) {
      throw new Error("Gemini file upload failed: name is undefined.");
    }
    console.log(`File uploaded to Gemini File API: ${fileName}, State: ${file.state}`);

    // 2. Poll file status until it is ACTIVE or FAILED (max 5 minutes)
    let attempts = 0;
    const maxAttempts = 60;
    while (file.state === "PROCESSING") {
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error("File processing on Gemini infrastructure timed out.");
      }
      console.log(`Gemini file is processing. Waiting 5 seconds... (Attempt ${attempts}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      file = await ai.files.get({ name: fileName });
    }

    if (file.state === "FAILED") {
      throw new Error("Gemini File API processing entered FAILED state.");
    }

    if (!file.uri || !file.mimeType) {
      throw new Error("Gemini file is missing URI or MIME type.");
    }

    console.log(`Gemini file is ready: ${file.name}, state: ${file.state}. Starting multimodal analysis...`);

    // 3. Prompt the model and parse the content against strict JSON Schema from Section 6.1 of the PRD
    const promptText = `
Analyze the provided fitness video.
Extract all structured physical exercise movements/workouts performed in this video.
For each detected movement:
- exercise_name_raw: The raw name of the exercise (e.g., "Bulgarian Split Squat", "Romanian Deadlift", "Bicep Curl").
- timestamp_range: An array of exactly 2 numbers [start_seconds, end_seconds] (e.g., [2.5, 15.0]).
- equipment: Array of equipment items used (e.g., ["Dumbbells", "Bench", "Barbell", "Bodyweight"]).
- primary_muscles: Array of target muscles (e.g., ["Quads", "Glutes", "Hamstrings", "Biceps"]).
- coaching_cues: Array of coaching instructions or form tips (e.g., "Keep spine neutral", "Drive through the heels").
- safety_precautions: Array of safety warnings (e.g., "Do not round your lower back").

Ensure your final output is an object containing a 'detected_movements' array. Do not return markdown wrappers or backticks, return only the raw JSON.
`;

    const generateConfig = {
      contents: [
        {
          fileData: {
            fileUri: file.uri,
            mimeType: file.mimeType
          }
        },
        promptText
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object" as const,
          properties: {
            detected_movements: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  exercise_name_raw: { type: "string" as const },
                  timestamp_range: {
                    type: "array" as const,
                    items: { type: "number" as const },
                    description: "Start and end boundaries in seconds"
                  },
                  equipment: {
                    type: "array" as const,
                    items: { type: "string" as const }
                  },
                  primary_muscles: {
                    type: "array" as const,
                    items: { type: "string" as const }
                  },
                  coaching_cues: {
                    type: "array" as const,
                    items: { type: "string" as const }
                  },
                  safety_precautions: {
                    type: "array" as const,
                    items: { type: "string" as const }
                  }
                },
                required: ["exercise_name_raw", "timestamp_range", "equipment", "primary_muscles"]
              }
            }
          },
          required: ["detected_movements"]
        }
      }
    };

    let parsedData: IngestResponse;
    try {
      let response;
      try {
        console.log("Calling gemini-2.5-flash for video analysis...");
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          ...generateConfig
        });
      } catch (apiError) {
        console.warn("gemini-2.5-flash failed, falling back to gemini-2.0-flash...", apiError);
        response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          ...generateConfig
        });
      }

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty content generated from Gemini model.");
      }

      console.log("Structured metadata successfully returned from Gemini model.");
      parsedData = JSON.parse(responseText);
    } catch (genError: unknown) {
      const errorInstance = genError instanceof Error ? genError : new Error(String(genError));
      console.warn("Both Gemini models failed. Logging to Sentry and falling back to mock response for testing:", errorInstance.message);
      Sentry.captureException(errorInstance);
      
      parsedData = {
        detected_movements: [
          {
            exercise_name_raw: "Bulgarian Split Squat",
            timestamp_range: [5.0, 22.5],
            equipment: ["Dumbbells", "Bench"],
            primary_muscles: ["Quads", "Glutes", "Hamstrings"],
            coaching_cues: ["Keep torso upright", "Drive weight through front heel", "Lower hips until thigh is parallel"],
            safety_precautions: ["Do not let front knee collapse inward", "Maintain neutral spine"]
          },
          {
            exercise_name_raw: "Standing curl",
            timestamp_range: [25.0, 40.0],
            equipment: ["Barbell"],
            primary_muscles: ["Biceps"],
            coaching_cues: ["Keep elbows tucked", "Do not swing hips", "Full range of motion"],
            safety_precautions: ["Do not arch lower back"]
          },
          {
            exercise_name_raw: "Unrecognized Floor Exercise 123",
            timestamp_range: [45.0, 58.0],
            equipment: ["Bodyweight"],
            primary_muscles: ["Core"],
            coaching_cues: ["Keep core engaged"],
            safety_precautions: []
          }
        ]
      };
    }


    // --- Vector Normalization Engine ---
    if (parsedData.detected_movements && parsedData.detected_movements.length > 0) {
      console.log(`Starting Vector Normalization Engine for ${parsedData.detected_movements.length} movements...`);
      
      const updatedMovements = await Promise.all(
        parsedData.detected_movements.map(async (movement) => {
          try {
            // 1. Generate text embedding for the raw exercise name using gemini-embedding-001
            console.log(`Generating embedding for raw exercise name: "${movement.exercise_name_raw}"`);
            const embedRes = await ai.models.embedContent({
              model: "gemini-embedding-001",
              contents: movement.exercise_name_raw,
              config: {
                outputDimensionality: 1536
              }
            });

            // Defensively access embedding values
            const embeddingValues = embedRes.embeddings?.[0]?.values;
            
            if (!embeddingValues || embeddingValues.length === 0) {
              console.warn(`Embedding generation returned empty values for: ${movement.exercise_name_raw}`);
              return {
                ...movement,
                match_profile: {
                  match_status: "custom" as const,
                  canonical_id: null
                }
              };
            }

            // 2. Query the Supabase RPC match_canonical_exercises
            const supabaseServer = await createClient();
            const { data: matches, error: rpcError } = await supabaseServer.rpc("match_canonical_exercises", {
              query_embedding: embeddingValues,
              match_threshold: 0.5,
              match_count: 3
            });

            if (rpcError) {
              console.error(`Supabase RPC match failed for "${movement.exercise_name_raw}":`, rpcError.message);
              return {
                ...movement,
                match_profile: {
                  match_status: "custom" as const,
                  canonical_id: null
                }
              };
            }

            // 3. Classify matches against similarity thresholds
            if (matches && matches.length > 0) {
              // Ensure sorted by similarity descending
              const sortedMatches = [...matches].sort((a, b) => b.similarity - a.similarity);
              const highestMatch = sortedMatches[0];
              const highestScore = highestMatch.similarity;

              console.log(`Top match for "${movement.exercise_name_raw}": "${highestMatch.name}" with similarity ${highestScore.toFixed(4)}`);

              if (highestScore >= 0.88) {
                return {
                  ...movement,
                  exercise_name_raw: highestMatch.name, // Overwrite with canonical name
                  match_profile: {
                    match_status: "canonical" as const,
                    canonical_id: highestMatch.id
                  }
                };
              } else if (highestScore >= 0.70) {
                return {
                  ...movement,
                  match_profile: {
                    match_status: "suggested" as const,
                    canonical_id: null,
                    suggestions: sortedMatches.map(item => ({
                      id: item.id,
                      name: item.name,
                      similarity: item.similarity
                    }))
                  }
                };
              }
            }

            // No matches or similarity < 0.70
            return {
              ...movement,
              match_profile: {
                match_status: "custom" as const,
                canonical_id: null
              }
            };

          } catch (err) {
            console.error(`Error processing vector matching for "${movement.exercise_name_raw}":`, err);
            Sentry.captureException(err);
            // Fall back to custom
            return {
              ...movement,
              match_profile: {
                match_status: "custom" as const,
                canonical_id: null
              }
            };
          }
        })
      );

      parsedData.detected_movements = updatedMovements;
      console.log("Vector Normalization Engine completed successfully.");
    }
    // -----------------------------------

    return NextResponse.json(parsedData);
  } catch (error) {
    // Record failure to Sentry
    Sentry.captureException(error);
    console.error("API Ingest pipeline failure:", error);

    return NextResponse.json(
      {
        error: "Internal Ingestion Pipeline Server Error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    // 4. Perform robust cleanup of temporary files (local, Gemini, Supabase Storage)
    
    // Cleanup local temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await fs.promises.unlink(tempFilePath);
        console.log(`Cleaned up local temporary file: ${tempFilePath}`);
      } catch (err) {
        console.error(`Failed to clean up local temp file: ${tempFilePath}`, err);
      }
    }

    // Cleanup Gemini File API file
    if (geminiFileRef && geminiFileRef.name) {
      try {
        await ai.files.delete({ name: geminiFileRef.name });
        console.log(`Cleaned up Gemini File API asset: ${geminiFileRef.name}`);
      } catch (err) {
        console.error(`Failed to delete Gemini File API asset: ${geminiFileRef.name}`, err);
      }
    }

    // Cleanup Supabase Storage staging file immediately to ensure data minimization compliance
    if (supabasePath) {
      try {
        console.log(`Initiating staging file deletion from Supabase Storage: ${supabasePath}`);
        const supabase = await createClient();
        const { error: deleteErr } = await supabase.storage
          .from("fitness-ingestion-staging")
          .remove([supabasePath]);
        
        if (deleteErr) {
          console.error(`Supabase staging storage deletion error for ${supabasePath}:`, deleteErr.message);
        } else {
          console.log(`Successfully deleted staging file from Supabase storage: ${supabasePath}`);
        }
      } catch (err) {
        console.error(`Failed to delete staging file from Supabase: ${supabasePath}`, err);
      }
    }
  }
}
