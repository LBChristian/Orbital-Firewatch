# ORBITAL FIREWATCH — Claude Code Setup and Resource Guide

This guide explains how to prepare Claude and the development environment before pasting `01_MASTER_BUILD_PROMPT.md`.

## 1. Recommended workflow: Claude Code, not chat-only Claude

Use **Claude Code** because the project requires Claude to inspect and edit a local repository, run npm scripts, build assets, call tests, and fix errors. You can use Claude Code through the Claude Desktop app's Code experience or the terminal/VS Code integrated terminal. A normal chat-only session can draft code but cannot reliably build and verify the local game by itself.

Official setup guide: https://code.claude.com/docs/en/getting-started
Claude Code docs: https://code.claude.com/docs/

### Windows setup

Install:
1. **Visual Studio Code** — https://code.visualstudio.com/
2. **Git for Windows** — https://git-scm.com/download/win
3. **Node.js current LTS** — https://nodejs.org/ . Use a supported version satisfying Vite's current requirements (Node 22.12+ is a safe baseline for the toolchain described here; check Vite docs if versions have changed).
4. **Claude Desktop** (optional, easiest GUI workflow) — https://claude.com/download
5. **Blender** (optional, for artists who want to edit/export GLB models) — https://www.blender.org/download/

Open PowerShell and install Claude Code using Anthropic's current Windows command:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Open a new terminal, then verify:

```powershell
claude --version
claude doctor
```

Sign in when prompted. Do not share account credentials or API keys with teammates. If using Claude Desktop, sign in and open the Code experience, then select/open the project folder.

Official install instructions can change. Follow the official page if the command above is updated.

## 2. Create the project repository

1. Create a new GitHub repository named `orbital-firewatch`.
2. Make it private during active development if you prefer; publish it when ready for the hackathon submission.
3. Clone it locally:

```powershell
cd $HOME\Documents
 git clone https://github.com/YOUR-TEAM/orbital-firewatch.git
cd orbital-firewatch
```

4. Copy the contents of this starter kit into the repository root. The intended initial structure is:

```text
orbital-firewatch/
  CLAUDE.md
  00_SETUP_AND_RESOURCES.md
  01_MASTER_BUILD_PROMPT.md
  proposal/
    ORBITAL_FIREWATCH_Project_Proposal.docx
  reference-art/
    mission-dashboard-mockup.png
    architecture-reference.png
    coverage-schematic-reference.png
    dual-concept-board-reference.png
```

5. Open this folder in VS Code (`code .`) or Claude Desktop Code.
6. Open a terminal in the repository and run:

```powershell
claude
```

7. Paste the entire contents of `01_MASTER_BUILD_PROMPT.md` into Claude Code and let it inspect the repository before implementing.

Do not use `--dangerously-skip-permissions` just to make the agent faster. Review file edits, package installs, shell commands, and deployment changes. Keep Git commits frequent so changes can be reverted safely.

## 3. Get the NASA FIRMS MAP_KEY

FIRMS requires a free MAP_KEY for API access.

- Registration: https://firms.modaps.eosdis.nasa.gov/api/map_key/
- Area API: https://firms.modaps.eosdis.nasa.gov/api/area
- API tutorial: https://firms.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html
- VIIRS product description: https://firms.modaps.eosdis.nasa.gov/content/descriptions/FIRMS_VIIRS_Firehotspots.html

After receiving the key:
1. Create a local `.env` file in the API/server directory (or root, according to the server config Claude creates).
2. Add `FIRMS_MAP_KEY=YOUR_KEY`.
3. Ensure `.env` is in `.gitignore`.
4. Add the variable name only (not the real key) to `.env.example`.
5. Never paste the key into frontend source code, screenshots, GitHub, this prompt, or a public chat.

Example `.env.example`:

```env
FIRMS_MAP_KEY=replace_me
PORT=4000
NODE_ENV=development
FIRMS_CACHE_TTL_SECONDS=900
```

