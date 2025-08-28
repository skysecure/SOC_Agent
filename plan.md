High-Level Flow of the Application

This flow describes the entire process from receiving incident details to generating and displaying the Security Incident Report using Google Gemini for severity assessment and Root Cause Analysis (RCA).

1. User Input (SOC Agent - Frontend)

Action: The SOC agent pastes the incident details in JSON format into a textarea input field on the dashboard.

Trigger: The agent clicks the "Generate RCA" button.

2. Frontend to Backend Communication

Action: The frontend sends the incident details (in JSON format) to the backend via a POST request to the /analyse endpoint.

API Call: The incident data is sent for processing (severity assessment and RCA generation) via the backend.

3. Backend Processing

Action: The backend receives the incident details and interacts with the Google Gemini API for:

Severity Assessment: Using Gemini, the backend automatically determines the severity (Low, Medium, High, Critical).

Root Cause Analysis (RCA): Gemini generates the RCA based on the incident data.

Processing: The backend formats the data into the required Security Incident Report.

4. Backend to Frontend Communication

Action: The backend sends the generated RCA report (formatted as per the predefined template) back to the frontend.

5. Report Display (Frontend)

Action: The RCA report is displayed on the dashboard for the SOC agent to review.

Final Output: The agent can now view the Security Incident Report with detailed findings, severity, and recommended next steps.

High-Level Flow Diagram:
                           +---------------------------+
                           |       Frontend (React)     |
                           |   - Textarea for Incident  |
                           |     Details (JSON format)  |
                           |   - "Generate RCA" Button  |
                           |   - Display RCA Report     |
                           +---------------------------+
                                       |
                                       | (Incident JSON Data)
                                       v
                           +---------------------------+
                           |    Backend (Node.js +      |
                           |    Express.js)             |
                           |    - /analyse API          |
                           |    - Google Gemini API     |
                           |    - RCA Report Generation |
                           +---------------------------+
                                       |
                                       | (Google Gemini API Interaction)
                                       v
                             +-------------------------+
                             |    Google Gemini API    |
                             |    - Severity Assessment |
                             |    - Root Cause Analysis |
                             +-------------------------+
                                       |
                                       v
                           +---------------------------+
                           |    Backend Response       |
                           |    - Send RCA Report      |
                           +---------------------------+
                                       |
                                       v
                           +---------------------------+
                           |       Frontend (React)    |
                           |   - Display RCA Report    |
                           +---------------------------+

Summary:

Incident Details Input: The SOC agent provides the incident details in JSON format via the frontend.

Backend Processing: The backend sends this data to Google Gemini for automatic severity assessment and RCA generation.

RCA Report Display: The processed RCA report is returned to the frontend and displayed to the agent for review.

This flow ensures the entire process is automated without manual intervention, leveraging Google Gemini for both severity assessment and root cause analysis.