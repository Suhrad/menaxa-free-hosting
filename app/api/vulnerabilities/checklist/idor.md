# The Ultimate IDOR Checklist: Attack Vectors, Exploitation, Bypasses, and Chains

## Insecure Direct Object Reference (IDOR): A Core Vulnerability

At its heart, an **Insecure Direct Object Reference (IDOR)** is a type of access control flaw. It occurs when an application directly uses an identifier (like a user ID, a product ID, or a file name) provided by the user to access an object. If the application doesn't properly check if the user is authorized to access that specific object, an attacker can simply change the identifier to gain unauthorized access to or even modify data belonging to other users or sensitive system resources. These "objects" can be almost anything: a profile picture, a comment, personal information (PII), or even an entire department's data within an organization. The impact can range from **data exposure** and **unauthorized data modification** to full **account takeover** or **privileged escalation**.

IDORs are frequently found in **APIs** and any **HTTP requests** that contain unique identifiers (for example, `user_id`, `record_id`, `item_id`, or `transaction_code`).

Given that IDORs can surface anywhere in an application, it's always a good practice to test for them whenever you spot an ID. This holds true even if the IDs seem complex (like GUIDs) or "encrypted." Always be on the lookout for any clues that might reveal these IDs (such as public profiles) or try to spot patterns that could help you generate your own IDs for testing, perhaps using tools like Burp Intruder.


**A quick tip:** Instead of blindly changing numbers in IDs hoping to stumble upon PII, focus on understanding how the application truly operates. Delve into its hidden features and functionalities; a deep understanding of the app's logic is your best bet for finding IDORs.

## Common Types of IDOR Vulnerabilities

Here are some common scenarios where IDORs can be found in the wild, based on how a parameter's value is used:

* **To retrieve a database record:**
    ```
    http://app.example.com/order_details?order_id=ORD_98765
    ```
* **To perform an operation in the system:**
    ```
    http://service.test.net/reset_password?target_user=jane_doe
    ```
* **To retrieve a file system resource:**
    ```
    http://cdn.digital.org/images?file_path=image_gallery/pic005.jpg
    ```
* **To access application functionality:**
    ```
    http://portal.data.io/dashboard?module=settings_pane
    ```

## Finding IDOR Attack Vectors and Reconnaissance

1.  **Identify Authorization Mechanisms:**
    * Determine the authorization method used (JWT, API Keys, cookies, tokens).
    * **Tip:** Replace high-privilege authorization credentials with lower-privilege ones to observe server responses.
2.  **Understand ID Usage and API Structure:**
    * Investigate how the application handles IDs, hashes, and its overall API.
    * Consult API documentation if available.
3.  **Reconnaissance Techniques:**
    * **Search Engine Scraping:** Use Google dorks (e.g., `inurl:user_id=`, `inurl:account_id=`) to find UUIDs and common IDOR URL parameters. Also, try dorking to find new or hidden endpoints that might be vulnerable.
    * **Burp Suite Extensions:** Utilize `Autorize` and `AutoRepeater` for automated detection.
    * **Historical Data Tools:** Use tools like `WaybackURLs` or `gau` to find old endpoints, then grep for UUIDs, IDs, and common IDOR URL parameters.
    * **Source Code & History Analysis:** Scrape **JS files** for API endpoints that might use UUIDs or common IDOR parameters. Also, check **GitHub repositories** and **Burp history** for leaked or referenced IDs and API structures.
    * **Active Application Interaction:** Try creating accounts (`SignUp`), performing `Reset Password`, or interacting with `Other endpoints` within the application. These features often disclose user-specific GUIDs/IDs in responses or subsequent requests.
    * **Note:** Reconnaissance for IDORs can be challenging as many are found manually through logical deduction and highly application-specific. IDORs are also frequently found on API endpoints that use JSON parameters rather than URL parameters. However, recon is still valuable for discovering low-hanging fruit.

## Key Questions to Ask When Encountering New API Endpoints:

Every time you see a new API endpoint that receives an object ID from the client, consider:

* Does the ID belong to a private resource (e.g., `/api/profile/user/123/news` vs. `/api/transactions/user/123/transaction_history`)?
* What are the IDs that belong to your account?
* What are the different possible roles in the API (e.g., standard user, premium member, administrator, auditor)?

## Manual IDOR Testing Methodology & Bypass Techniques

Here's a step-by-step approach for manually testing for IDOR vulnerabilities, incorporating common bypass techniques:

### Base Steps:

