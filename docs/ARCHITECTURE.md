# Architecture Notes

Author: **Thato Matshehla**

## Goal

Build a small pipeline that can turn text or images into usable 3D learning content for NexEras human training modules.

## Core Flow

### Step 1. User input

The user provides either:

- a text description
- an uploaded image

### Step 2. Object interpretation

The system interprets the input in one of two modes:

- OpenAI-assisted mode when `OPENAI_API_KEY` is available
- heuristic mode when it is not

OpenAI-assisted mode is used for:

- object identification
- educational summary generation
- training-note generation

### Step 3. 3D model generation

The current generator is catalog-driven and procedural.

That means:

- the prompt is mapped to a known training object
- geometry is generated locally
- the result is exported as GLB

This is not yet true open-ended text-to-3D generation.

## Why this approach was chosen

This approach was chosen because it:

- guarantees deterministic output
- keeps local development simple
- avoids paid third-party dependency during early prototyping
- allows the viewer and training pipeline to be validated independently of commercial 3D generation APIs

## Viewer Architecture

The viewer is designed with two modes:

- Primary 3D: local Three.js viewer
- Legacy Preview: simplified semantic preview mode

This makes the UI more resilient during demos and testing.

## Backend Shape

The backend is split into:

- `api/` for HTTP endpoints
- `src/` for reusable generation and AI logic

Main responsibilities:

- health checks
- generation requests
- lightweight client logging
- model preparation
- AI summary and learning-content generation

## Files of Interest

- `src/pipeline.js`
  Main generation orchestration

- `src/catalog.js`
  Procedural object definitions

- `src/glb.js`
  GLB creation and binary packaging

- `src/openai.js`
  OpenAI API integration

- `public/app.js`
  Frontend viewer, interactions, and API flow

- `api/generate.js`
  Generation endpoint for hosted/serverless deployment

## Current Limitations

- small procedural object library
- not true text-to-3D generation yet
- generated assets are simplified training representations
- some runtime behavior has been stabilized through fallbacks rather than through a commercial 3D generation backend

## Upgrade Path

The next logical upgrade would be to replace the procedural generation layer with:

- semantic 3D retrieval
- commercial text-to-3D generation
- or self-hosted open-source text-to-3D inference

The rest of the stack can remain mostly unchanged:

- input collection
- training summary generation
- viewer
- deployment shape

## Deployment Intent

The project is prepared so it can be deployed on Vercel with:

- static frontend delivery
- serverless API routes
- environment-variable-based AI configuration

This makes it suitable for GitHub-based deployment workflows.
