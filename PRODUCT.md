# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS, no build step, no external runtime dependencies (works offline from a local folder). Also published as a private claude.ai artifact so it opens on the phone.

## Users

One student (HSE Business School, course «Организационное поведение», lecturer Ольга Филатова) preparing for the blocking exam on StartExam in 1–2 days. Studies on a laptop, sometimes the phone; needs to cover 16 lectures fast.

## Product Purpose

Accelerated exam prep: plain-language theory split into topics, every topic reinforced by questions (leaked 2025 exam questions, lecturer's sample questions from lecture 16, and new questions written to match), answer checking, a mock exam in the real format, and course progress tracking. Success = scoring ≥80% on the real exam.

## Positioning

Built from the 2026 slide decks (not older versions) and the actual 2025 exam photos; every question is labelled by origin so the student knows which are confirmed exam material.

## Operating Context

Exam: StartExam, 30 questions in 6 blocks, single choice 1 pt, multiple choice 2, matching 2, open 3–4; thresholds 40% → 4+, 60% → 6+, 80% → 8+; exam weight 45%, blocking. Source materials: `~/Downloads/оргпов лекции/*.pdf`, `~/Downloads/фото сливов.zip` (40 unique photos, exam 25.10.2025).

## Capabilities and Constraints

Topics with theory («Проще» + exam wording + traps + mnemonic), quizzes (single, multi, match, order, fill, open with key-point check + self-grade), mistakes box with spaced repetition, mock exam, author flashcards, cheat sheet, required readings/films, progress in localStorage, progress transfer link, light/dark theme. Leaked photos carry no marked answers — keys are reconstructed from slides and must be explained.

## Brand Commitments

Russian UI. Visual references the user supplied (binding): `~/Downloads/оргпов дизайн/` — light frosted-glass dashboards with mesh-gradient cards; dark «Ethereal» dashboard variant. Default theme light, with a toggle.

## Evidence on Hand

Lecture PDFs (13 files), leaked photos, lecturer's sample questions (Лекция 16). No answer keys for leaks exist — do not claim official answers.

## Product Principles

1. Source honesty: every question shows where it came from.
2. Retrieval over rereading: questions follow theory immediately.
3. Plain language first, exam wording second.
4. Exam-format fidelity: same types, points and thresholds.
