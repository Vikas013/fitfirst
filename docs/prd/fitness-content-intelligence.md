Product Requirements Document (PRD)
Document Control
Title: Fitness Content Intelligence Platform (FCIP)
Author: Staff Product Manager
Status: Draft / Ready for Review
Target Release: Q3 2026 (MVP)
Cross-Functional Reviewers: Engineering (AI/ML, Backend, Frontend), Design, QA, Business/Legal
1. Executive Summary & Problem Statement
1.1 Executive Summary
The Fitness Content Intelligence Platform (FCIP) is an AI-powered ingestion and analysis engine that transforms unstructured short-form and long-form video content (YouTube, Instagram, TikTok, and direct uploads) into structured, actionable fitness data.
By leveraging multimodal AI, FCIP extracts exercises, timestamps, equipment requirements, muscle groups, and coaching instructions from video links or files. This data is normalized against a canonical exercise library and saved to the user’s personal database, enabling frictionless workout tracking and AI-driven workout program generation.
1.2 Problem Statement
Fitness enthusiasts and creators consume millions of hours of workout content across social media, yet converting that inspiration into a structured, trackable workout is manual and highly fragmented.
The Friction: Users must manually pause videos, write down exercise names, guess appropriate modifications, and manually log them into a separate fitness tracker.
Data Fragmentation: Variation in exercise terminology (e.g., "DB Bench Press" vs. "Dumbbell Flat Chest Press") prevents clean data logging, progress tracking, and progressive overload automation.
Monetization & Engagement Gap: Creators lack tools to instantly productize their video content into interactive, trackable programs for their followers.
1.3 Product Vision
To bridge the gap between fitness inspiration and structured execution by building the world's most accurate, multimodal Exercise Knowledge Graph. FCIP will serve as the foundational data ingestion layer for our broader AI Ecosystem (encompassing downstream features like real-time form feedback, injury awareness, and automated progressive overload coaching).
2. User Personas & Jobs to Be Done (JTBD)
2.1 User Personas
Persona
Description
Primary Pain Point
Core Need from FCIP
Dylan (The Savvy Consumer)

Intermediate-to-Advanced Gym-goer
Saves dozens of Reels/TikToks weekly for workout inspiration but forgets them by the time he hits the gym floor.
Manual entry is tedious; hard to keep track of variations and formatting across platforms.
Wants to paste a link and instantly get a structured, trackable routine added to his app.
Coach Sarah (The Digital Creator)

Fitness Influencer & Personal Trainer
Publishes high-quality workout videos on YouTube and Instagram; struggles to monetize or convert views to app subscribers.
Translating video content into a PDF or app program is time-consuming.
Wants to turn her video catalog into an interactive, structured workout library for her clients.

2.2 Jobs to Be Done (JTBD)
When I find an inspiring workout video on social media, I want to instantly convert it into a structured list of trackable exercises, so that I can perform it at the gym without switching between my notes app and a video player.
When I build a library of workouts from disparate video sources, I want the exercise names to be automatically standardized and organized by muscle group, so that I can accurately track my training volume and progressive overload over time.
When I am unsure how to perform a newly discovered movement safely, I want the system to flag safety risks and extract specific coaching cues from the video, so that I can avoid injury.
3. Product Goals & Success Metrics
3.1 Business & Product Goals
Drive Activation: Increase Day-1 Core Feature Adoption by making workout creation effortless compared to manual entry templates.
Boost Retention (D7/D30): Retain users through highly personalized AI workout generation rooted in content they actually enjoy.
Data Enrichment: Seed our proprietary Exercise Knowledge Graph with diverse, real-world video variants to continuously train our proprietary computer vision models.
3.2 Success Metrics (KPI Dashboard)
Metric Category
Metric Name
Metric Definition
Target (MVP)
AI Accuracy
Exercise Detection Precision / Recall
% of correctly identified exercises & boundaries out of total video content.
$\ge 92\%$
AI Accuracy
Canonical Mapping Match Rate
% of extracted exercises correctly auto-mapped to the canonical library without user intervention.
$\ge 85\%$
Performance
Processing Latency (Short-form)
End-to-end processing time for videos $< 60$ seconds (Link to Structured Output).
$\le 12 \text{ seconds}$
Performance
Processing Latency (Long-form)
End-to-end processing time for videos $10-30$ minutes.
$\le 90 \text{ seconds}$
Engagement
Video-to-Workout Conversion
% of ingested videos successfully saved to a user's database or workout plan.
$\ge 65\%$
Retention
Platform Virality Coefficient ($K$-Factor)
Shared links generated from parsed workouts leading to new signups.
$K \ge 0.15$

