# FitFirst: System Architecture & Technical Proof of Work

Welcome to the technical architecture guide for **FitFirst**, an AI-driven Fitness Content Intelligence platform. This document is designed for developers, system architects, and technical recruiters to showcase how FitFirst solves complex engineering challenges—such as multimodal video analysis, vector similarity matching, database normalization, and LLM orchestration—using a production-grade, serverless stack.

---

## 🏗 High-Level Architecture Overview

FitFirst is built using a modern, type-safe serverless architecture. It enables users to upload exercise videos, automatically extract movement data using multimodal models, match extracted movements against a canonical exercise database using vector search, and generate custom training programs constrained to their personal exercise catalog.

```mermaid
graph TD
    %% Client Layer
    subgraph Client Layer [Frontend Client]
        UI[React Dashboard - Next.js Client]
        RW[Review & Mapping Workspace]
    end

    %% Gateway Layer
    subgraph Gateway Layer [Next.js App Router API]
        IngestAPI[/api/ingest\]
        GenAPI[/api/generate-program\]
    end

    %% AI & LLM Orchestration Layer
    subgraph AI Layer [AI Orchestration Layer]
        GeminiFlash[Gemini 2.5 Flash / 2.0 Fallback]
        GeminiEmbed[Gemini Embedding 001]
    end

    %% Database & Storage Layer
    subgraph Database Layer [Supabase Cloud Database & Storage]
        SStaging[(Supabase Storage: fitness-ingestion-staging)]
        DB[(PostgreSQL Database + pgvector)]
        RPC[[RPC: match_canonical_exercises]]
        HNSW((HNSW Vector Index))
    end

    %% Observability
    Sentry[Sentry Observability]

    %% Data Flows
    UI -->|1. Uploads Video| SStaging
    UI -->|2. Ingest Request| IngestAPI
    IngestAPI -->|3. Downloads Video & Uploads| GeminiFlash
    IngestAPI -->|4. Text Vector Embedding| GeminiEmbed
    IngestAPI -->|5. Vector Search Query| RPC
    RPC -->|6. Cosine Distance Scan| HNSW
    HNSW --> DB
    
    UI -->|7. Program Prompt| GenAPI
    GenAPI -->|8. Queries User Catalog| DB
    GenAPI -->|9. Bounded LLM Prompt| GeminiFlash
    GenAPI -->|10. Batch Schedule Workouts| DB

    %% Observability Connections
    IngestAPI -.->|Telemetry & Errors| Sentry
    GenAPI -.->|Telemetry & Errors| Sentry
```

---

## 🛠 Technology Stack

* **Frontend & Serverless Framework**: Next.js 16 (App Router) + React 19 + TypeScript
* **Styling & UI**: Tailwind CSS (Glassmorphic design system, high-contrast layouts)
* **Backend Database & Storage**: Supabase (PostgreSQL 15+ with the `pgvector` extension)
* **AI & Machine Learning**:
  * `@google/genai` SDK
  * **Multimodal Analysis & Reasoning**: `gemini-2.5-flash` (Primary) with automatic fallback to `gemini-2.0-flash`
  * **Vector Embeddings**: `gemini-embedding-001` (1536-dimensional output)
* **Observability & Error Tracking**: Sentry (fully instrumented via `Sentry.captureException`)

---

## ⚡️ Detailed Core Subsystems

### 1. Multimodal Video Ingestion Pipeline
When a user uploads a workout video, the system extracts the exact exercises, timestamps, and muscle mappings:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (React UI)
    participant API as Ingest Route (/api/ingest)
    participant Storage as Supabase Storage
    participant GeminiFile as Gemini File API
    participant GeminiModel as Gemini Flash (2.5/2.0)

    User->>Storage: Upload video file to 'fitness-ingestion-staging'
    Storage-->>User: Return file path ref
    User->>API: POST /api/ingest { videoUrl, supabasePath }
    API->>Storage: Download video stream (piped to disk to minimize memory)
    API->>GeminiFile: Upload video (config: video/mp4)
    Note over API,GeminiFile: Poll state until ACTIVE
    API->>GeminiModel: generateContent(videoRef, prompt, JSON Schema)
    alt Gemini 2.5 Flash is healthy
        GeminiModel-->>API: Return structured JSON
    else Gemini 2.5 Flash fails (503/429)
        API->>GeminiModel: Fallback request to Gemini 2.0 Flash
        GeminiModel-->>API: Return structured JSON
    end
    API->>Storage: Delete staging file immediately (Data Minimization Compliance)
    API->>GeminiFile: Delete uploaded file asset
    API-->>User: Return detected movements JSON
