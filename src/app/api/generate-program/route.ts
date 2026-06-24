import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface CatalogExercise {
  name: string;
  canonical_id: string | null;
}

export async function POST(request: NextRequest) {
  try {
    let prompt: string;
    try {
      const body = await request.json();
      prompt = body?.prompt;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON: The request body must be valid JSON containing a 'prompt' string." },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Invalid Request: You must provide a valid 'prompt' string." },
        { status: 400 }
      );
    }

    // Initialize Supabase and check session
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.getUser();
    const user = data?.user;

    if (authError || !user) {
      console.error("Authentication failed for generate-program:", authError);
      return NextResponse.json(
        { error: "Unauthorized: Please log in to generate programs." },
        { status: 401 }
      );
    }

    // Query workouts logged by the user to extract exercise catalog
    const { data: workouts, error: dbError } = await supabase
      .from("workouts")
      .select("notes, canonical_id")
      .eq("user_id", user.id);

    if (dbError) {
      Sentry.captureException(dbError);
      console.error("Database query failed for generate-program:", dbError);
      return NextResponse.json(
        { error: "Internal Database Error: Failed to fetch logged workouts." },
        { status: 500 }
      );
    }

    // Parse distinct exercises from the workouts notes
    // Use a Map to prioritize workouts with a non-null canonical_id if they exist
    const exerciseMap = new Map<string, CatalogExercise>();

    if (workouts) {
      for (const w of workouts) {
        if (!w.notes) continue;
        // Parse the first line which contains the raw exercise name
        const firstLine = w.notes.split("\n")[0];
        if (firstLine && firstLine.startsWith("Exercise: ")) {
          const name = firstLine.substring("Exercise: ".length).trim();
          if (name) {
            const key = name.toLowerCase();
            const existing = exerciseMap.get(key);
            const canonicalId = w.canonical_id || null;
            if (!existing) {
              exerciseMap.set(key, { name, canonical_id: canonicalId });
            } else if (!existing.canonical_id && canonicalId) {
              // Upgrade to the non-null canonical_id if we found one
              existing.canonical_id = canonicalId;
            }
          }
        }
      }
    }

    const exercisesList = Array.from(exerciseMap.values());
    console.log(`User has ${exercisesList.length} distinct exercises logged in catalog.`);

    // If no exercises found, return 400 with helpful instruction
    if (exercisesList.length === 0) {
      return NextResponse.json(
        { 
          error: "Catalog Empty: You have no workouts logged. Please ingest and log some fitness videos first to populate your personal exercise catalog." 
        },
        { status: 400 }
      );
    }


    // Initialize Google GenAI client
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return NextResponse.json(
        { error: "Configuration Error: GEMINI_API_KEY is not defined on the server." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // Format list of exercises as string for instructions
    const exercisesFormatted = exercisesList.map(e => `- ${e.name} (Canonical ID: ${e.canonical_id || "None"})`).join("\n");

    const systemInstruction = `
You are an expert AI Workout Generator.
Your job is to design a comprehensive training program split based on the user's prompt.

Crucially, you are ONLY allowed to select physical exercise movements from the user's personal exercise catalog provided below.
DO NOT include any outside exercises, variations, or custom movements not listed. No exceptions.
If the split requires more exercises than are present in the catalog, only split using the available catalog exercises.

User's Exercise Catalog:
${exercisesFormatted}

Instructions:
- Map each exercise in the routine to its exact match in the catalog.
- If the matched exercise has a Canonical ID in the catalog, set 'canonical_id' to that ID. If it has no Canonical ID (e.g., None), set 'canonical_id' to null.
- Provide appropriate values for 'sets' (integer), 'reps_range' (string like "8-12" or "5 reps"), and 'rest_seconds' (integer).
`;

    const generateConfig = {
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object" as const,
          properties: {
            program_name: { type: "string" as const, description: "Title of the workout program" },
            days: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  day_name: { type: "string" as const, description: "Name of the day, e.g. Day 1: Upper Body" },
                  routine: {
                    type: "array" as const,
                    items: {
                      type: "object" as const,
                      properties: {
                        exercise_name: { type: "string" as const },
                        canonical_id: { type: "string" as const, nullable: true },
                        sets: { type: "integer" as const },
                        reps_range: { type: "string" as const },
                        rest_seconds: { type: "integer" as const }
                      },
                      required: ["exercise_name", "canonical_id", "sets", "reps_range", "rest_seconds"]
                    }
                  }
                },
                required: ["day_name", "routine"]
              }
            }
          },
          required: ["program_name", "days"]
        }
      }
    };

    let response;
    try {
      console.log("Calling gemini-2.5-flash with JSON schema program output...");
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        ...generateConfig
      });
    } catch (apiError) {
      console.warn("gemini-2.5-flash failed or is currently experiencing high demand. Falling back to gemini-2.0-flash...", apiError);
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          ...generateConfig
        });
      } catch (fallbackError) {
        console.error("Both gemini-2.5-flash and gemini-2.0-flash failed:", fallbackError);
        throw fallbackError;
      }
    }


    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty content returned from Gemini model.");
    }

    const programData = JSON.parse(responseText);
    return NextResponse.json(programData);

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    Sentry.captureException(err);
    console.error("AI Workout Program generation failed:", err.message);
    return NextResponse.json(
      { error: "Generation Failed: Internal Ingestion/Generation Server Error" },
      { status: 500 }
    );
  }
}
