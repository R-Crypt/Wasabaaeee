import http.server
import socketserver
import urllib.request
import json
import os
import ssl
import time
import random
import urllib.parse

PORT = int(os.environ.get('PORT', 8000))
STATE_FILE = 'followers_state.json'
DEFAULT_START = 2962
TARGET_COUNT = 3000

def load_env():
    """Simple parser to load .env file if present without dependencies"""
    if os.path.exists('.env'):
        try:
            with open('.env', 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ[k.strip()] = v.strip()
        except Exception as e:
            print(f"[Server] Failed to read .env file: {e}")

def get_simulated_count():
    """Loads state from disk, increments follower count, and returns it"""
    state = {'count': DEFAULT_START, 'last_update': time.time()}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                state = json.load(f)
        except Exception as e:
            print(f"[Server] Failed to load state: {e}")
            
    now = time.time()
    last_update = state.get('last_update', now)
    elapsed = now - last_update
    
    # Calculate next milestone target dynamically
    current_count = state['count']
    if current_count < 3000:
        target_count = 3000
    else:
        target_count = (current_count // 1000) * 1000 + 1000

    # Increment count by 1 follower every 45-90 seconds on average (random chance)
    if current_count < target_count and elapsed > 45:
        if random.random() < 0.35:  # ~35% chance per API poll check after cooldown
            state['count'] = min(current_count + 1, target_count)
            state['last_update'] = now
            try:
                with open(STATE_FILE, 'w') as f:
                    json.dump(state, f)
                print(f"[Server] Simulated follower count incremented to: {state['count']}")
            except Exception as e:
                print(f"[Server] Failed to save state: {e}")
                
    return state['count']

def fetch_real_followers():
    """Tries to scrape Instagram followers using session cookie or RapidAPI"""
    load_env()
    session_id = os.environ.get('INSTAGRAM_SESSION_ID')
    rapidapi_key = os.environ.get('RAPIDAPI_KEY')
    rapidapi_host = os.environ.get('RAPIDAPI_HOST', 'instagram-scraper-api2.p.rapidapi.com')
    
    # Method 1: Direct query authenticated with Instagram session cookie
    if session_id:
        # Instagram stores the sessionid URL-encoded in the browser cookie jar,
        # but the HTTP Cookie header needs the decoded value (: not %3A)
        decoded_session = urllib.parse.unquote(session_id)
        
        # Extract user ID from the session (it's the number before the first colon)
        user_id = decoded_session.split(':')[0] if ':' in decoded_session else ''
        
        url = 'https://www.instagram.com/api/v1/users/web_profile_info/?username=wasabaaeee'
        req = urllib.request.Request(
            url,
            headers={
                'x-ig-app-id': '936619743392459',
                # Mobile User-Agent works much more reliably with session cookies
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://www.instagram.com/',
                'Cookie': f'sessionid={decoded_session}; ds_user_id={user_id}',
            },
            method='GET'
        )
        context = ssl._create_unverified_context()
        try:
            with urllib.request.urlopen(req, context=context, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                count = data['data']['user']['edge_followed_by']['count']
                print(f'[Server] Live fetch SUCCESS (session cookie). Followers: {count}')
                return count
        except Exception as e:
            print(f'[Server] Session cookie fetch failed: {e}')

    # Method 2: RapidAPI query if API key is provided
    if rapidapi_key:
        url = f'https://{rapidapi_host}/user/info?username=wasabaaeee'
        req = urllib.request.Request(
            url,
            headers={
                'x-rapidapi-key': rapidapi_key,
                'x-rapidapi-host': rapidapi_host
            },
            method='GET'
        )
        context = ssl._create_unverified_context()
        try:
            with urllib.request.urlopen(req, context=context, timeout=8) as response:
                data = json.loads(response.read().decode('utf-8'))
                count = None
                if 'data' in data and 'user' in data['data']:
                    count = data['data']['user']['edge_followed_by']['count']
                elif 'followers' in data:
                    count = int(data['followers'])
                elif 'follower_count' in data:
                    count = int(data['follower_count'])
                
                if count is not None:
                    print(f"[Server] RapidAPI query successful. Count: {count}")
                    return count
        except Exception as e:
            print(f"[Server] RapidAPI query failed: {e}")

    # Method 3: Fallback anonymous query
    url = 'https://www.instagram.com/api/v1/users/web_profile_info/?username=wasabaaeee'
    req = urllib.request.Request(
        url,
        headers={
            'x-ig-app-id': '936619743392459',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://www.instagram.com/wasabaaeee/'
        },
        method='GET'
    )
    context = ssl._create_unverified_context()
    try:
        with urllib.request.urlopen(req, context=context, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            count = data['data']['user']['edge_followed_by']['count']
            print(f"[Server] Direct query successful. Count: {count}")
            return count
    except Exception as e:
        # Avoid flood logs for blocks
        pass

    return None

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Force browsers to always fetch the latest files (no caching)
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if self.path == '/api/followers':
            self.handle_followers_get()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/followers':
            self.handle_followers_post()
        else:
            self.send_error(404, "File not found")

    def handle_followers_get(self):
        # Try fetching real followers first
        count = fetch_real_followers()
        mode = "live"
        
        # Fallback to simulated count if blocked/limits reached
        if count is None:
            count = get_simulated_count()
            mode = "simulated"
        else:
            # Update local state file with real count to persist
            state = {'count': count, 'last_update': time.time()}
            try:
                with open(STATE_FILE, 'w') as f:
                    json.dump(state, f)
            except Exception as e:
                print(f"[Server] Failed to save real count: {e}")
        
        proxy_response = {
            "result": {
                "edge_followed_by": {
                    "count": count
                }
            },
            "mode": mode
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(proxy_response).encode('utf-8'))

    def handle_followers_post(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)
            if 'count' in data:
                new_count = int(data['count'])
                state = {'count': new_count, 'last_update': time.time()}
                with open(STATE_FILE, 'w') as f:
                    json.dump(state, f)
                print(f"[Server] Follower count manually updated to: {new_count}")
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'count': new_count}).encode('utf-8'))
                return
        except Exception as e:
            print(f"[Server] Failed to handle manual count post: {e}")
            
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'Invalid request'}).encode('utf-8'))

# Make sure we serve files from the current directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Allow socket address reuse to prevent "address already in use" errors on restarts
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
