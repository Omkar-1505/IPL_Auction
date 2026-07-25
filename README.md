
<div align="center">
 IPL Tactical Command Center & AI Coach
 
### Qualitative AI Intelligence for Franchise Cricket
 
</div>
> Most cricket dashboards stop at runs, averages, and strike rates. This one tells a coach **where a player drops catches**, **which bowler is their nightmare**, and **how to set the field to dismiss them**.
 
---
 
##  Overview
 
The **IPL Tactical Command Center** is an AI-powered cricket analytics dashboard that acts as an autonomous tactical coach. It moves beyond baseline statistics by fusing **ball-by-ball data**, **scraped live commentary**, and **AI-extracted coaching insight** into a single, unified player intelligence layer — then uses that layer to **auto-draft the optimal Playing XI** against any given opponent.
 
| Capability | Description |
|---|---|
|  **Auto-Draft Optimal XI** | Autonomously selects the best Playing XI + Impact Substitutes for a given opponent and venue |
|  **1v1 Clash Simulator** | Simulates any Batter vs. Bowler matchup with a dual-sided tactical brief |
|  **Hidden Stat Extraction** | Surfaces fielding liabilities and death-over pressure metrics no public dataset tracks |
|  **AI Coach's Tape** | Converts raw post-match analysis video into structured tactical countermeasures |
 
---
 
##  Core Engineering Challenges & Solutions
 
Building a centralized intelligence hub required solving three critical data problems:
 
| Challenge | Problem | Solution |
|---|---|---|
| **Hidden Fielding Data** | No database tracks catches dropped by specific field position | Built an **NLP Regex Extractor** that parses unstructured commentary into a proprietary fielding dataset |
| **Bot-Protected Sources** | Sports sites use **Cloudflare** and similar defenses against scrapers | Engineered an **Anti-Bot Evasion Pipeline** using TLS/browser fingerprint impersonation |
| **Data Fragmentation** | Auction status, ball-by-ball stats, and tactical notes live in isolated silos | Implemented the **Ultra-Merge Algorithm** with fuzzy name resolution to unify player profiles |
 
---
 
##  Technology Stack
 
**Frontend**
- **React 18** + **Vite** — fast, modern UI architecture
- **Tailwind CSS v4** — responsive, fluid styling
- **Framer Motion** — hardware-accelerated transitions
- **Recharts** — phase-based match visualizations
- **Lucide React** — iconography
**Backend / Data Engineering**
- **Pandas** + **NumPy** — vectorized aggregation over large ball-by-ball datasets
- **curl_cffi** — TLS fingerprint spoofing for resilient scraping
- **Playwright** — headless browser automation for JS-rendered pages
- **BeautifulSoup4** + Python's native **re** module — HTML parsing and regex-based text extraction
**Artificial Intelligence**
- **Google Gemini 1.5 Flash** — high-speed tactical abstraction from raw text
- **youtube-transcript-api** — pulls coach/analyst commentary for AI processing
---
 
##  Intelligence Pipeline
 
### 1. Ball-by-Ball Processing Algorithm
Ingests hundreds of thousands of historical deliveries (e.g., **Cricsheet** data) and applies:
- **Pandas aggregation** for baseline batting/bowling metrics
- A **Death Over Filter** (overs 16–20) to compute **Pressure Strike Rate** and **Pressure Economy**
- A **Head-to-Head Matrix** identifying each player's **Top 3 Target Bowlers** and **Top 3 Nightmare Batters**
### 2. Recursive JSON Hunter (Web Scraping)
- **Impersonation** via **curl_cffi** to mimic legitimate browser sessions
- **Recursive traversal** of nested `__NEXT_DATA__` JSON blocks, dynamically matching commentary-shaped strings instead of relying on brittle hardcoded keys — making the scraper resilient to site redesigns
### 3. Regex Metric Engine (NLP Fielding Abstraction)
- Applies **dynamic pattern matching** against 20+ standard fielding zones
- Detects linguistic markers such as *"dropped by [Name]"* or *"spills a sitter at point"*
- Outputs `fielding_analysis.csv` with a quantified **Strong Zone** and **Liability Zone** per player
### 4. Coach Tape Generator (AI Tactical Enrichment)
- Extracts subtitle text from post-match analysis broadcasts
- Prompts **Gemini** to discard filler dialogue and isolate pure tactical insight
- Forces a strict **JSON schema** output mapping directly to player profiles
### 5. Dynamic AI Drafting Formula (Impact Score)
The auto-draft engine ranks players using a context-aware scoring model:
 
```
Impact Score = Base Score + Venue Boost − Nightmare Penalty
 
Base Score        → Role-normalized stats (e.g., Strike Rate × 2 + Career Wickets)
Venue Boost        → Bonus if the stadium is a historically strong venue for the player
Nightmare Penalty  → Large deduction (e.g., −250) if the opponent's squad includes
                      the player's statistical nemesis (Primary_Threat_Bowler)
```
 
This ensures a player is intelligently benched when their historical weakness is on the opposing team, even if their raw stats look strong.
 
### 6. Smart Name Resolution Index
A **fuzzy-matching** layer that reconciles inconsistent name formats across sources — e.g., mapping *"Virat Kohli"* from commentary to *"V Kohli"* in the stats database — so all datasets merge cleanly into one profile.
 
---
 
##  Application Modules
 
### 1. The War Room — *Drafting & Simulation*
- Configure match parameters: stadium and opposing franchise
- Lock in the opponent's 11–15 player pool
- Trigger **Coach Review** to run the AI Drafting Algorithm and auto-generate the optimal Playing XI + Impact Substitutes
### 2. Clash Arena — *1v1 Combat Simulator*
- Pair any Batter/All-Rounder against any Bowler
- Get a simultaneous, dual-sided tactical brief: where the bowler should target, and how the batter should counter their death-over variations
### 3. Master Stats Hub — *Player Diagnostics*
- Searchable global player directory with normalized names and nationalities
- **Venue Diagnostics** — best-to-worst performing stadiums
- **Fielding Intelligence** — optimal deployment zones vs. liability zones
- AI-generated **Coach's Tape** tactical suggestions
---
 
##  Data Sources
 
| Source | Purpose |
|---|---|
| **Cricsheet** | Historical ball-by-ball delivery data |
| **ESPNcricinfo / Cricbuzz** | Live match commentary (scraped) |
| **YouTube** | Post-match coach/analyst breakdowns (transcribed via AI) |
| **Kaggle** | Pre-compiled master datasets for local setup |
 
> 👉 **[Download the Dataset on Kaggle](https://www.kaggle.com/datasets/omkarpadhee/ipl-players-career-and-fielding-data-2008-2026/data)**
 
---
 
##  Getting Started
 
### Prerequisites
- **Node.js** (LTS recommended)
- **npm**
### 1. Fork & Clone
```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME
```
 
### 2. Add the Required Datasets
Download the dataset from **Kaggle**, extract it, and place the following files directly into the `public/` directory:
 
```
public/
├── players.csv
├── fielding_analysis.csv
└── teams.csv
```
 
> [!IMPORTANT]
> The application will fail to load without these files present in `public/`.
 
### 3. Install Dependencies
```bash
npm install
```
 
### 4. Launch the Dashboard
```bash
npm run dev
```
 
Open [http://localhost:5173](http://localhost:5173) in your browser to access the Tactical Command Center.
 
---
 
<div align="center">
**Built for coaches who want to know not just *what* a player does — but *why*, *where*, and *how to stop them*.**
 
</div>