1.  **Create two accounts**, if possible, or enumerate users first.
2.  **Identify ID Parameters:** Check the request for any ID parameters (e.g., `entity_id`, `item_uuid`, `record_ref`). These IDs can be in the URL path, query parameters, request body (JSON/XML/form data), or even headers.
3.  **Attempt ID Modification:** Try changing the identified parameter value to another user's ID and observe if it allows unauthorized access or modification to their account/data.
4.  If successful, you've found an IDOR!

## Advanced Test Cases & Bypass Techniques:

1.  **Add Parameters onto Endpoints:**
    * If an endpoint doesn't seem to use an ID, try adding one to access resources. This often works when authorization is checked at a different level than the specific parameter, or if a parameter is implicitly used by a backend function.
    * **Example (Original):**
        ```http
        GET /api/v1/get_user_info HTTP/1.1
        Host: api.example.com
        ...
        ```
    * **Try this to bypass:**
        ```http
        GET /api/v1/get_user_info?target_id=USER_ABC_456 HTTP/1.1
        Host: api.example.com
        ...
        ```
    * **Pro Tip:** You can often find potential parameter names by deleting or editing other objects and observing the parameters used in those requests.

2.  **HTTP Parameter Pollution:**
    * Provide multiple values for the same parameter in a URL query string. This can trick the backend parser into prioritizing a later or specific instance of the parameter, potentially leading to unauthorized access.
    * **Examples:**
        ```http
        GET /api/account_data?profile_id=YOUR_ID&profile_id=ADMIN_ID
        GET /api/messages?user_id=ATTACKER_ALPHA&user_id=VICTIM_BETA
        GET /api/reports?report_ids[]=YOUR_REPORT_ID&report_ids[]=ANOTHER_USER_REPORT_ID
        ```
    * **Tip:** This technique might grant you access to privileged accounts.

3.  **File Extension Manipulation:**
    * Append different file extensions (e.g., `.json`, `.xml`, `.csv`, `.config`) to the end of requests that reference a document. This can bypass authorization if the application handles file types differently or relies on specific route handlers with varying access controls.
    * **Example (Original):**
        ```http
        GET /v2/download_document/DOC_XYZ_789 HTTP/1.1
        Host: files.secureapp.com
        ...
        ```
    * **Try this to bypass:**
        ```http
        GET /v2/download_document/DOC_XYZ_789.json HTTP/1.1
        Host: files.secureapp.com
        ...
        ```

4.  **Test on Outdated API Versions:**
    * Older API versions might exist on the server with weaker, less-patched access controls or different authorization logic that is easier to exploit.
    * **Example (Original):**
        ```http
        POST /api/v3/submit_data HTTP/1.1
        Host: service.data.com
        ...
        id=DATA_REC_001
        ```
    * **Try this to bypass:**
        ```http
        POST /api/v1/submit_data HTTP/1.1
        Host: service.data.com
        ...
        id=DATA_REC_001
        ```

5.  **Wrap the ID with an Array:**
    * Some parsers or backend logic might not correctly handle an ID when it's wrapped in an array, allowing it to bypass a single-value authorization check.
    * **Example (Original JSON Body):**
        ```json
        {"record_id":"ITEM_123"}
        ```
    * **Try this to bypass:**
        ```json
        {"record_id":["ITEM_123"]}
        ```

6.  **Wrap the ID with a JSON Object:**
    * Similar to array wrapping, nesting the ID within another JSON object can sometimes confuse the parser or authorization logic, leading to a bypass.
    * **Example (Original JSON Body):**
        ```json
        {"entity_id":"USER_456"}
        ```
    * **Try this to bypass:**
        ```json
        {"entity_id":{"entity_id":"USER_456"}}
        ```

7.  **JSON Parameter Pollution:**
    * Provide multiple values for the same parameter directly in the JSON request body. The backend might process only the last, first, or an unexpected instance of the duplicate parameter, bypassing authorization.
    * **Example (JSON Body):**
        ```json
        {"item_identifier":"your_item_id","item_identifier":"target_item_id"}
        ```

8.  **Decode Encoded/Encrypted IDs:**
    * If the ID appears to be encoded (e.g., Base64, URL encoding, custom encoding) or weakly encrypted, try decoding/decrypting it. Many applications encode IDs for transport rather than security. Then, encode/encrypt a different user's ID using the same method and use that value. Tools like `hashes.com` or custom scripts might assist.
    * **Example:**
        ```http
        GET /retrieve_user_profile?encoded_id=dXNlcjEyM0BleGFtcGxlLmNvbQ== HTTP/1.1
        Host: api.platform.net
        ...
        ```
        Here, `dXNlcjEyM0BleGFtcGxlLmNvbQ==` decodes to `user123@example.com`. Try encoding another email.

