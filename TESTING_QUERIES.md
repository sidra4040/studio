# DojoGPT - Comprehensive Testing Queries

This document provides a structured list of questions to test the full range of DojoGPT's capabilities. The queries are organized by complexity and type, allowing you to systematically verify the chatbot's accuracy and analytical power.

---

### 1. Simple Data Retrieval (Single Fact Queries)
*Goal: Test basic, direct data retrieval using the `get_findings` tool.*

- "How many critical vulnerabilities are open in MCLH?"
- "Show me the 5 most recent findings across all products."
- "List all open vulnerabilities in MCLS reported by SonarQube."
- "What is the total count of active findings in the Carelink Network?"
- "Are there any high severity issues in Patient Connector 24965?"
- "How many total findings are present in Linq Mobile Manager?"
- "Find the vulnerability with ID 12345."

---

### 2. Filtered Lists (Combining Filters)
*Goal: Test the `get_findings` tool with multiple parameters.*

- "Show me all critical and high findings in CLEM found by DependencyTrack."
- "List vulnerabilities in MCLS related to 'openssl'."
- "Find all 'High' severity vulnerabilities in 'Carelink Network' that are older than 180 days."
- "List active findings in the 'CRM_MCLS_Android' engagement."
- "Show me all vulnerabilities with a CVSS score greater than 9.0 in the 'MCLH' product."
- "List all vulnerabilities for CVE-2021-44228."

---

### 3. Component & Library Analysis
*Goal: Test the `analyze_vulnerability_data` tool for component-centric insights.*

- "Which component is responsible for the most vulnerabilities in MCLH?"
- "If you could fix only one component in Patient Connector 24965, which one gives the biggest risk reduction?"
- "What are the top 3 most vulnerable libraries in CLEM?"
- "Which components in Smart Reader 25000 have vulnerabilities that have persisted for more than 6 months?"
- "List all products that have a vulnerability in the 'python' component."
- "What is the severity distribution for the 'openssl' component across all products?"

---

### 4. Tool & Scanner Analysis
*Goal: Test the `analyze_vulnerability_data` tool for tool-centric insights.*

- "Which tool reports the most vulnerabilities in Carelink Network?"
- "Which scanner has found the most 'Critical' findings across all products?"
- "Compare the findings of Jfrog and DependencyTrack in 'MyCareLink Patient Monitor'."
- "What types of vulnerabilities does SonarQube typically find in MCLS?"
- "Are there tools reporting duplicate or recurring findings in DLUT?"

---

### 5. Product-Level Insights & KPIs
*Goal: Test high-level product analysis.*

- "Give me the severity distribution for the CLEM product."
- "Which product has the highest number of 'Critical' vulnerabilities?"
- "List the top 5 components causing the most vulnerabilities in MCLS."
- "How many aging vulnerabilities (>90 days) exist in MyCareLink Relay, and which components are affected?"
- "What are the most common CWEs in 'Patient Connector 24967'?"

---

### 6. Cross-Product & Comparative Analysis
*Goal: Test the most complex analytical queries involving multiple entities.*

- "Which vulnerable component is shared between CLEM, MCLH, and MCLS?"
- "Compare the severity distribution between the MCLS and MCLH products."
- "Which 3 libraries appear most frequently in critical CVEs across all products?"
- "How does the vulnerability profile of MCLH compare with MCLS, tool-wise and component-wise?"
- "Which product among CLEM, MCLS, and Mlife has the highest number of critical vulnerabilities?"

---

### 7. Risk & Prioritization Scenarios
*Goal: Test the AI's ability to provide actionable recommendations.*

- "If I could patch only one component in MyCareLink Relay, which one would reduce the highest overall risk?"
- "If MCLS can only allocate resources to fix 2 components this quarter, which ones would reduce the highest CVSS-weighted risk?"
- "Which 3 libraries across all products should we focus on replacing to improve our security posture?"
- "Across all products, which component fix would have the broadest positive security impact?"
- "A developer is starting on the EVICD project. Which single component fix should they prioritize to eliminate the largest number of vulnerabilities?"
