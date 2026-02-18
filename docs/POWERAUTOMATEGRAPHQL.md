# Power Automate Flow with Web Frontend - Setup Guide

## Overview

This guide explains how to create a Power Automate flow that can be called from a web page (HTML/JavaScript) and properly handle CORS (Cross-Origin Resource Sharing) requirements.

## The Problem

When a web browser makes a request to Power Automate's HTTP trigger from a web page, it encounters CORS restrictions. The browser blocks the request unless the server (Power Automate) explicitly allows cross-origin requests by returning proper CORS headers.

## Solution: Add CORS Headers to Response Action

### Step 1: Create Your Power Automate Flow

1. Create a new flow with an **HTTP Request** trigger (manual)
2. Set the trigger to be available to **"Anyone"**
3. Add your business logic (e.g., HTTP actions, data operations)
4. Add a **Response** action at the end

### Step 2: Configure the Response Action

In the **Response** action, configure the following:

#### Status Code
```
200
```

#### Headers
Add three headers by clicking the **+** icon for each:

| Key | Value |
|-----|-------|
| `Access-Control-Allow-Origin` | `*` |
| `Access-Control-Allow-Methods` | `POST, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type` |

> **Security Note:** Using `*` for `Access-Control-Allow-Origin` allows any website to call your flow. In production, consider restricting this to your specific domain (e.g., `https://yourdomain.com`).

#### Body
Set your response body to include the data you want to return:

```json
{
  "data": @{outputs('HTTP_action_name')?['body']}
}
```

Or reference your specific output data as needed.

### Step 3: Save and Get Your Flow URL

1. Save your flow
2. Go back to the HTTP trigger
3. Copy the **HTTP POST URL** - this is what you'll use in your web page

## Frontend Implementation

### HTML Page

Create an `index.html` file:

```html
<!doctype html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Power Automate Integration</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      max-width: 720px; 
      margin: 40px auto; 
      padding: 0 16px; 
    }
    input, button { 
      font-size: 16px; 
      padding: 10px 12px; 
    }
    button { 
      cursor: pointer; 
    }
    pre { 
      background: #f6f6f6; 
      padding: 12px; 
      overflow: auto; 
      border-radius: 4px;
    }
    .row { 
      display: flex; 
      gap: 10px; 
      margin-bottom: 20px;
    }
    .row input { 
      flex: 1; 
    }
    #status {
      font-weight: 500;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <h1>Hent studentdata</h1>

  <div class="row">
    <input id="studentnummer" placeholder="Studentnummer" />
    <button id="btn">Hent</button>
  </div>

  <p id="status"></p>
  <pre id="out">{}</pre>

  <script>
    // Replace with your Power Automate flow URL
    const FLOW_URL = "YOUR_POWER_AUTOMATE_FLOW_URL_HERE";

    const statusEl = document.getElementById("status");
    const outEl = document.getElementById("out");
    const inputEl = document.getElementById("studentnummer");

    document.getElementById("btn").addEventListener("click", async () => {
      const studentnummer = inputEl.value.trim();
      if (!studentnummer) {
        statusEl.textContent = "Vennligst skriv inn studentnummer";
        return;
      }

      statusEl.textContent = "Henter…";
      outEl.textContent = "";

      try {
        const res = await fetch(FLOW_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentnummer })
        });

        const text = await res.text();
        let data;
        try { 
          data = JSON.parse(text); 
        } catch { 
          data = { raw: text }; 
        }

        if (!res.ok) {
          statusEl.textContent = `Feil (${res.status})`;
          outEl.textContent = JSON.stringify(data, null, 2);
          return;
        }

        statusEl.textContent = "OK";
        outEl.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        statusEl.textContent = "Nettverksfeil";
        outEl.textContent = String(err);
      }
    });
  </script>
</body>
</html>
```

## Testing

### Test with curl (Command Line)

```bash
curl -X POST "YOUR_FLOW_URL" \
  -H "Content-Type: application/json" \
  -d '{"studentnummer": "12345"}'
```

### Test with Browser

1. Open `index.html` in a web browser (can be opened directly as a file)
2. Enter a student number
3. Click "Hent"
4. Verify the response appears in the output box

## Troubleshooting

### Error: "DirectApiAuthorizationRequired"
This means CORS headers are not properly configured. Double-check that all three headers are added to your Response action.

### No response or timeout
- Verify your flow URL is correct
- Check that your flow is turned on
- Check your flow's run history in Power Automate to see if the request arrived

### Empty response
- Verify your flow's Response action Body is configured correctly
- Check the flow run history to see what was actually returned

## Security Considerations

1. **Limit Access-Control-Allow-Origin**: Change `*` to your specific domain in production
2. **URL Security**: The flow URL contains a signature token - treat it like a password
3. **Input Validation**: Always validate input data in your Power Automate flow
4. **Rate Limiting**: Consider implementing throttling in your flow to prevent abuse

## Example Response Format

Your Power Automate flow should return JSON data like:

```json
{
  "data": {
    "studenterGittFeideBrukere": [
      {
        "id": "OTk6MjE1LDY0OTM0Ng",
        "personProfil": {
          "navn": {
            "fornavn": "Test",
            "etternavn": "Bruker"
          },
          "privatEpost": "test@example.com"
        }
      }
    ]
  }
}
```

## Resources

- [Power Automate HTTP Request Trigger Documentation](https://learn.microsoft.com/en-us/power-automate/triggers-introduction)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Fetch API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)