```

#### Key Architecture Decisions:
* **Memory Optimization**: The video is piped directly from Supabase Storage to the local serverless disk (`scratch/`) using Node.js streams (`pipeline`), avoiding loading large video buffers into RAM.
* **Resiliency Fallback Chain**: If the primary `gemini-2.5-flash` model fails or encounters a `503 High Demand` or `429 Quota limit` error on the free tier, it automatically catches the exception and falls back to `gemini-2.0-flash`.
* **Privacy & GDPR Compliance**: Ingestion staging files are deleted immediately after the pipeline finishes executing, ensuring zero-residual data retention on staging.

---

### 2. Vector Normalization Engine
Raw exercise names extracted by the vision model can vary (e.g., "Standing Curl", "Barbell Bicep Curl", "Biceps Curl"). The Vector Normalization Engine resolves these raw names to canonical exercise records stored in the database.

```mermaid
graph TD
    RawName[Raw Exercise Name: 'Standing Curl'] --> Embed[gemini-embedding-001]
    Embed -->|Generate 1536-dim Vector| Vector([Vector Embedding])
    Vector --> RPC[Supabase RPC: match_canonical_exercises]
    RPC -->|Cosine Similarity Scan| Index[HNSW Index on 'exercises.embedding']

    Index --> CheckCanonical{Similarity >= 0.88?}
    CheckCanonical -->|Yes| CanonicalMatch[Canonical Match: Overwrite name and map canonical_id]
    CheckCanonical -->|No| CheckSuggested{Similarity >= 0.70?}

    CheckSuggested -->|Yes| SuggestedMatch[Suggested Match: Present top 3 matches to user]
    CheckSuggested -->|No| CustomMatch[Custom Match: Keep as custom exercise, canonical_id = null]
```

#### SQL Implementation: Stored Procedure & Indexing
To support high-performance similarity queries, PostgreSQL utilizes the `pgvector` extension, an HNSW (Hierarchical Navigable Small World) index for approximate nearest neighbors, and a cosine distance search RPC function:

```sql
-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Exercises schema with 1536-dimensional embedding
CREATE TABLE public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HNSW Index for rapid cosine distance calculations
CREATE INDEX ON public.exercises 
USING hnsw (embedding vector_cosine_ops);

-- 4. Cosine Similarity RPC Procedure
CREATE OR REPLACE FUNCTION match_canonical_exercises (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  name text,
  similarity float
)
LANGUAGE plpgsql TO authenticated AS $$
BEGIN
  RETURN QUERY
  SELECT
    exercises.id,
    exercises.name,
    1 - (exercises.embedding <=> query_embedding) AS similarity
  FROM exercises
  WHERE 1 - (exercises.embedding <=> query_embedding) > match_threshold
  ORDER BY exercises.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
```

---

### 3. AI Workout Generator Engine
The Workout Generator designs structured routines that are strictly bounded to the user's personal exercise history.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (React UI)
    participant API as Generator Route (/api/generate-program)
    participant DB as Supabase DB

    User->>API: POST /api/generate-program { prompt, activeDate }
    API->>DB: Fetch user logged workouts (notes & canonical_ids)
    DB-->>API: Return logged rows
    Note over API: Extract and deduplicate exercise catalog.<br/>Prioritize non-null canonical_id records.
    API->>API: Build Bounded prompt with exact exercises
    API->>API: Call Gemini (2.5 / 2.0 Fallback) with strict JSON Schema
    API-->>User: Return structured program JSON (Days, Exercises, Sets, Reps)
    User->>DB: Save Program (Batch-insert workouts sequentially starting from selectedDate)
```

#### Deduplication & Mapping Strategy
The generator reads the user's logged workouts, parsing exercise names from raw strings. It uses a `Map` structure to deduplicate exercise names:
* If the user previously performed a movement that has since been normalized to a canonical ID, the catalog extractor automatically upgrades duplicate entries to prioritize the non-null `canonical_id`.
* This guarantees that the generator maps correct canonical links to Gemini, while still preserving custom workouts (`canonical_id: null`).

---

## 🗄 Database Schema Design

```mermaid
erDiagram
    users {
        uuid id PK
        string email
    }
    profiles {
        uuid id PK "FK -> auth.users.id"
        boolean onboarded
        string primary_goal
        integer height
        integer weight
        integer default_steps_goal
    }
    exercises {
        uuid id PK
        string name "UNIQUE"
        vector embedding "1536-dim vector"
    }
    workouts {
        uuid id PK
        uuid user_id FK "FK -> auth.users.id"
        uuid canonical_id FK "FK -> exercises.id, NULLABLE"
        string activity_type "e.g., strength"
        integer duration
        integer calories_burned
        string notes "Contains exercise description, reps, sets, rest"
        timestamp logged_at
    }
    daily_metrics {
        uuid id PK
        uuid user_id FK "FK -> auth.users.id"
        date date
        integer steps
        integer steps_goal
        integer active_minutes
        integer active_minutes_goal
        integer water_intake
        integer water_goal
        integer calories_goal
    }

    users ||--|| profiles : "has profile"
    users ||--o{ workouts : "logs"
    users ||--o{ daily_metrics : "tracks daily"
    exercises ||--o{ workouts : "references canonical"
```

---

## 🚀 Key Recruiter & Engineering Takeaways

* **Serverless Multimodal Processing**: Orchestrates heavy video analysis workflows serverlessly using the Gemini File API and Flash models, keeping the Next.js runtime lightweight.
* **Production-Grade Resiliency**: Includes multi-model fallback routines (`gemini-2.5-flash` $\to$ `gemini-2.0-flash` $\to$ local mock data) preventing rate limits or service unavailability from breaking the user experience.
* **Vector Cosine Similarity & pgvector**: Implemented database-level similarity search using cosine distance algorithms and HNSW indexing, avoiding expensive third-party vector databases.
* **Strict Type Safety**: Generates TypeScript database bindings dynamically from the live database schema (via Supabase CLI / custom scripts) and enforces TypeScript typing throughout the API and client components.
* **Full Sentry Observability**: All DB mutations and third-party API routes are monitored. Errors are captured using Sentry to ensure fast troubleshooting in production.
