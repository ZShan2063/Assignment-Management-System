import json
import urllib.request
import urllib.error

url = 'http://127.0.0.1:8000/api/users/register/'
data = json.dumps({
    'username': 'testuser123',
    'email': 'testuser123@example.com',
    'password': 'Password123',
    'first_name': 'Test',
    'last_name': 'User',
    'role': 'student',
    'course': 'BCA',
    'semester': 1,
}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(req) as resp:
        print('status', resp.status)
        print(resp.read().decode())
except urllib.error.HTTPError as e:
    print('status', e.code)
    print(e.read().decode())
