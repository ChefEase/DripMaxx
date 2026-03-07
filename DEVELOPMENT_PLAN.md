Phase 0 – Project sanity & environments (current focus)
Goal: You can run the app locally without errors, and have a place to send API calls later.
Tasks:
Task 0.1 – Confirm stack + clean repo
Decide: Expo / React Native (you have this) and target platforms (iOS, Android, Web).
Make sure npm install runs clean.
Run npm start and verify Metro at least boots (even if UI is minimal).
Delete the empty app/ folder if it causes issues (it’s safe to remove).
Task 0.2 – Basic repo hygiene
Add .gitignore (if not already) for node_modules, build artifacts, env files.
Initialize git (git init) and make a baseline commit of the current working state.
Task 0.3 – Environment config strategy
Decide where to store:
Supabase URL + anon/public key
AI API keys (Replicate API token)
Plan:
For mobile: .env + expo-constants or similar.
For backend: .env read by FastAPI.
Create .env.example documenting needed keys.
Exit criteria for Phase 0:
npm start works again.
Repo is in git with a clean baseline.
.env.example exists with all required keys listed (even if not filled).
5. Phase 1 – UX flow skeleton (no AI yet)
Goal: Implement the multi-screen flow described in context.md, with placeholder data only.
Screens (React Native views):
Value Proposition Screen
Matches “Rate Your Outfit Instantly With AI”.
Buttons: Get Started, See Example.
Style Preference Selection
Shows style cards: Streetwear, Minimal, Vintage, Luxury, Y2K, Casual, Custom.
Local state only for now.
Style Inspiration (Optional)
Multi-select (Kanye, Travis, Hailey, etc.).
Skippable.
Body & Fit Setup (Optional)
Inputs: height, body type enum, gender style preference.
Skippable.
Camera Permission Screen
Explains why camera is needed.
“Allow camera” / “Not now” buttons (just mocks at first).
First Scan Screen (stub)
Simple screen with “Scan Outfit” button (no real camera yet).
Tasks:
Task 1.1 – Navigation setup
Choose stack (e.g. expo-router or @react-navigation/native).
Create routes/screens for each onboarding step.
Wire “Next / Back / Skip” actions.
Task 1.2 – Implement UX for each step with dummy data
Focus on layout and copy taken from context.md.
Store selections in simple in-memory context/state.
Task 1.3 – Simple state store
Create a small global store (Context/Zustand/etc.) that holds:
user_style_preference
style_inspirations[]
user_height, user_body_type, gender_style_preference
No backend yet; just to drive UI.
Exit criteria for Phase 1:
You can go from app open → onboarding → reach the “Scan Outfit” stub.
User selections persist while app is open.
6. Phase 2 – Camera / image upload + scan flow
Goal: User can capture or upload an outfit image and see a fake Drip Score + suggestions (hard-coded or simple logic).
Tasks:
Task 2.1 – Camera & gallery integration
Integrate Expo Camera / ImagePicker (if still using Expo).
Simple flow: press “Scan Outfit” → capture or pick an image → show preview.
Task 2.2 – Local scoring stub
For now, fake the scoring based on simple rules (e.g., random scores or based on selected style).
Show:
Drip Score (e.g. 7.3)
Category breakdown from context.md table.
2–3 static suggestion cards.
Task 2.3 – Result screen UX
Implement the Drip Score and suggestion cards UI.
Add “Rescan” and “Save this outfit” buttons (saving is local-only for now).
Exit criteria for Phase 2:
User can scan/upload an image and see a full fake rating screen.
7. Phase 3 – Backend + real AI
Goal: Replace fake scoring with calls to your FastAPI backend + AI.
Tasks:
Task 3.1 – FastAPI skeleton
Create FastAPI app with:
POST /v1/outfits/score (accepts image + user context).
GET /health (health check).
Add logging & basic config.
Task 3.2 – DB integration (Supabase/Postgres)
Apply schema from context.md:
users, user_profile, outfits, outfit_scores, outfit_suggestions, style_dna, etc.
Connect FastAPI to Supabase/Postgres via a single DB URL.
Task 3.3 – AI scoring pipeline
In backend:
Receive image.
Send to a Replicate-hosted vision model (e.g. a CLIP-like or fashion-focused model).
Compute:
color_match, fit_quality, body_compatibility, trend_score, style_match.
Weighted drip_score per formula in context.md.
Log inputs/outputs for debugging.
Task 3.4 – Suggestions generation
Use LLM to generate:
2–5 suggestion cards (fit, layering, color, accessories).
Save suggestions into outfit_suggestions table.
Task 3.5 – Wire React app to backend
Replace fake local scoring with API call.
Handle loading, error states, and retries.
Exit criteria for Phase 3:
Real AI request path: app → backend → AI → DB → app.
8. Phase 4 – Profiles, history, Style DNA
Goal: Turn one-off scans into a long-term style journey.
Tasks:
Task 4.1 – Auth + user profile
Use Supabase Auth (email / OAuth).
On login, sync:
user_profile with onboarding selections.
Task 4.2 – History views
Screens:
Recent outfits with thumbnails + Drip Scores.
Chart of drip_score_history over time.
Task 4.3 – Style DNA
Batch job or on-demand endpoint:
Aggregate past outfits, favorite suggestions, scores.
Generate a style_dna row (label, tags, description).
Show “Your Style DNA” section in profile.
Exit criteria for Phase 4:
User can log in, see their past outfits and scores, and view a simple Style DNA summary.
9. Phase 5 – Polish, analytics, and launch
Goal: Make it fast, reliable, and ready to show people.
Performance tweaks, loading states, and empty states.
Event tracking for core loop:
Onboard completed, scan started, score viewed, suggestion applied.
App store/Web deployment pipeline (EAS, web hosting, etc.).
