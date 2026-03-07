## AI Outfit Rating App – Product Flow & Feature Specification

---
##Tech Stach Flow
Mobile Frontend: Flutter or React Native for cross-platform iOS/Android app.

Backend Services: Supabase (PostgreSQL) or Firebase for authentication, storage, and user data; plus a custom Python (FastAPI) API to handle AI processing.

AI Image Analysis: Pre-trained models like CLIP or fashion-focused models hosted on Replicate to extract outfit features (colors, fit, style).

Scoring & Suggestions: Python logic calculates weighted “Drip Score”; Replicate-hosted text or multimodal models generate personalized improvement tips.

Data Storage: Relational database (PostgreSQL) for user profiles, outfit history, and optional vector embeddings (pgvector) for advanced personalization.

## 1. Product Overview

The **AI Outfit Rating App** lets users scan their outfit with their phone camera and receive an AI-generated rating, plus clear suggestions to improve their look.

The goal of the product is to help users **level up their style** through fast, personalized AI feedback.

### Core Value Proposition

Users can:
- **Instantly scan their outfit**
- Receive a **Drip Score**
- Get **personalized improvement suggestions**
- Track their **style evolution over time**

### The Aha Moment

The app must deliver the **first outfit rating within ~60 seconds of opening the app**.

**High-level flow:**

Download → Open App → Scan Outfit → Receive Drip Score + Suggestions

This is the moment where users clearly experience the core value of the app.

---

## 2. User Onboarding Flow

The onboarding process should be **quick, low-friction, and focused on personalization**.

- **Total steps**: ~**5–7 screens** (depending on optional steps)

High-level onboarding flow:

Open App → Value Proposition → Style Preference → Style Inspirations → (Optional) Body & Fit → Camera Permission → First Scan

---

### Step 1 — Value Proposition Screen

**Purpose:** Quickly communicate what the app does and why it’s valuable.

#### UI Elements

**Headline:**

Rate Your Outfit Instantly With AI

**Subtext:**

Scan your outfit and get a Drip Score, style feedback, and improvement suggestions.

**Buttons:**
- **Get Started**
- **See Example**

Optional: show a **preview card** of an example outfit rating (Drip Score + 1–2 suggestions).

---

### Step 2 — Style Preference Selection

**Purpose:** Personalize AI scoring and recommendations.

**Prompt:**

What style do you like?

#### Style Options

Selectable cards (multi-row grid or scrollable list):

- Streetwear
- Minimal
- Vintage
- Luxury
- Y2K
- Casual
- Custom (user can type their own style)

#### Data Stored

- `user_style_preference`

**Example:**

Streetwear

#### How This Is Used

Influences:
- **Style Match Score**
- **Outfit suggestions**
- **Trend recommendations**
- **Outfit feedback tone** and examples

---

### Step 3 — Style Inspiration (Optional)

**Purpose:** Learn fashion inspiration sources to improve recommendation accuracy.

**Prompt:**

Whose style do you like?

#### Example Options

- Kanye West
- Travis Scott
- Hailey Bieber
- Timothée Chalamet
- Zendaya
- ASAP Rocky

Users can choose **multiple inspirations**.

#### Data Stored

- `style_inspirations[]`

**Example:**

`["Travis Scott", "ASAP Rocky"]`

This helps the AI understand the user’s **aesthetic direction** and taste.

---

### Step 4 — Body & Fit Setup (Optional)

**Purpose:** Improve fit analysis and body compatibility scoring.

#### Inputs

- **Height**  
  Example: `180 cm`

- **Body Type**  
  Options:
  - Slim
  - Athletic
  - Average
  - Broad
  - Plus Size

- **Gender Style Preference (Optional)**  
  Options:
  - Menswear
  - Womenswear
  - Neutral

#### Data Stored

- `user_height`
- `user_body_type`
- `gender_style_preference`

#### Used For

Improving:
- **Fit Quality Score**
- **Body Compatibility Score**

**Example:**

Oversized hoodie + slim user → **high compatibility**

---

### Step 5 — Camera Permission

Camera access should be requested **only when the user reaches the first scanning step**, not immediately on app open.

**Prompt:**

Allow camera access to scan your outfit.

**Buttons:**
- **Allow Camera**
- **Not Now**

If the user taps **Not Now**, show a brief explanation of limited functionality and an easy path to grant access later.

---

## 3. First Outfit Scan (Core Experience)

This is the **primary feature** and the key to activation.

