import requests
res = requests.post("http://localhost:8000/api/auth/login", json={"email": "admin@prep100.com", "password": "password123"})
print(res.status_code)
print(res.text)