3.3 Non-Goals (Out of Scope for MVP)
Real-time Form Feedback via Camera: This capability belongs to the future AI Workout Coach module and will not run synchronously while a video is processing.
Native Video Hosting: We are not building a social media network or a video hosting service; all user uploads are treated as ephemeral processing assets unless stored securely in private user folders.
Automated Copyright Enforcement: We do not arbitrate copyright; saved workouts store metadata and links back to original public URLs rather than scraping and re-hosting video streams publicly.
4. User Scenarios & MoSCoW Feature Prioritization
4.1 User Stories
US 1 (Ingestion): As a user, I want to paste a YouTube/Instagram/TikTok link or upload an MP4 video so that the system can analyze the visual and audio tracks.
US 2 (AI Extraction): As a user, I want the system to extract exercise names, target muscles, equipment, start/end timestamps, step-by-step instructions, and safety warnings from the video automatically.
US 3 (Verification & Editing): As a user, I want to view a side-by-side breakdown of the parsed video timeline alongside the extracted exercises so I can correct any AI misidentifications before saving.
US 4 (Canonical Normalization): As a user, I want variations in naming to map to a standardized exercise entry so my historical analytics stay consistent.
US 5 (Workout Builder integration): As a user, I want to add these parsed exercises directly into a new or existing workout routine.
US 6 (AI Generator): As a user, I want to ask the AI to generate a full 4-week workout program based on the themes and movements extracted from my saved video library.
4.2 MoSCoW Prioritization Matrix
┌─────────────────────────────────────────────────────────┐
│                      MUST HAVE                          │
│ 1. Multimodal ingestion (Links & Files)                 │
│ 2. Exercise extraction (Name, Muscle, Equipment)        │
│ 3. Temporal localization (Start/End Timestamps)         │
│ 4. Exact matching to Canonical Library                  │
│ 5. Interactive Editing UI (Review Screen)               │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────┐
│                      SHOULD HAVE                        │
│ 1. Audio track speech-to-text integration               │
│ 2. Automated Instruction & Safety Cue extraction         │
│ 3. AI Workout Generator (Prompt-based programs)         │
│ 4. Batch asynchronous video queue processing            │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────┐
│                      COULD HAVE                         │
│ 1. OCR text extraction from overlaid video captions     │
│ 2. Automatic detection of weight/reps from video frames │
│ 3. Direct synchronization with Apple Watch / WearOS      │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────┐
│                      WON'T HAVE                         │
│ 1. Deepfake/Copyright protection suite                  │
│ 2. Real-time synchronous video live-stream scanning      │
└─────────────────────────────────────────────────────────┘

5. Detailed System Architecture & Functional Requirements
5.1 System Data Flow Diagram
[ User Link/File Upload ]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│             Media Processing Pipeline                  │
│  - Video Demuxing (Frames vs. Audio Track)             │
│  - Downsampling & Spatial Normalization                │
└──────────┬──────────────────────────────────┬──────────┘
           │                                  │
           ▼ (Visual Frames)                  ▼ (Audio Track)
┌───────────────────────────┐      ┌───────────────────────────┐
│   Computer Vision Model   │      │    Whisper ASR Model      │
│ - Pose / Motion Tracking  │      │ - Speech-to-Text          │
│ - Object/Equipment Det.   │      │ - Audio Timestamping      │
└──────────┬────────────────┘      └──────────┬────────────────┘
           │                                  │
           └────────────────┬─────────────────┘
                            │ (Combined Tokens & Frame Embeddings)
                            ▼