The user scans their outfit using the camera (live camera + capture button, or auto-capture when framing is good).

### AI Analysis Process

The AI analyzes:
- **Colors**
- **Clothing fit**
- **Clothing type & category**
- **Style alignment** with user preferences
- **Trend relevance** vs. current fashion trends

Output of this step feeds directly into the **Outfit Rating System**.

---

## 4. Outfit Rating System

The AI produces multiple **category scores** plus a **final Drip Score**.

### Rating Categories

| Category           | Description                                         |
|--------------------|-----------------------------------------------------|
| Color Match        | How well the outfit colors work together            |
| Fit Quality        | How well the clothes fit the user’s body           |
| Body Compatibility | How well the outfit suits the user’s body type     |
| Trend Score        | Alignment with current fashion trends              |
| Style Match        | Match with the user’s preferred style and inspo    |

---

### Final Score Calculation

Each category is scored on a **0–10 scale**.  
The final **Drip Score** is a weighted combination of these category scores:

$$
\text{Final Drip Score} =
0.30 \cdot \text{Color Match} +
0.20 \cdot \text{Fit Quality} +
0.20 \cdot \text{Body Compatibility} +
0.15 \cdot \text{Trend Score} +
0.15 \cdot \text{Style Match}
$$

#### Example Output

- **Drip Score:** `7.3 / 10`

**Category breakdown:**
- Color Match: `8.1`
- Fit Quality: `5.9`
- Trend Score: `6.7`
- Body Compatibility: `4.5`
- Style Match: `7.8`

---

## 5. Improvement Suggestions

After scoring, the AI generates **specific, actionable suggestions** to help the user upgrade their outfit.

### Suggestion Types (Examples)

- **Fit Improvements**  
  Try wider pants to balance the oversized hoodie.

- **Layering Suggestions**  
  Add a lightweight jacket to create more depth and structure.

- **Color Suggestions**  
  Swap white sneakers for darker shoes to better match the hoodie.

- **Accessory Suggestions**  
  Add a simple chain or watch to elevate the overall look.

Suggestions should be:
- **Short**
- **Clear**
- **Prioritized** (e.g. top 3 most impactful)

---

### Suggestion UI

Suggestions are displayed as **cards** (horizontal scroll or stacked list).

**Example cards:**
- Card 1 – *“Try wider pants to balance the hoodie fit.”*
- Card 2 – *“Add a layered jacket for more depth.”*
- Card 3 – *“Swap shoes for darker sneakers to match your top.”*

Each card can optionally include:
- A small **icon** (fit, color, accessories, layering)
- A **tag** (e.g. `Fit`, `Color`, `Accessories`)

---

## 6. Save Style Profile

After the first scan, prompt the user to **save their profile** so they can track progress.

**Prompt:**

Save your style profile to track your drip score over time.

**Benefits to highlight:**
- Track outfit improvements over time
- Build wardrobe and style insights
- Receive more accurate, personalized recommendations

### Data Stored

- `user_profile`
- `outfit_history[]`
- `drip_score_history[]`

This enables a **persistent style journey** instead of one-off scans.

---

## 7. Core App Loop

The product should encourage **repeat usage** driven by visible improvement.

Core loop:

Scan Outfit  
↓  
Get Drip Score  
↓  
Receive Improvement Suggestions  
↓  
Improve Outfit  
↓  
Scan Again  
↓  
Aim for a Higher Score

This loop creates **engagement, habit formation, and a “gamified” styling experience**.

---

## 8. Future Feature – Style DNA (Advanced Personalization)

Over time the app builds a **Style DNA profile** for each user.

The AI learns preferences from:
- Outfit scans
- Saved outfits
- Liked / applied suggestions
- Style inspirations
- Historical drip scores and changes

**Example Style DNA output:**

Your Style DNA: **Minimal Streetwear**

---

### How Style DNA Is Used

Style DNA can power future, more advanced features such as:

- **Recommended outfits**
- **Recommended clothing items**
- **Recommended colors & palettes**
- **Recommended brands**

This creates **hyper-personalized fashion feedback** beyond generic fashion rules.

---

## 9. Key Differentiation

Most fashion apps provide **generic advice** that doesn’t adapt to the user.

This app is positioned as **personalized AI styling**, based on:
- User style preferences
- Body type and fit data
- Real outfit scans
- Style inspirations
- Historical outfits and scores

**Core positioning:**

AI that understands **your** style,  

---

