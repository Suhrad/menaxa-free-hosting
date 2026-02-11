import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'app', 'api', 'programs', 'reports', 'data.json');
    
    try {
      await fs.access(filePath);
    } catch {
      const initialData = [
        {
          "vulnerability_name": "IDOR (Insecure Direct Object Reference)",
          "summary": "Insecure Direct Object Reference (IDOR) allows an unauthenticated/unauthorized user to access or manipulate sensitive data or functionality by modifying a parameter value that directly refers to a system object.",
          "severity": "High",
          "target": "[Specify affected asset, e.g., web.example.com]",
          "url_location": "[Full URL of the vulnerable endpoint, e.g., https://web.example.com/user/profile?id=123]",
          "steps_to_reproduce": [
            "1. Log in as [User A, e.g., a regular user].",
            "2. Navigate to [Affected feature/page, e.g., 'My Profile'].",
            "3. Observe the URL or request parameters. It contains a parameter like `id=123` or `userId=abc`.",
            "4. Log out or open a new browser/incognito window without authentication.",
            "5. Access the same URL or send the same request, but change the `[vulnerable parameter]` to `[another user's ID or an arbitrary ID, e.g., id=456]`.",
            "6. **[What happened]**: Observe that you can view/modify `[another user's data/object, e.g., User B's profile, User B's order details]`.",
            "7. **[What should happen]**: The application should have returned an 'Unauthorized' or 'Access Denied' error, or only allowed access to the logged-in user's data."
          ],
          "proof_of_concept": {
            "request_example": "GET /user/profile?id=456 HTTP/1.1\nHost: web.example.com\nCookie: sessionid=[your_session_id]",
            "response_example": "HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  \"id\": 456,\n  \"username\": \"victim_user\",\n  \"email\": \"victim@example.com\",\n  \"sensitive_data\": \"...\"\n}",
            "notes": "Attach screenshots or a video demonstrating the unauthorized access."
          },
          "impact": "An attacker can view, modify, or delete sensitive data belonging to other users or system objects, leading to privacy breaches, data manipulation, or even account takeovers in some scenarios.",
          "remediation_suggestion": "Implement proper authorization checks at the server-side for all requests accessing or manipulating objects. Ensure that the authenticated user is authorized to access the requested object, or use indirect object references that are mapped to the user's session on the server."
        }
      ];
      await fs.writeFile(filePath, JSON.stringify(initialData, null, 2));
    }

    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading reports.json:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
} 