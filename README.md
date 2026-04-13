# Vi-Notes: Behavioral Biometrics Authorship Verification System

## Overview

Vi-Notes is a behavioral biometrics system designed to evaluate the authenticity of typed content based on user typing patterns. Instead of relying on content analysis, the system focuses on how the text is produced. By analyzing keystroke dynamics, correction behavior, typing rhythm, and interaction patterns, it attempts to determine whether the input is likely to be human-generated or assisted.

This project was developed as a lightweight, heuristic-based solution under time and resource constraints, prioritizing interpretability and modular design over complex machine learning models.

---

## Objectives

The primary goal of this project is to explore behavioral biometrics as a method of authorship verification. Specifically, the system aims to:

* Capture real-time typing behavior
* Extract meaningful statistical features from raw input
* Evaluate multiple behavioral signals collectively
* Generate an interpretable authenticity score
* Provide clear indicators (risk flags) for suspicious patterns

---

## System Architecture

The system is structured into distinct layers to separate concerns and maintain clarity:

### 1. Input Layer

The Editor component serves as the user interface where typing occurs. It captures:

* Key press events
* Paste events
* Focus and blur events

These events are passed to the tracking layer through handler functions.

---

### 2. Tracking Layer

The `useTypingTracker` hook is responsible for collecting and organizing all behavioral data during a session. It uses references (`useRef`) to efficiently store high-frequency data without triggering unnecessary re-renders.

This layer aggregates:

* Keystroke timings
* Backspace and correction behavior
* Paste activity
* Focus changes
* Session duration

It also integrates specialized hooks for deeper analysis.

---

### 3. Feature Extraction

Two dedicated modules process raw input into structured behavioral features:

#### a. Keystroke Dynamics (`useKeystrokeDynamics`)

Captures fine-grained typing behavior, including:

* Inter-key intervals (time between consecutive key presses)
* Punctuation pauses (time after punctuation before continuing)

These features reflect typing rhythm and cognitive pauses.

---

#### b. Burst Detection (`useBurstDetection`)

Analyzes typing at a higher level by dividing the session into fixed time windows (2 seconds). It computes:

* Typing speed (WPM) per window
* Variability in typing speed (burst variance)
* Burst length and pause statistics

This helps identify whether typing occurs in natural bursts or in a uniform pattern.

---

### 4. Detection Engine

The `detectionEngine` is the core analytical component. It evaluates the session using multiple behavioral signals:

* Rhythm Score: Based on variability in typing intervals
* Punctuation Score: Based on pause behavior after punctuation
* Correction Score: Based on frequency, clustering, and latency of corrections
* Burst Score: Based on variation in typing speed over time
* Paste Score: Based on presence and extent of pasted content
* Focus Score: Based on tab switching and time away from the session

Each signal is scored individually using a soft scoring approach, avoiding rigid thresholds. The scores are then combined using a weighted model to produce a final authenticity score.

Certain conditions, such as paste events, can override the final score due to their strong implication of non-original content.

---

### 5. Output Layer

The system produces:

* A final authenticity score (0–100)
* A confidence level (low, medium, high)
* A set of risk flags explaining detected anomalies
* Supporting metrics such as WPM, error rate, and session duration

Session data is stored locally and optionally sent to a backend server for logging.

---

## Key Design Decisions

### Heuristic-Based Approach

Due to limited time and computational resources, the system uses rule-based scoring instead of machine learning. This allows:

* Transparent decision-making
* Easier debugging and explanation
* Faster implementation

---

### Soft Scoring

Instead of strict thresholds, the system uses a tolerance-based scoring function that allows gradual degradation of scores as behavior deviates from expected ranges. This reduces brittleness and better accommodates natural human variability.

---

### Session-Level Analysis

All final scores are computed at the session level to ensure stability. While burst detection uses short time windows internally, the resulting features are aggregated across the entire session before evaluation.

---

### Multi-Signal Evaluation

No single metric determines authenticity. The system combines multiple behavioral signals to improve robustness and reduce reliance on any one feature.

---

## Limitations

* The system relies on heuristic thresholds that are not empirically tuned.
* Highly skilled typists or atypical workflows may produce false positives.
* Paste detection is intentionally strict and may penalize legitimate use cases.
* No user-specific baseline profiling is implemented.
* The system does not currently use machine learning for adaptive improvement.

---

## Future Improvements

* Introduce user-specific behavioral profiles
* Replace fixed thresholds with data-driven tuning
* Incorporate dwell time (key hold duration)
* Add machine learning models for classification
* Improve handling of legitimate paste scenarios
* Enhance robustness for diverse typing styles

---

## Conclusion

Vi-Notes demonstrates how behavioral biometrics can be applied to authorship verification using a structured, interpretable approach. While not production-ready, the system provides a solid foundation for further exploration and refinement in detecting human versus assisted input through typing behavior.

---