Suggested product sources: `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, or `VIIRS_SNPP_NRT`. The backend should check available products/dates, use one bounded region, and handle the case where no recent detections are returned. Do not query the entire world for normal gameplay.

FIRMS Area API pattern (verify against current documentation):

```text
https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{WEST},{SOUTH},{EAST},{NORTH}/{DAY_RANGE}
```

The API documents a bounded area query and a maximum 1–5 day range. Avoid high-frequency polling. Cache successful responses.

## 4. NASA GIBS map imagery

GIBS does not require a FIRMS MAP_KEY for the standard WMTS imagery endpoints. Use NASA's official GIBS documentation and verify the exact map layer, projection, time availability, tile matrix set and image format before hardcoding a tile URL.

- GIBS API docs: https://nasa-gibs.github.io/gibs-api-docs/
- Access basics: https://nasa-gibs.github.io/gibs-api-docs/access-basics/
- Web Mercator GetCapabilities: https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
- Visualization catalog: https://nasa-gibs.github.io/gibs-api-docs/ (follow Visualization Product Catalog)

GIBS WMTS REST pattern:

```text
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{LayerIdentifier}/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.{FormatExt}
```

A current-day tile may not be available yet. The map needs a previous valid imagery date or a neutral basemap fallback. Always show the actual imagery layer and date in the data credits.

## 5. Reference repositories and documentation

Use these as documentation/source references, not as code to clone blindly:

### Core stack
- Vite: https://vite.dev/guide/
- React: https://react.dev/learn
- TypeScript: https://www.typescriptlang.org/docs/
- Leaflet: https://leafletjs.com/examples/quick-start/
- React Leaflet: https://react-leaflet.js.org/
- Three.js: https://threejs.org/manual/
- Three.js GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html
- Recharts: https://recharts.org/en-US/guide
- Express: https://expressjs.com/
- Zod: https://zod.dev/
- Vitest: https://vitest.dev/guide/
- Playwright: https://playwright.dev/docs/intro

### NASA data and visual resources
- FIRMS API: https://firms.modaps.eosdis.nasa.gov/api/area
- FIRMS field descriptions: https://firms.modaps.eosdis.nasa.gov/content/descriptions/FIRMS_VIIRS_Firehotspots.html
- GIBS API: https://nasa-gibs.github.io/gibs-api-docs/
- NASA 3D Resources: https://www.nasa.gov/3d-resources/
- NASA GOES spacecraft GLB model page: https://science.nasa.gov/mission/goes-spacecraft-3d-model/
- NASA media usage guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/
- NASA Earthdata: https://www.earthdata.nasa.gov/

The GOES model is a weather satellite. It can be used as a visual/engineering reference, but do not label it as the exact player spacecraft or as the actual instrument used for this simulated mission. Prefer creating a notional Earth-observation smallsat model for the game.

### Optional CC0 assets
- Poly Haven (CC0 models, textures and HDRIs): https://polyhaven.com/license
- Kenney free game assets and license information: https://kenney.nl/assets
- Pixabay content license (check individual asset terms): https://pixabay.com/service/license-summary/
- MDN Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

Prefer procedural assets and Web Audio-generated SFX for the 48-hour build. If an external model, texture, music track or sound is used, save its source URL, author, license, modifications and required attribution in `docs/ASSET_CREDITS.md`. Do not use assets from paid games or random “free download” websites without clear rights.

## 6. Suggested local software

| Tool | Required? | Purpose |
|---|---|---|
| VS Code | Yes/recommended | Editing, terminal, Git integration |
| Claude Code | Yes | Agentic code implementation |
| Git + GitHub | Strongly recommended | Version control and team collaboration |
| Node.js + npm | Yes | Frontend/backend toolchain |
| Blender | Optional | Editing/exporting a satellite GLB model |
| Chrome/Edge | Yes/recommended | Test gameplay, console, responsive layout |
| Postman/Insomnia | Optional | Test API routes |

## 7. Suggested team workflow

- Create one GitHub issue per module: NASA feed, map, simulator, satellite model, UI/game flow, QA/deployment.
- Agree on shared TypeScript interfaces before parallel implementation.
- Use separate branches for independent features.
- Do not let multiple people or Claude sessions edit the same critical files at the same time.
- Merge and run the game after each integration.
- Keep the main branch runnable.
- Commit milestones: scaffold, live API, cached mode, map, satellite design, simulation, debrief, polish, release.

## 8. Competition-specific compliance

The challenge organizer's rules may require at least one data source explicitly listed under the selected challenge's Resources section. FIRMS and GIBS are NASA services, but the team must not assume either automatically satisfies that specific rule. Open the exact Challenge 13 “Space Mission Design Game” Resources tab and record the qualifying source in `docs/CHALLENGE_RESOURCE_COMPLIANCE.md`.

Also:
- Keep a visible distinction between real NASA observations and simulated game output.
- Include data source attribution and retrieval timestamps.
- Do not use NASA insignia/logotype as product branding without authorization.
- Do not imply NASA endorsement.
- Label any AI-generated art/assets and follow the event's current AI disclosure rules.
- Do not use FIRMS information for life/property protection or operational emergency decisions.

## 9. Before the first Claude Code session

Checklist:
- [ ] VS Code installed.
- [ ] Git for Windows installed and `git --version` works.
- [ ] Node LTS installed and compatible with current Vite (`node --version`, `npm --version`).
- [ ] Claude Code installed and `claude doctor` works.
- [ ] GitHub repository created and cloned.
- [ ] Starter kit copied to the repository root.
- [ ] FIRMS MAP_KEY requested and stored in local `.env` (if already received).
- [ ] `.env` is ignored by Git.
- [ ] Challenge 13 Resources tab checked and qualifying source recorded.
- [ ] Team members assigned to distinct modules.

Once ready, open Claude Code in the repository and paste `01_MASTER_BUILD_PROMPT.md`.