## 10. Database Schema (PostgreSQL / Supabase)

This section defines the **core relational schema** to support onboarding, outfit scans, scoring, suggestions, history, and Style DNA.

> Assumptions: PostgreSQL (e.g. Supabase) with `uuid` primary keys, `timestamptz` timestamps, and optional `pgvector` for embeddings.

### 10.1 Core Enums

```sql
-- Body types for fit & compatibility
CREATE TYPE body_type_enum AS ENUM (
  'slim',
  'athletic',
  'average',
  'broad',
  'plus_size'
);

-- Gendered style lens for recommendations
CREATE TYPE gender_style_enum AS ENUM (
  'menswear',
  'womenswear',
  'neutral'
);

-- Suggestion categories used in the UI (tags/icons)
CREATE TYPE suggestion_type_enum AS ENUM (
  'fit',
  'layering',
  'color',
  'accessory',
  'other'
);
```

### 10.2 Users & Profile

```sql
-- Core user table (Supabase/Firebase auth can map into this)
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id         text UNIQUE,                      -- maps to provider user id
  email           text UNIQUE,
  display_name    text,
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 1:1 profile with style + body info
CREATE TABLE user_profile (
  user_id                 uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  style_preference        text,                     -- e.g. "Streetwear", "Minimal"
  height_cm               numeric(5,2),             -- nullable if user skips
  body_type               body_type_enum,
  gender_style_preference gender_style_enum,
  country                 text,
  locale                  text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
```

### 10.3 Style Inspirations

```sql
-- Optional catalog of famous style inspirations
CREATE TABLE style_inspiration_catalog (
  id          serial PRIMARY KEY,
  name        text NOT NULL,                        -- e.g. "Travis Scott"
  slug        text UNIQUE,                          -- e.g. "travis_scott"
  image_url   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- User’s selected inspirations (many-to-many)
CREATE TABLE user_style_inspiration (
  user_id         uuid REFERENCES users (id) ON DELETE CASCADE,
  inspiration_id  int  REFERENCES style_inspiration_catalog (id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, inspiration_id)
);

-- Custom inspirations typed by the user
CREATE TABLE user_custom_inspiration (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users (id) ON DELETE CASCADE,
  label       text NOT NULL,                        -- e.g. "My friend Josh"
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### 10.4 Outfits & Media

```sql
-- One row per outfit scan or saved look
CREATE TABLE outfits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users (id) ON DELETE CASCADE,
  source          text NOT NULL,                    -- 'camera', 'upload', 'example'
  image_url       text NOT NULL,                    -- points to Supabase/Firebase storage
  thumb_url       text,                             -- optional thumbnail
  notes           text,                             -- user notes or labels
  scanned_at      timestamptz NOT NULL DEFAULT now(),
  is_example      boolean NOT NULL DEFAULT false,   -- for demo/example flows
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outfits_user_id_scanned_at
  ON outfits (user_id, scanned_at DESC);
```

### 10.5 Outfit Scores (Drip Score + Breakdown)

```sql
-- 1:1 with outfits: the detailed scoring output
CREATE TABLE outfit_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id           uuid UNIQUE REFERENCES outfits (id) ON DELETE CASCADE,

  -- category scores (0–10)
  color_match         numeric(4,2),
  fit_quality         numeric(4,2),
  body_compatibility  numeric(4,2),
  trend_score         numeric(4,2),
  style_match         numeric(4,2),

  -- final drip score (0–10)
  drip_score          numeric(4,2),

  -- model metadata
  model_version       text,                          -- e.g. "v1.0.3"
  raw_features        jsonb,                         -- optional debug/feature dump

  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outfit_scores_user_score
  ON outfit_scores (drip_score);
```

### 10.6 Outfit Suggestions

```sql
-- Multiple suggestions per outfit (cards in the UI)
CREATE TABLE outfit_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id       uuid REFERENCES outfits (id) ON DELETE CASCADE,
  type            suggestion_type_enum NOT NULL,     -- 'fit', 'color', etc.
  title           text NOT NULL,                     -- short card headline
  description     text,                              -- optional longer guidance
  rank            int  NOT NULL DEFAULT 1,           -- order in UI (1 = most important)

  -- interaction signals for learning / Style DNA
  is_applied      boolean,                           -- user marked as "done" or "used"
  is_liked        boolean,                           -- user liked/hearted the suggestion

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outfit_suggestions_outfit_rank
  ON outfit_suggestions (outfit_id, rank);
