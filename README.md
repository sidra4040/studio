# DojoGPT: AI-Powered Vulnerability Management Assistant

## Project Overview

DojoGPT is a sophisticated, web-based chat application designed to streamline vulnerability management by providing an intelligent, conversational interface to your DefectDojo instance. It leverages the powerful Medtronic GPT language model to understand user questions, query the DefectDojo API for live data, and deliver clear, actionable insights about security vulnerabilities.

This project transforms the process of vulnerability analysis from manual data sifting into a dynamic conversation, enabling security teams to quickly find, prioritize, and understand risks within their products.

---

## Core Features

-   **AI-Powered Q&A**: Ask complex questions in natural language (e.g., "What are the most critical vulnerabilities in product X?") and receive intelligent, context-aware answers.
-   **Direct DefectDojo Integration**: Connects directly to your DefectDojo instance via its API to fetch real-time data on findings, products, and severities.
-   **Intuitive Chat Interface**: A modern, clean, and responsive chat UI allows for seamless interaction with the AI assistant.
-   **Dynamic Tool Use**: The AI can intelligently decide which DefectDojo data it needs to answer a question, making specific, efficient API calls to get findings, product lists, or vulnerability summaries as required.
-   **Actionable Summaries**: The AI is prompted to not just list data, but to summarize findings, prioritize issues based on risk, and provide clear remediation advice.

---

## Technology Stack

This application is built with a modern, server-centric web architecture designed for performance, type safety, and a great developer experience.

-   **Framework**: **Next.js 15** (with App Router)
-   **Language**: **TypeScript**
-   **Frontend**: **React**
-   **UI Components**: **ShadCN UI** - A collection of beautifully designed, accessible, and composable components.
-   **Styling**: **Tailwind CSS** - For rapid, utility-first styling.
-   **Icons**: **Lucide React** - For crisp, lightweight icons.
-   **AI Integration**: Medtronic GPT API

---

## Architectural Comparison: DojoGPT vs. Python Project

While your Python project was a powerful tool for data analysis, DojoGPT is a full-fledged web application with a fundamentally different architecture. Here’s a breakdown of the key differences:

| Aspect                  | Your Python Project                                                                   | DojoGPT (This Project)                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Execution Environment** | Runs locally as a command-line script.                                                | Runs as a web server, accessible to any user with a web browser.                                                                                                                   |
| **User Interface**      | Text-based output in a terminal.                                                      | A rich, interactive graphical chat interface built with React and modern UI components.                                                                                            |
| **Architecture**        | **Monolithic Script**: All logic (API calls, data processing, output) is in one place.  | **Client-Server Architecture**: <br> 1. **Client (Browser)**: The UI you see and interact with. <br> 2. **Server (Next.js)**: Handles API calls, AI processing, and business logic. |
| **AI Processing**       | Data is fetched, then processed locally by Python functions.                          | AI processing is delegated to the powerful **Medtronic GPT API**. The Next.js backend acts as an orchestrator.                                                                     |
| **Data Fetching**       | Makes direct API calls from the script.                                               | **Next.js Server Actions** (`'use server'`) make secure API calls to both DefectDojo and Medtronic GPT from the server-side, never exposing keys to the client.                       |
| **State Management**    | No persistent state between runs.                                                     | Manages application state (like the chat history) using React Context, providing a seamless user experience.                                                                     |
| **Deployment**          | Run the script manually (`python script.py`).                                         | Deployed as a persistent, long-running process on a server (using tools like PM2 and Nginx), making it a continuously available service. See `DEPLOY.md`.                     |

In short, we have evolved the core logic of your Python script into a robust, scalable, and user-friendly web application. The "brain" is now the Medtronic GPT, and the Next.js application serves as the essential "nervous system" that connects the user, the AI, and your live data source.
