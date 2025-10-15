import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.pesuacademy.com/Academy"
LOGIN_PAGE_URL = f"{BASE_URL}/"
AUTH_URL = f"{BASE_URL}/j_spring_security_check"
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
}

def login_and_get_profile(username, password):
    session_obj = requests.Session()
    try:
        r_get = session_obj.get(LOGIN_PAGE_URL, headers=BROWSER_HEADERS)
        r_get.raise_for_status()
        soup = BeautifulSoup(r_get.text, 'html.parser')

        login_csrf_tag = soup.find('input', {'name': '_csrf'})
        if not login_csrf_tag:
            return {"success": False, "error": "Could not find CSRF token on login page. Site may have changed."}
        login_csrf = login_csrf_tag['value']

        login_payload = {'j_username': username, 'j_password': password, '_csrf': login_csrf}
        r_post = session_obj.post(
            AUTH_URL,
            data=login_payload,
            headers={"User-Agent": BROWSER_HEADERS["User-Agent"], "Content-Type": "application/x-www-form-urlencoded"}
        )
        r_post.raise_for_status()

        if "Bad credentials" in r_post.text or "login-error" in r_post.text:
            return {"success": False, "error": "Invalid credentials provided."}

        dashboard_res = session_obj.get(LOGIN_PAGE_URL, headers=BROWSER_HEADERS)
        dashboard_soup = BeautifulSoup(dashboard_res.text, 'html.parser')

        student_name_tag = dashboard_soup.find('span', class_='app-name-font')
        student_name = student_name_tag.text.strip().title() if student_name_tag else "Unknown Student"

        return {
            "success": True,
            "student_name": student_name,
            "session_cookies": session_obj.cookies.get_dict()
        }

    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"A network error occurred: {e}"}
    except Exception as e:
        return {"success": False, "error": f"An unexpected error occurred during login: {e}"}