```

### 10.7 Style DNA (Advanced Personalization)

```sql
-- One row per user summarizing long-term style behavior
-- Requires pgvector extension if using "embedding" column.
CREATE TABLE style_dna (
  user_id       uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  label         text,                 -- e.g. "Minimal Streetwear"
  description   text,                 -- human-readable summary of style
  tags          text[] DEFAULT '{}',  -- e.g. {'minimal','streetwear','monochrome'}

  -- Optional vector for similarity-based recommendations
  embedding     vector(768),          -- adjust dimension to model used

  metadata      jsonb,                -- extra structured data if needed
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_style_dna_embedding
  ON style_dna USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 10.8 Drip Score History & Analytics

```sql
-- Pre-aggregated time series for quick charts, if needed
CREATE TABLE drip_score_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES users (id) ON DELETE CASCADE,
  outfit_id       uuid REFERENCES outfits (id) ON DELETE SET NULL,
  drip_score      numeric(4,2),
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_drip_score_history_user_time
  ON drip_score_history (user_id, recorded_at DESC);
```

This schema supports:
- Onboarding data (style preferences, body & fit, inspirations)
- Core loop (outfits, scores, suggestions)
- Long-term personalization (Style DNA, history)

---

## 11. Repository & Folder Structure

This section describes an **optimal monorepo-style layout** for the mobile app, backend API, and shared code.

```text
dripmaxx/
├─ apps/
│  ├─ mobile/                 # Flutter or React Native (Expo) app
│  │  ├─ assets/              # Images, icons, fonts
│  │  ├─ lib/                 # (Flutter) main Dart source
│  │  │  ├─ main.dart         # App entrypoint
│  │  │  ├─ config/           # Environment, API base URLs
│  │  │  ├─ screens/          # Screen widgets (Onboarding, Scanner, Results, Profile)
│  │  │  ├─ widgets/          # Reusable UI components (buttons, cards, chips)
│  │  │  ├─ services/         # API clients, auth, storage, analytics
│  │  │  ├─ state/            # State management (Bloc/Provider/etc.)
│  │  │  └─ theme/            # Colors, typography, theming
│  │  └─ test/                # Widget/unit tests
│  │
│  └─ api/                    # FastAPI backend for AI & orchestration
│     ├─ app/
│     │  ├─ main.py           # FastAPI entrypoint
│     │  ├─ api/
│     │  │  └─ v1/
│     │  │     ├─ routes_outfits.py     # scan, score, suggestions endpoints
│     │  │     ├─ routes_users.py       # profile, style prefs, DNA
│     │  │     └─ routes_health.py      # healthchecks
│     │  ├─ core/
│     │  │  ├─ config.py      # settings, env loading
│     │  │  └─ logging.py     # structured logging setup
│     │  ├─ models/           # SQLAlchemy models mapping to DB schema
│     │  ├─ schemas/          # Pydantic models for request/response
│     │  ├─ services/
│     │  │  ├─ ai_scoring.py  # Drip Score calculation logic
│     │  │  ├─ ai_suggestions.py  # LLM prompt + suggestion generation
│     │  │  └─ style_dna.py   # aggregation + embedding updates
│     │  ├─ db/
│     │  │  ├─ session.py     # DB session/connection handling
│     │  │  └─ migrations/    # Alembic migrations (mirrors schema above)
│     │  └─ utils/            # helpers (image utils, validation, etc.)
│     └─ tests/               # Backend unit/integration tests
│
├─ packages/
│  └─ shared-types/           # Shared TypeScript/OpenAPI schemas (optional)
│
├─ infra/
│  ├─ docker/                 # Dockerfiles, docker-compose
│  ├─ k8s/                    # Kubernetes manifests (if needed)
│  └─ terraform/              # IaC for Supabase/storage/etc.
│
├─ docs/                      # Product & technical documentation
│  ├─ context.md              # (this file) product + architecture context
│  └─ api.md                  # API reference and contract details
│
├─ scripts/
│  ├─ dev.sh                  # Local dev helpers (start backend, etc.)
│  └─ seed_db.py              # Seed database with demo users/outfits
│
├─ .env.example               # Example environment variables
├─ README.md                  # High-level project overview & setup
└─ LICENSE
```

This structure keeps:
- **Product context** in `docs/`
- **Mobile app** isolated in `apps/mobile/`
- **Backend API & AI logic** in `apps/api/`
- **Infrastructure & tooling** clearly separated for clean scaling and deployment.