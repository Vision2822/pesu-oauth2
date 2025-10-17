import requests
import time
import re
from bs4 import BeautifulSoup

BASE_URL = "https://www.pesuacademy.com/Academy"
LOGIN_PAGE_URL = f"{BASE_URL}/"
AUTH_URL = f"{BASE_URL}/j_spring_security_check"
PROFILE_URL = f"{BASE_URL}/s/studentProfilePESUAdmin"

PROFILE_REFERER_URL = f"{BASE_URL}/s/studentProfilePESU"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest"
}

def _find_next_label_text(soup, text):
    label = soup.find("label", string=lambda s: s and text in s)
    if label and label.find_next_sibling("label"):
        return label.find_next_sibling("label").get_text(strip=True)
    return None

def login_and_get_profile(username, password):
    session = requests.Session()
    try:

        resp = session.get(LOGIN_PAGE_URL, headers={"User-Agent": HEADERS["User-Agent"]}, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        login_csrf_tag = soup.find("input", {"name": "_csrf"})
        if not login_csrf_tag:
            return {"success": False, "error": "Login form CSRF token not found."}

        payload = {"j_username": username, "j_password": password, "_csrf": login_csrf_tag["value"]}
        login_res = session.post(AUTH_URL, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": HEADERS["User-Agent"]}, timeout=10)
        login_res.raise_for_status()
        if "Bad credentials" in login_res.text:
            return {"success": False, "error": "Invalid credentials provided."}

        dash_res = session.get(LOGIN_PAGE_URL, headers=HEADERS)
        dash_res.raise_for_status()
        soup = BeautifulSoup(dash_res.text, "html.parser")

        profile_csrf_tag = soup.find("input", {"name": "_csrf"})
        if not profile_csrf_tag:
            return {"success": False, "error": "AJAX CSRF token (hidden input) not found on dashboard."}
        profile_csrf_token = profile_csrf_tag['value']

        profile = {}

        col = soup.find("div", class_="col-md-7 text-center")
        if col:
            profile["name"] = col.find("h4", class_="info_header").get_text(strip=True)
            profile["prn"] = col.find("h5", class_="info_header").get_text(strip=True)
            info_span = col.find("span", class_="info_text")
            if info_span:
                info_lines = [l.strip() for l in info_span.get_text(separator="\n").split("\n") if l.strip()]
                for line in info_lines:
                    if line.startswith("SRN"):
                        profile["srn"] = line.replace("SRN :", "").strip()

        if profile.get("prn") and (campus_code_match := re.match(r"PES(\d)", profile["prn"])):
            campus_code = campus_code_match.group(1)
            profile["campus_code"] = int(campus_code)
            profile["campus"] = "RR" if campus_code == "1" else "EC"

        params = {
            "menuId": "670", "url": "studentProfilePESUAdmin", "controllerMode": "6414",
            "actionType": "5", "id": "0", "selectedData": "0",
            "_": int(time.time() * 1000)
        }

        profile_headers = {
            **HEADERS,
            "X-CSRF-TOKEN": profile_csrf_token,
            "Referer": PROFILE_REFERER_URL
        }
        profile_res = session.get(PROFILE_URL, headers=profile_headers, params=params, timeout=10)
        profile_res.raise_for_status()

        profile_soup = BeautifulSoup(profile_res.text, "html.parser")

        profile["program"] = _find_next_label_text(profile_soup, "Program")
        profile["section"] = _find_next_label_text(profile_soup, "Section")
        profile["branch"] = _find_next_label_text(profile_soup, "Branch") or profile.get("branch")
        profile["semester"] = _find_next_label_text(profile_soup, "Semester") or profile.get("semester")

        email_input = profile_soup.find("input", {"id": "updateMail"})
        if email_input:
            profile["email"] = email_input.get("value")

        contact_input = profile_soup.find("input", {"id": "updateContact"})
        if contact_input:
            profile["phone"] = contact_input.get("value")

        img_tag = profile_soup.find("div", class_="media-left")
        if img_tag and img_tag.find("img"):
            src = img_tag.find("img")["src"]
            if "base64," in src:
                profile["photo_base64"] = src.split("base64,")[-1].strip()

        return {"success": True, "profile": profile}

    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"A network error occurred: {e}"}
    except Exception as e:

        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"An unexpected error occurred: {e}"}
