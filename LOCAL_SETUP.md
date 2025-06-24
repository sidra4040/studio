# Local Development Setup Guide

This guide will walk you through setting up the DojoGPT project for local development in Visual Studio Code.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

-   [Node.js](https://nodejs.org/) (v20 or later is recommended)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)
-   [Visual Studio Code](https://code.visualstudio.com/)

## Setup Steps

1.  **Clone the Repository**

    If you have access to the git repository, clone it. Otherwise, download the project source code to your local machine.

2.  **Install Dependencies**

    Open a terminal in the root directory of the project and run the following command to install all the necessary packages:

    ```bash
    npm install
    ```

3.  **Configure Environment Variables**

    The application uses API keys and other secrets which should not be committed to version control.

    a. Create a new file named `.env` in the root of the project by copying the example file:

    ```bash
    cp .env.example .env
    ```

    b. Open the `.env` file and fill in the required values:

    -   `GOOGLE_API_KEY`: Your API key for Google AI. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey). This is used for the core GenAI features.
    -   `DEFECTDOJO_API_URL`: The URL of your DefectDojo instance.
    -   `DEFECTDOJO_API_KEY`: Your API v2 key from DefectDojo. You can generate this from your DefectDojo profile page.
    -   `MEDTRONIC_GPT_*`: Credentials for the custom Medtronic GPT API. Fill these in if you have access and intend to use this tool.

4.  **Run the Application**

    You'll need to run two processes in separate terminals for full functionality: the Next.js frontend and the Genkit AI flows.

    -   **Terminal 1: Run the Next.js App**
        This command starts the main web application on `http://localhost:9002`.

        ```bash
        npm run dev
        ```

    -   **Terminal 2: Run Genkit**
        This command starts the Genkit development server, which makes your AI flows available to the frontend. It will also watch for changes and reload automatically.

        ```bash
        npm run genkit:watch
        ```

    You can now access the application at [http://localhost:9002](http://localhost:9002).

## Recommended VS Code Extensions

To improve your development experience, we recommend installing the following VS Code extensions:

-   [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint): Integrates ESLint into VS Code.
-   [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss): Provides intelligent autocompletion, linting, and more for Tailwind CSS.
-   [Prettier - Code Formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode): An opinionated code formatter that helps maintain consistent code style.
-   [Lucide Icons](https://marketplace.visualstudio.com/items?itemName=lucide-icons.lucide): Helps with finding and using icons from the `lucide-react` library.
