---
layout: post
title:  "Browslatro: I built a Balatro clone to relearn frontend"
date:   2026-06-24 09:00:00
categories: projects
---

[Play it here](https://browslatro.matatall.com/). No install, no account. BYOK if you want to leverage AI for more than a few choices (ML content is free). Desktop or iPad strongly recommended; mobile is playable but cramped.

---

I've spent most of my career in security and backend-adjacent work so my frontend skills had gone stale. CSS still humbles me. So I picked the most over-engineered way imaginable to brush up: I built [Browslatro](https://browslatro.matatall.com/), a browser implementation of [Balatro](https://www.playbalatro.com/), the poker roguelike that ate my year (C++ gang rise up).

It started as "relearn React" doing things entirely by hand. It ended as a React 19 app with a deterministic scoring engine, two independent move advisors, and an offline machine-learning pipeline that trains a neural network in PyTorch and runs it *in the browser* via WASM. Towards, the end, it was almost entirely done using Claude.

![Browslatro gameplay — Small Blind, an empty joker row, your hand, and the Submit / Discard / Suggest buttons](/assets/browslatro/gameplay.png)

## The bonus features (the fun part)

The game itself is "just" a Balatro clone. It would be helful to have _some_ Balatro experience for the rest of this post.

### The Scoring Log — show your work

Balatro's scoring is famously a black box of chips and multipliers ticking up faster than you can follow. The "Scoring Trace" panel (bottom-left, hit "Expand") breaks down every hand line by line: the base hand's chips and mult, every joker and enhancement that fired and in what order, the money you won, and the floored final total. It's the feature I reach for most when a hand scores way more (or way less) than I expected.

### The Coach — an instant, free, offline advisor

See that "Suggest" button? Click it and a *Coach* pops up with the move it thinks is best. The Coach is a tiny neural network — a 3-layer [multi-layer perceptron](https://en.wikipedia.org/wiki/Multilayer_perceptron) — running entirely in your browser via [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html). It's instant, free, and works offline. It never phones home.

### The AI — Claude, when you want the "why"

So there's a second advisor. Hit **Ask AI** and the request goes to Claude (claude-opus-4-8) through a serverless function, and you get back something the Coach can't give you:

- a (potentially new) recommendation,
- a plain-language explanation of why it wins,
- the most tempting alternative and why it's actually worse, and
- one transferable concept you can carry to your next run.

The system prompt makes it an educational coach, not just a solver. The single most important rule in the whole system: numbers flow in exactly one direction — engine → prompt → explanation. Claude may only quote chips, mult, and money figures that the engine already computed and put in front of it. 

## The machine learning, briefly

The Coach is an [imitation-learning](https://en.wikipedia.org/wiki/Imitation_learning) student trained offline, and the pipeline is a genuinely fun bit of engineering:

1. A headless engine plays full games with no React and no UI, driven by a single seeded RNG so every run is perfectly reproducible.
2. A Monte-Carlo search expert generates the training labels — for each decision it shuffles the *unseen* cards (it can't cheat and see what you can't), rolls out several futures, and picks the action with the best average outcome. It's not a neural net; it's the "teacher."
3. Real human play (mine, and anyone who exports theirs — more below) gets captured in the same schema and mixed in at a higher weight, so the model learns from actual play, not just synthetic self-play.
4. A PyTorch trainer ([`ml/train.py`](https://github.com/oreoshake-s-team/browslatro/blob/main/ml/train.py)) learns to rank candidates.
5. A benchmark pits the new model against the old one across disjoint random seeds. It only ships if it actually wins on "average blinds cleared."

There's a separate model for shop decisions, and an offline [knowledge-distillation](https://en.wikipedia.org/wiki/Knowledge_distillation) path where Claude acts as an expensive *teacher* that relabels exactly the states where the cheap student is weak. However, this often did not lead to meaningful improvements (something I intend to explore in the future).

## Your plays can train the model

This is the call to action, and the loop that makes the whole thing tick: play the game, then export your plays.

Open "Apply Modifiers" (the dev panel under the hand) and you'll find a human-play log. Every decision you make is recorded locally — hand plays, discards, shop purchases, pack picks, skips — and "Export log" dumps them as a JSONL file in exactly the schema the training pipeline ingests.

![The Apply Modifiers dev panel, showing the human-play log with "3 recorded decisions" and the Export log button](/assets/browslatro/export-plays.png)

[Play a run](https://browslatro.matatall.com/), export it, send it to me, and you've contributed to the next model!

## The technology

A quick tour of what's under the hood:

- [Claude](https://www.anthropic.com/claude)** — both as the in-game AI advisor (`claude-opus-4-8`) and as the pair-programmer that helped me build practically all of it. 
- [React 19](https://react.dev/) + strict [TypeScript](https://www.typescriptlang.org/) + [pnpm](https://pnpm.io/) (for fast worktree support).
- [Zustand](https://github.com/pmndrs/zustand) for state — a thin, sliced store driving the entire game loop, with pure rules kept separate from components.
- [Vite](https://vitejs.dev/) + [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) for build, unit tests, and end-to-end tests.
- [Storybook](https://storybook.js.org/) — every component has co-located stories covering its visual states.
- [i18next](https://www.i18next.com/) for internationalization, with accessibility treated as a hard requirement, not an afterthought. English and ʻŌlelo Hawaiʻi are supported (waiting on complete translations for now).
- [ONNX Runtime Web](https://onnxruntime.ai/) runs the Coach model in-browser; **[PyTorch](https://pytorch.org/)** trains it offline. 
- [Vercel](https://vercel.com/) for hosting and the serverless `/api/advice` route. This was such a nice experience that I plan to use it for all future hobby projects.

## How the project was run

- Everything is an issue. Roughly **680 issues** filed, **660+ closed**, each with a GitHub-native type (Bug / Feature / Task / Refactor / Chore) and a feature-space label, all from a shared issue template.
- One issue, one branch, one PR. Around **840 pull requests**, **815 merged**, every one squashed into a single semantic commit. Nearly **900 commits** on `main`.
- Worktrees, not branch-switching. Every branch gets its own git worktree outside the project tree, and a `PreToolUse` hook physically blocks edits to a `main` checkout. 
- Green or it doesn't ship. Full test coverage is a hard requirement, `tsc` has to be clean, and no PR merges until CI is green. Changes over ~150 lines of app code get split into follow-up issues.
- Design questions first. Because I'm still shaky on frontend, the rule is: before touching any UI, ask at least three design/UX clarifying questions. It front-loads the decisions I'm bad at making blind.

All of that happened over about a month — first commit on May 22nd, and it hasn't really stopped. For a project whose stated goal was "brush up on React and get less bad at CSS," the byproducts got a little out of hand.

---

TL;DR: [Play Browslatro](https://browslatro.matatall.com/), open the "Suggest" Coach (or Ask AI for Claude's reasoning), watch the Scoring Trace explain your hands, and if you're feeling generous, export your plays and feed the model.
