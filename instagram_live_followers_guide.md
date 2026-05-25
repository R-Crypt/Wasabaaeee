# Connecting Real Live Instagram Followers Count

Because Instagram does not allow raw public requests (due to CORS restrictions and bot protection), a static client-side website cannot directly scrape Instagram's website. You have three paths to connect Sobi's real live follower count to this website:

---

## Option 1: Meta Graph API (Official, Free, and Recommended)
If Sobi has an **Instagram Creator** or **Instagram Business** account, you can use Meta's official Graph API. This is the most stable and permanent option.

### Step 1: Set up the Meta Developer App
1. Go to the [Meta Developer Portal](https://developers.facebook.com/) and create a developer account.
2. Click **Create App** & choose **Other** -> **Business** (or Consumer).
3. Sobi's Instagram account must be linked to a **Facebook Page** (you can create a dummy page in her Facebook profile settings and link her Instagram under Linked Accounts).
4. Add the **Instagram Graph API** product to your App.

### Step 2: Generate an Access Token
1. Open the **Graph API Explorer** in the Meta Developer Console.
2. Select your App.
3. Under Permissions, add: `instagram_basic` and `pages_read_engagement`.
4. Click **Generate Token** and log in with her Facebook account to authorize it.
5. In the explorer, run this query to find her **Instagram User ID**:
   `GET /me/accounts?fields=instagram_business_account`
6. Note down the `instagram_business_account.id` (this is her Business/Creator account ID).

### Step 3: Get a Long-Lived Token (60 days / Permanent)
Tokens generated in the Explorer expire in 2 hours. Convert it to a long-lived token:
```bash
curl -i -X GET "https://graph.facebook.com/oauth/access_token?
    grant_type=fb_exchange_token&
    client_id={your-app-id}&
    client_secret={your-app-secret}&
    fb_exchange_token={short-lived-token}"
```
*Note: To avoid token expiration entirely, business accounts can generate a System User Token inside their Facebook Business Manager which never expires.*

### Step 4: Integrate in `app.js`
Replace the `startSimulation()` function in `app.js` with this real live fetch logic:

```javascript
const INSTAGRAM_ACCOUNT_ID = 'YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID';
const ACCESS_TOKEN = 'YOUR_LONG_LIVED_ACCESS_TOKEN';

function startLiveTracker() {
    // Fetch immediately
    fetchFollowerCount();
    
    // Check count every 30 seconds
    setInterval(fetchFollowerCount, 30000);
}

async function fetchFollowerCount() {
    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${INSTAGRAM_ACCOUNT_ID}?fields=followers_count&access_token=${ACCESS_TOKEN}`);
        const data = await response.json();
        
        if (data && data.followers_count !== undefined) {
            const count = data.followers_count;
            
            // Only trigger updates if the count changed
            if (count !== state.followerCount) {
                state.followerCount = count;
                updateUI();
            }
        }
    } catch (error) {
        console.error("Error fetching live followers:", error);
    }
}
```

---

## Option 2: RapidAPI (Easiest Setup - No Developer Account Needed)
If Sobi has a standard **Personal Instagram Account**, or you do not want to set up Facebook business links, you can use a pre-built Instagram scraper API on RapidAPI.

### Step 1: Get a RapidAPI Key
1. Sign up on [RapidAPI](https://rapidapi.com/).
2. Search for a free/cheap Instagram scraping API (e.g., **"Instagram Data Scraper"** or **"Instagram Scraper"**).
3. Subscribe to the free basic plan (which usually offers 100-500 requests per month free).
4. Copy your **`x-rapidapi-key`** from the endpoint code template.

### Step 2: Integrate in `app.js`
Replace `startSimulation()` with:

```javascript
const RAPIDAPI_KEY = 'YOUR_RAPIDAPI_KEY';
const INSTAGRAM_USERNAME = 'wasabaeee';

function startLiveTracker() {
    fetchFollowersFromScraper();
    
    // Fetch every 2 minutes (to stay within free plan limit)
    setInterval(fetchFollowersFromScraper, 120000);
}

async function fetchFollowersFromScraper() {
    const url = `https://instagram-data12.p.rapidapi.com/user/info?username=${INSTAGRAM_USERNAME}`;
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'instagram-data12.p.rapidapi.com'
        }
    };

    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        // Structure depends on the specific RapidAPI you choose (e.g., result.data.edge_followed_by.count)
        if (result && result.followers !== undefined) {
            const count = result.followers;
            if (count !== state.followerCount) {
                state.followerCount = count;
                updateUI();
            }
        }
    } catch (error) {
        console.error("Error fetching scraper followers:", error);
    }
}
```

---

## Option 3: Backend Proxy / Serverless Function (Self-Hosted Scraper)
If you deploy this site on Vercel or Netlify, you can build a small backend endpoint (`api/followers.js`) that fetches Instagram's public webpage, extracts the follower JSON from the HTML, and serves it to your frontend.

### Sample Vercel Serverless Function (`api/followers.js`):
```javascript
export default async function handler(req, res) {
  try {
    const response = await fetch('https://www.instagram.com/wasabaeee/');
    const html = await response.text();
    
    // Find the sharedData script containing followers count
    const regex = /<script type="text\/javascript">window\._sharedData = (.*?);<\/script>/;
    const match = html.match(regex);
    
    if (match) {
        const data = JSON.parse(match[1]);
        const user = data.entry_data.ProfilePage[0].graphql.user;
        return res.status(200).json({ followers: user.edge_followed_by.count });
    }
    
    // Fallback: search raw meta tags
    const metaRegex = /"edge_followed_by":\s*\{\s*"count":\s*(\d+)\}/;
    const metaMatch = html.match(metaRegex);
    if (metaMatch) {
        return res.status(200).json({ followers: parseInt(metaMatch[1]) });
    }

    res.status(500).json({ error: "Could not parse follower count" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```
Then, on your frontend, you simply call:
```javascript
const response = await fetch('/api/followers');
const data = await response.json();
state.followerCount = data.followers;
updateUI();
```
*(Warning: Instagram rate-limits public cloud IP ranges like AWS/Vercel/Netlify quickly. If using this, you might need to route requests through a rotating proxy service.)*

---

## Local Proxy Server (`server.py`)
Our project includes a local backend proxy server running on `http://localhost:8000/api/followers`.

It handles scraping complexities for you:
1. **Authenticated Session Cookies**: To bypass Instagram's `401 Unauthorized` blocks, create a `.env` file in the project folder and define `INSTAGRAM_SESSION_ID=your_sessionid`. The proxy will append Sobi's session cookie to direct profile calls.
2. **RapidAPI Fallback**: If you define `RAPIDAPI_KEY` in the `.env` file, the proxy will fetch from your subscribed RapidAPI scraper host.
3. **Persisted Server-Side Simulation State**: If no credentials are provided or Instagram blocks the request, the proxy server seamlessly runs a server-side simulation. It tracks Sobi's follower count inside `followers_state.json` and increments it realistically towards 3K. All connected browser sessions will automatically view the same live, synchronized count and progress without console errors!