9.  **Test GraphQL Endpoints:**
    * If the website uses GraphQL, specifically target its endpoints for IDOR. GraphQL queries often involve explicit object IDs in their payloads, and authorization checks might not be consistently applied to all nested fields or object types.
    * **Common GraphQL Endpoints:**
        ```http
        GET /graphql HTTP/1.1
        Host: api.publicdomain.org
        ...
        ```
        ```http
        GET /api/query.php?query= HTTP/1.1
        Host: service.test.com
        ...
        ```
    * **Tip:** Look for queries that fetch data by ID and try changing the ID in the GraphQL payload (e.g., `query { user(id: "YOUR_ID") { name email } }` to `query { user(id: "OTHER_ID") { name email } }`).

10. **MFLAC (Mixed-Case Function/File Access Control):**
    * Try different casing for URLs or directory names. This can bypass controls on systems (often older ones) where file or directory names are case-sensitive, but the authorization check might be case-insensitive, or vice-versa.
    * **Example (Original):**
        ```http
        GET /access/admin_panel HTTP/1.1
        Host: secure.company.com
        ...
        ```
    * **Try this to bypass:**
        ```http
        GET /access/ADMIN_PANEL HTTP/1.1
        Host: secure.company.com
        ...
        ```

11. **Swap Complex IDs with Numerical IDs:**
    * If the application uses complex or alphanumeric IDs (like UUIDs), try replacing them with simple numerical IDs. The backend might support both types of IDs, but authorization might only be enforced for the expected complex ID format.
    * **Example (Original):**
        ```http
        GET /file_download?doc_id=90ri2-xozifke-29ikedaw0d HTTP/1.1
        Host: files.cloudhost.net
        ...
        ```
    * **Try this to bypass:**
        ```http
        GET /file_download?doc_id=302 HTTP/1.1
        Host: files.cloudhost.net
        ...
        ```
    * **Specific GUID Patterns:** Also try common GUID patterns like `00000000-0000-0000-0000-000000000000` or `11111111-1111-1111-1111-111111111111`.

12. **Change HTTP Method:**
    * Try changing the HTTP method (e.g., `GET` to `POST`/`PUT`/`DELETE`, or vice-versa). Authorization logic might be implemented differently or less strictly for certain HTTP verbs on the same endpoint.
    * **Example (Original):**
        ```http
        GET /api/v1/user_profiles/USR_111 HTTP/1.1
        Host: data.webapp.com
        ...
        ```
    * **Try this to bypass:**
        ```http
        POST /api/v1/user_profiles/USR_111 HTTP/1.1
        Host: data.webapp.com
        ...
        ```

13. **Path Traversal in IDs:**
    * Use `../` sequences within the ID parameter to try and access resources outside the intended directory or user scope, exploiting relative path resolution.
    * **Example:**
        ```http
        GET /api/v1/user_data/PROFILE_VICTIM_ID HTTP/1.1
        Host: myapp.online
        ...
        ```
    * **Try this to bypass:**
        ```http
        GET /api/v1/user_data/PROFILE_MY_ID/../PROFILE_VICTIM_ID HTTP/1.1
        Host: myapp.online
        ...
        ```

14. **Change Request Content-Type:**
    * Modify the `Content-Type` header to alternative or less common values (`application/json`, `application/xml`, `text/xml`, `text/x-json`, etc.). Authorization checks might be inconsistently implemented or bypassed by different content type parsers.
    * **Example (Original Request):**
        ```http
        GET /api/v1/users/USER_REC_1 HTTP/1.1
        Host: api.secure.net
        Content-type: application/xml
        ```
    * **Try this to bypass:**
        ```http
        GET /api/v1/users/USER_REC_2 HTTP/1.1
        Host: api.secure.net
        Content-type: application/json
        ```

15. **Send Wildcard Instead of ID:**
    * In rare cases, applications might interpret a wildcard character (`*`, `%`, `_`, `.`) as a request for "all" or specific privileged data, bypassing explicit ID-based authorization.
    * **Examples:**
        ```http
        GET /api/data_records/* HTTP/1.1
        Host: backend.service.com
        ```
        ```http
        GET /api/user_accounts/% HTTP/1.1
        Host: backend.service.com
        ```
        ```http
        GET /api/transactions/_ HTTP/1.1
        Host: backend.service.com
        ```
        ```http
        GET /api/documents/. HTTP/1.1
        Host: backend.service.com
        ```

