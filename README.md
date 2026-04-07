# NexEras 3D Learning Pipeline

Prototype prepared by **Thato Matshehla** for NexEras.

This project converts a text description or uploaded image into training-ready 3D learning content for NexEras modules.

## Overview

The goal of the prototype is to prove a full loop:

1. accept user input as text or image
2. interpret the object with AI assistance
3. generate a usable 3D asset in GLB format
4. normalize it for viewing
5. display it in an interactive browser viewer
6. attach short training content for human learning modules

This repository is intentionally structured as a practical prototype rather than a research demo. It prioritizes end-to-end usability, clear deployment boundaries, and controlled fallback behavior.

## What it does

- Accepts a text prompt or image upload
- Uses OpenAI classification and learning-summary generation when `OPENAI_API_KEY` is set
- Falls back to local keyword detection when no API key is present
- Generates a procedural 3D object and exports it as GLB
- Applies a simple material
- Auto-centers and auto-scales the mesh before export
- Displays the object in a browser-based 3D viewer
- Supports a primary Three.js viewer and a legacy preview mode
- Exports the generated GLB and module JSON

## Implementation Approach

The approach used in this project is deliberately layered.

### 1. Input understanding

The system accepts:

- free-text descriptions
- uploaded reference images

When an OpenAI API key is available, the input is interpreted using the OpenAI Responses API. That step is used to:

- identify the most likely training object
- generate an educational summary
- generate structured learning notes such as key uses, a safety note, and a quiz prompt

When OpenAI is not configured, the system falls back to local heuristic matching.

### 2. 3D generation strategy

This prototype does **not** yet perform true open-ended text-to-3D generation.

Instead, it uses:

- prompt/image classification
- object mapping into a procedural object library
- GLB export from generated geometry

This decision was made to guarantee that the prototype can always return a valid result quickly and consistently during testing.

### 3. Asset preparation

Each object goes through a preparation stage:

- mesh creation
- GLB conversion
- simple material assignment
- centering
- auto-scaling

This ensures every returned asset is viewer-ready.

### 4. Viewer strategy

The browser viewer uses a primary Three.js path and a legacy preview fallback.

The reason for this design is practical:

- the original viewer path had instability around runtime GLB loader behavior
- the final version uses a more reliable local Three.js module setup
- a legacy preview mode remains available as a fallback

### 5. Deployment strategy

The repository is prepared for Vercel-style hosting:

- static frontend in `public`
- serverless handlers in `api`
- shared generation logic in `src`

This keeps the frontend and backend boundaries simple for deployment.

## Local run

```bash
npm start
```

Open:

```text
http://127.0.0.1:3000
```

## Environment variables

Create a local `.env` file with:

```bash
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4.1
```

Without an API key, the prototype still runs in heuristic mode.

## Vercel deployment

This repo is structured so it can be deployed to Vercel:

- static frontend in `public`
- serverless endpoints in `api`
- shared app logic in `src`

Set these Vercel environment variables:

```text
OPENAI_API_KEY
OPENAI_MODEL
```

## Project Structure

```text
api/         Vercel/serverless endpoints
public/      frontend UI, viewer, styles
src/         shared pipeline, GLB generation, catalog, OpenAI integration
generated/   runtime-generated GLB outputs for local development
logs/        runtime client/server diagnostics for local debugging
```

## Technical Notes

### Why the project uses a procedural library

During development, the most important requirement was to keep the pipeline functional from end to end:

- input
- interpretation
- model output
- viewer display
- educational text

Using a procedural object library allowed the prototype to satisfy those requirements without depending on an external commercial 3D generation provider.

### Why true text-to-3D is not yet the default

True text-to-3D generation requires an external generation backend or a heavy GPU-serving pipeline. That was intentionally deferred because the immediate objective was to deliver a working, hostable prototype first.

The architecture leaves room for upgrading the generation layer later by replacing the catalog-based generator with:

- a 3D retrieval provider
- a text-to-3D provider such as Meshy or Tripo
- or a self-hosted open-source GPU pipeline

### Why both primary and legacy viewer modes exist

The viewer path evolved during implementation. The final design keeps:

- a stronger primary path
- a fallback legacy path

This improves resilience during demos and testing.

## Current object library

- Hard hat / helmet
- Hammer
- Wrench / spanner
- Screwdriver
- Traffic cone
- Barrel
- Crate

## Current limitation

This is still a procedural + classification prototype, not true open-ended text-to-3D generation. Prompts are classified into a small object library and then exported as GLB. The current viewer stack is production-friendlier than the original Babylon path, but the generation layer is still catalog-based.

## Development Notes

The work on this prototype followed these stages:

1. create a minimal full-stack prototype from an empty workspace
2. implement prompt/image ingestion
3. build a procedural GLB generation path
4. attach AI-generated educational summaries
5. add an interactive browser viewer
6. stabilize local delivery of frontend modules
7. prepare the project for GitHub and Vercel deployment

The implementation emphasized:

- practical delivery over theoretical completeness
- stable fallbacks over brittle “AI-only” behavior
- clear separation between frontend, API, and generation logic

## Authorship

Prepared and documented as the work of **Thato Matshehla** for NexEras.