┌────────────────────────────────────────────────────────┐
│         Multimodal Large Language Model (LLM)          │
│  - Extracts Structure, Instructional Steps, Safety     │
│  - Identifies Coarse Exercises & Temporal Boundaries   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Canonical Normalization Engine              │
│  - Vector Semantic Search over Exercise Database       │
│  - Reconciles naming variants to Base IDs               │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Interactive Review UI                    │
│  - Side-by-Side Review, Adjustments, Manual Overrides  │
└────────────────────────────────────────────────────────┘

5.2 Functional Requirements Specifications (FRS)
FR-1: Multi-Source Media Ingestion
Requirement: The platform must ingest video inputs via URL (YouTube Longform, YouTube Shorts, Instagram Reels, TikTok Video URL) or native local file upload (.mp4, .mov, up to 500MB).
Downstream Action: Ingestion triggers an asynchronous media worker that demuxes audio tracks at 16kHz and extracts visual frames optimized at 5fps to conserve processing tokens.
FR-2: Multimodal Exercise Extraction Engine
Requirement: The system must process visual and audio token arrays simultaneously to output a structured JSON schema per video containing:
exercise_name_raw: String
timestamp_start: Floating-point seconds
timestamp_end: Floating-point seconds
equipment_detected: Array of Strings
target_muscles_primary: Array of Strings
coaching_instructions: Ordered List of Strings
safety_warnings: List of Strings
FR-3: Exercise Canonicalization Engine
Requirement: Raw extracted names must be normalized against the app's master database using semantic embedding metrics (Cosine Similarity over a Vector Database).
Business Rule: If the similarity score $S_c \ge 0.88$, auto-map to the Canonical ID. If $0.70 \le S_c < 0.88$, pass to the user review UI labeled as a "Suggested Match". If $S_c < 0.70$, log as a custom exercise variant and flag for manual internal review to expand our knowledge graph.
FR-4: Interactive Workout Builder Integration
Requirement: Upon verification, the user can select parsed movements via check-boxes and route them to:
A brand new workout routine.
An existing active workout routine.
Their permanent Personal Exercise Catalog.
FR-5: AI Workout Generator
Requirement: Users can issue natural language prompts targeting their imported catalog (e.g., "Generate a 3-day split using only the dumbbell and bodyweight exercises I imported last week, focusing on progressive hypertrophy"). The LLM will construct a compliant workout program returning exact target sets, rep ranges, and rest periods.
6. AI-Specific, Safety & Behavioral Requirements
6.1 Prompt Engineering & Deterministic Output Control
The LLM layer handling structural metadata translation must be tightly bound via structured decoding mechanisms (such as JSON mode or OpenAI Structured Outputs / Instructor library models) to guarantee conformance to the system's runtime types.
Target JSON Schema Constraint
JSON
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ExtractedWorkoutWorkoutVideoData",
  "type": "object",
  "properties": {
    "detected_movements": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "exercise_name_raw": { "type": "string" },
          "timestamp_range": {
            "type": "array",
            "items": { "type": "number" },
            "minItems": 2,
            "maxItems": 2
          },
          "equipment": { "type": "array", "items": { "type": "string" } },
          "primary_muscles": { "type": "array", "items": { "type": "string" } },
          "coaching_cues": { "type": "array", "items": { "type": "string" } },
          "safety_precautions": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["exercise_name_raw", "timestamp_range", "equipment", "primary_muscles"]
      }
    }
  },
  "required": ["detected_movements"]
}

