Maintenant Context
PROJECT OVERVIEW:
We are building a responsive web application that tenants can access via a QR code.

GOAL:
Allow tenants of a real estate agency called "Heron Square" to log and track the progress of those issues, and for admins to view the maintenance issues and edit the status of the maintenance issues. The app should record data to Google Sheets and notify the maintenance crew (admins) automatically.

---

🖥️ USER EXPERIENCE FLOW:

1. **Welcome Screen**
   - Displays: "Welcome to Heron Square Maintenance"
   - Button: "Sign In"
   - Clean, minimal UI

2. **Authentication**
   - Users log in using their **email address** only
   - No registration flow required (simple email auth)
   - After signing in, users are redirected to the **Main Dashboard**

3. **Main Dashboard**
   - Button (plus sign `+`): to log a new maintenance issue
   - List view of issues submitted by the user:
     - **Issue Description**
     - **Status** (read-only for users)
     - **Timestamp** of submission

4. **Submit Maintenance Issue Form**
   - Inputs required:
     - Name and Surname (text)
     - Unit and Address: Drop-down of addresses, then once users selects one, they select the unit from a drop down that appears right after they select their address. 
      - Address options in drop-down: 34 Arnold Street, 8 Arnold Street, 186 Cole Street, 5 Franklin Road, 2Grant Street, 11 Highbury Road, 11 Lower Scott Road, 4 Lynton Road, 6 Lynton Road, 6 St Micheal, 1 Nelson Road, 3 Nelson Road, 4 Nelson Road, 5 Nelson Road, 6 Nelson Road, 7 Nelson Road, 8 Nelson Road, 9 Nelson Road, 79 Lower Main Road, 4 Roman Road, 6 Roman Road, 3 Scott Road, 17 Stanley road, 17 Stanley Road Flatlet, 21 Stanley Road, 25 Stanley Road, 25A Stanley Road, 5 Station Road
     - Once address is selected, a unit must be selected: 34 Arnold Street has 10 units, 8 Arnold Street has 6 units, 186 Cole Street has 16 units, 5 Franklin Road has 17 units, 2Grant Street has 3 units, 11 Highbury Road has 9 units, 11 Lower Scott Road has 4 units, 4 Lynton Road has 6 units, 6 Lynton Road has 6 units, 6 St Micheal has 3 units, 1 Nelson Road has 5 units, 3 Nelson Road has 4 units, 4 Nelson Road has 4 units, 5 Nelson Road has 4 units, 6 Nelson Road has 4 units, 7 Nelson Road has 4 units, 8 Nelson Road has 4 units, 9 Nelson Road has 4 units, 79 Lower Main Road has 23 units, 4 Roman Road has 5 units, 6 Roman Road has 12 units, 3 Scott Road has 5 units, 17 Stanley road has 19 units, 17 Stanley Road Flatlet has 1 unit, 21 Stanley Road has 15 units, 25 Stanley Road has 7 units, 25A Stanley Road has 2 units, 5 Station Road has 21 units
     - Issue Description (text area for users to type issue description)
     - Urgency Level (dropdown: High, Medium, Low)
   - When submitted:
     - Record is saved to a **Google Sheets spreadsheet**
     - Automatically sends an email of the Google Sheets spreadsheet to 2 admins (Me and Liz) My email: kea.khoele@gmail.com. Liz’s email: enquiries@heronsquare.co.za
     - Automatically sends an email to the **maintenance crew** of issue 
     - Timestamp is recorded

5. **Google Sheets Sync**
   - Every issue submitted is saved as a new row in Google Sheets
   - Columns: Name and Surname, Unit & Address, Issue Description, Urgency Level, Status, Timestamp

6. **Email Notification**
   - Upon new issue submission, send a formatted email to the maintenance crew with all issue details
  - How the email should be sent:
	1.	Sender:
	•	From: enquiries@heronsquare.co.za
	2.	Recipients:
	•	The maintenance crew/admins should receive it.
	•	Use Resend API for emails.
	•	Don’t hardcode the addresses into the code (so I can add/remove staff later). Instead:
	•	Store them in a Google Sheet column (“Admin Emails”) that is separate from the one that is sent to the admins (row-separated list).
	3.	Trigger:
	•	Every time a tenant logs a new issue, the system should pull the Google Sheets spreadsheet and send an email with the new entry details.

-	What the email should contain:
	•	Subject: “New Maintenance Request Submitted”
	•	Body: “Good day,
Below is the issue description of a new maintenance request. 
Please find the Heron Square maintenance issues spreadsheet attached below.”	•	Tenant name, contact, unit/apartment number
	•	Description of issue
	•	Priority/urgency (if logged)
•	Conclusion: “Kind Regards,
Heron Square”
	• The Google Sheets spreadsheet as an attachment

7. **Maintenance Crew Permissions**
   - Crew should be able to:
     - View all submitted issues
     - Only edit the **status** column via UI toggle:
       - Options for status: "In Process", "Complete"
   - Tenants (users) cannot edit or modify the status
   - Status update should reflect in Google Sheets in real-time

---

**TECH SPECS & REQUIREMENTS**

- Frontend Framework: VS Code
- Auth: Firebase Auth (email only)
- Data Backend: Google Sheets (using Google Sheets API)
- Hosting: Vercel 
- Email Notification: Use Resend for sending email notifications when new maintenance issues are logged. Integrate it with Vercel serverless functions so that whenever a tenant submits an issue, an automatic email is sent to the maintenance team 
- Admin Dashboard (password-protected view for maintenance team)

---

Please begin by generating:
1. `Home.jsx` with the Welcome screen
2. Sign-in logic (Firebase email auth)
3. Dashboard component with:
   - Issue form modal
   - Issues list (for current user) that shows users the issue description, status of issue and timestamp
4. Integration with Google Sheets API (append new rows)
5. Email trigger function (send issue info to crew)
6. Toggle component for maintenance crew to update status only, so that users can see real-time status of issues