16. **Bypass via Header Manipulation (e.g., Referer, Custom Headers):**
    * Some applications rely on specific HTTP headers (like `Referer`, `X-Forwarded-For`, `X-Original-URL`, or custom authorization headers) for additional validation or routing. Manipulating these to a different user's context or a seemingly valid context can bypass ID checks.
    * **Example (Original request for `/user_data/private_profile` might be forbidden for `YOUR_ID`):**
        ```http
        GET /user_data/private_profile HTTP/1.1
        Host: example.com
        Referer: [http://example.com/users/YOUR_ID](http://example.com/users/YOUR_ID)
        ```
    * **Try this to bypass:**
        ```http
        GET /user_data/private_profile HTTP/1.1
        Host: example.com
        Referer: [http://example.com/users/VICTIM_ID](http://example.com/users/VICTIM_ID)
        ```

17. **Test on New Features:**
    * Newly added features or recently deployed modules might have less stringent access control implementations compared to core, well-audited functionalities. Always prioritize testing new features.
    * If you find a new feature, like uploading an event picture, and it uses an API call to `/api/EventPhotosMar2025/user_upload/photo_ID`, it's possible that access control for this new feature might not be as strictly enforced.

18. **Bruteforcing IDs for 401/403 Bypass:**
    * If the server responds with a 403 Forbidden or 401 Unauthorized, do not give up immediately. This often means the ID is invalid or unauthorized. Use tools like Burp Intruder to send a large range of different IDs (e.g., from `/users/1` to `/users/1000`). Sometimes, a valid ID within a range exists, or the application might behave differently after multiple attempts.
    * **Tip:** This is especially useful for numerical IDs where the range is somewhat predictable.

### Blind IDORs

* **Action Despite Error:** This is a critical scenario. Even if the server responds with a 403 Forbidden or 401 Unauthorized, the intended action might actually be performed on the backend. Always double-check the target user's account or system state to confirm. This signifies a "blind" IDOR where the server doesn't provide explicit feedback.
* **Indirect Disclosure:** Information is not always directly disclosed in the response. Look for endpoints and features that might indirectly confirm the action or disclose information, such as:
    * Export files (e.g., reports that contain other users' data).
    * Emails sent to the attacker or target user (e.g., password reset confirmations, notification messages triggered by your action).
    * Message alerts or notifications within the application.
    * Subtle changes in the UI that reflect the action (e.g., a counter incrementing, a status changing).

### IDOR in Multi-Step Processes/Workflows

* IDORs aren't always found in single requests. Sometimes, an ID is validated in an initial step but then improperly used or re-referenced in subsequent steps of a multi-part process. Look for IDs that carry over between requests in a workflow (e.g., a booking process, a payment flow).
* **Example:** A user might select `item_ID_A` and the application checks ownership. In the next step, when confirming the purchase, if `item_ID_A` is re-sent, try changing it to `item_ID_B` (owned by another user) to see if the ownership check is absent in the second step.

### Client-Side vs. Server-Side Enforcement

* Never trust client-side validation! If you see IDs being handled or filtered only in JavaScript or browser storage, assume the server-side might be vulnerable. Always bypass client-side checks and send the modified request directly to the server.

## Random Tips/Tricks:

* Check through the same corresponding mobile API endpoints for the web app to find UUIDs if needed for IDOR exploitation, as mobile APIs might have different (and sometimes weaker) validation.
* Many times, there will be endpoints to translate emails into GUIDs; check for those, as they can reveal ID patterns.
* If it is a number ID, be sure to test through a large amount of numbers instead of just guessing (e.g., use Burp Intruder from ID 100-1000).
* If an endpoint has a name like `/api/users/my_info`, also check for `/api/admins/my_info` or similar privileged paths.
* If none of these work, get creative and ask around!

### Escalating/Chaining with IDORs Ideas:

* **Low-Impact IDOR + XSS:** If you find a low-impact IDOR (e.g., changing someone else's display name), chain that with XSS to achieve stored XSS, potentially leading to account takeover or widespread defacement.
* **IDOR + Information Disclosure:** If an IDOR on an endpoint requires a UUID, chain it with information disclosure endpoints that leak UUIDs to bypass this requirement, forming a stronger attack chain.
* If none of these work, get creative and ask around!