6.2 Guardrails, Hallucination Prevention, and Safety Controls
Hallucination Check: The system must match identified equipment items against the visual objects detected within that segment's temporal frame boundary. If the LLM generates an exercise requiring a barbell, but the computer vision model detects zero barbells throughout the video file duration, the confidence score drops, triggering an automatic human-in-the-loop review flag.
Safety Extraction Model: The AI must explicitly search for risky movement thresholds (e.g., "ego lifting," rapid spine flexing, explosive bouncing at bottom of reps). If present in audio transcripts or inferred visually, the system prepends a bolded AI Safety Note to the workout block.
Medical Disclaimer Requirement: Every generated instruction payload must dynamically display the system disclosure footer:
"Generated by AI Fitness Analytics. Form descriptions are informational. Consult a certified health practitioner before engaging in heavy lifting patterns."
7. Lifecycle User Flows & UX Edge Cases
7.1 Primary Happy Path Flow
User copies an Instagram Reel link detailing an "Intense Leg Day Finisher".
User opens the AI Fitness application $\rightarrow$ Taps "+ Ingest Workout Video" $\rightarrow$ Pastes Link.
System shows an active, processing skeleton loader highlighting key stages: [Downloading Video] $\rightarrow$ [Analyzing Movement Modalities] $\rightarrow$ [Mapping Exercises].
Inside of 12 seconds, the screen transitions to the Review & Verify Workspace.
The original video sits pinned at the top or left of the interface. Below it, interactive, timestamped blocks appear: Bulgarian Split Squat (0:02 - 0:15) and Romanian Deadlift (0:16 - 0:45).
The user clicks "Confirm & Commit to Catalog". The movements enter their application profile seamlessly.
7.2 Exception & Edge Case Management
Scenario / Edge Case
System Detection Mechanism
Core Behavioral Mitigations
Parsing a Non-Fitness Video (e.g., Cooking Recipe Link or Pet video)
Zero fitness-related semantic tokens matched in audio/visual profiles.
Terminate pipeline immediately. Present alert modal: "We couldn't detect any structured fitness exercises in this video. Please ensure your link features workout or physical training sequences."
Hyper-Edits & Multi-Split Cuts (1-second rapid montage transitions)
Sequence parser flags frame variance limits exceeding standard motion models.
Group rapidly shifting frames into a single compound block entry labeled: "Dynamic High-Intensity Transition Interval", inviting the user to manually slice the components.
Private or Geoblocked Videos
Ingestion worker receives a 403 Forbidden or 404 Not Found response from external platform APIs.
Halt background operation safely. Trigger user-facing toast indicator: "This video is restricted or set to private on its source platform. Try downloading the video file and uploading it directly instead."

8. Permissions, Roles & Business Security Policy
8.1 RBAC Configuration (Role-Based Access Control)
User Role
Ingestion Limits
Processing Pipeline Access
Catalog Write Scope
Administrative Capabilities
Free Tier Athlete
3 Ingestions / Month
Standard low-priority processing queue.
Private Personal Database only.
None.
Premium Tier Athlete
Unlimited Ingestions
High-priority immediate compute instance allocation.
Private Personal Database only.
None.
Verified Coach / Creator
Unlimited Ingestions
High-priority processing pipeline.
Public/Shared Team Templates & Custom Branded Library spaces.
Can generate deep links to distribute routines to followers.
Internal Admin / Moderation
Unlimited
Complete system analytics workspace exposure.
Master Canonical Exercise Dictionary database.
Can merge synonyms and prune false positive AI trends.

8.2 Security, Privacy, and Content Retention Policies
Data Minimization: Raw source media files uploaded directly by users are stored securely in encrypted AWS S3 buckets and scheduled for hard deletion 48 hours post-processing to minimize storage overhead and data privacy exposure.
Metadata Retention: Only derived structured JSON metadata arrays, performance metrics, and external link references remain permanently attached to user accounts.
9. Measurable Core Metrics & Analytics Instrumentations
To monitor real-world model reliability and performance, the engineering team must instrument explicit event tracking hooks via standard telemetry platforms (Mixpanel / Amplitude / Datadog).
JavaScript
// Example Event Tracking Schema for Telemetry Validation
analytics.track("Video Ingestion Pipeline Completed", {
  userId: "usr_8749201a",
  userTier: "Premium_Athlete",
  sourcePlatform: "Instagram_Reels",
  processingDurationSeconds: 8.42,
  rawMovementsExtractedCount: 4,
  canonicalMatchCount: 3,
  suggestedMatchCount: 1,
  unmappedCustomCount: 0,
  confidenceScoreMean: 0.942
});

Performance Monitoring Framework
Track AI_Model_Execution_Failed events categorized by explicit error classes (TOKEN_LIMIT_EXCEEDED, TRANSCRIPT_FETCH_TIMEOUT, LOW_CONFIDENCE_REJECTION).
Track User_Override_Adjustment actions to capture fields where users manually alter text or timing, highlighting drift patterns in the AI engine's performance.
10. Implementation Roadmap & Phased MVP Definition
       Q3 2026                 Q4 2026                 Q1 2027
┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
│      PHASE 1         ││      PHASE 2         ││      PHASE 3         │
│  The Ingestion Core  ││ Advanced Processing  ││  Ecosystem Launch    │
│      (MVP)           ││    & Automation      ││     & Monetization   │
└──────────────────────┘└──────────────────────┘└──────────────────────┘

10.1 Phase 1: The Ingestion Core (MVP Focus)
Scope:
Ingest public YouTube Shorts and Instagram Reels via link submission.
Basic multimodal computer vision frame evaluation to extract exercise profiles.
Direct matching to the Master Canonical Library.
Basic Interactive Workspace UI permitting simple manual adjustments.
Ability to append parsed workouts to a calendar tracking ledger.
10.2 Phase 2: Advanced Processing & Automation (Should-Have Layer)
Scope:
Onboard local desktop/mobile native file uploads (.mov, .mp4).
Integrate full speech-to-text audio context translation (Whisper integration).
Launch the AI Workout Generator module allowing multi-week variations.
Incorporate automated safety flags and custom coaching cue extractions.
10.3 Phase 3: Ecosystem Integration & Monetization (Could/Future Expansion)
Scope:
Launch Coach-to-Client Distribution link portals (Monetization Engine).
Connect metadata directly to active wear electronics (Apple Watch, Garmin) for real-world exercise validation.
Deploy optical character recognition models to capture overlaid captions on videos automatically.
11. Engineering & Quality Assurance Acceptance Criteria (Gherkin Format)
Scenario 1: Successful Link Ingestion and Exact Canonical Identification
Gherkin
Given a Premium Athlete is on the workout creation dashboard
When they paste a valid public YouTube Shorts link showing a "Dumbbell Bicep Curl"
And they press the "Analyze Video" submission button
Then the platform should process the request via the asynchronous worker pipeline in less than 12 seconds
And return a structured view displaying the recognized exercise mapped exactly to Canonical ID `ex_db_curl_002`
And showcase the exact timestamps matching where the movement occurs in the video stream.

Scenario 2: Processing Graceful Failure via Corrupted External API Responses
Gherkin
Given any user attempts to process an invalid or blocked social media URL
When the external scrapper worker module encounters an unresolvable network platform exception
Then the platform must not crash or infinite-loop
And it must surface an actionable UI error alert stating: "We encountered an issue downloading this video. Please check the URL availability and try again."
And cleanly reset the processing container back to an idle state within 3.5 seconds.

Scenario 3: AI Program Creation Generation Engine Validation
Gherkin
Given a user with 15 unique custom video extractions stored in their Personal Exercise Database
When they prompt the AI Workout Generator text interface with "Build a 3-day upper body split using only my saved movements"
Then the LLM engine must compile a structured workout plan comprising exclusively matching exercise items present inside the user's explicit profile array
And validate that set, rep, and recovery integer parameters populate each target block in compliance with strict systemic verification patterns.

12. Strategic Risks and Preventative Mitigations
12.1 Platform Ingestion Dependency Drift
Risk: Third-party networks (Instagram, TikTok, YouTube) frequently modify their internal network wrappers, link tracking variables, and access patterns. This can unexpectedly break scrapers or API ingestion endpoints.
Mitigation Strategy: Implement a robust proxy-rotation framework alongside an abstract ingestion adapter pattern layer. If an external link scraper fails sequentially more than three times for a specific platform, the system falls back gracefully by prompting the user to use our secure, native video upload drawer instead.
12.2 Training Terminological Divergence
Risk: The platform fails to scale if regional variations and localized gym slang create multiple duplicate entries for the same exercise (e.g., "Nordic Curls" vs. "Inverse Leg Curls").
Mitigation Strategy: Leverage Vector Database Semantic Embeddings configured with synonyms. This ensures variations are resolved to a single canonical ID while maintaining the user's localized naming preference as an alternative label field within their personal database view.

