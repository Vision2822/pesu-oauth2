import requests
import base64
from bs4 import BeautifulSoup

BASE_URL = "https://www.pesuacademy.com/Academy"
LOGIN_PAGE_URL = f"{BASE_URL}/"
AUTH_URL = f"{BASE_URL}/j_spring_security_check"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
}

def login_and_get_profile(username, password):
    session = requests.Session()
    try:
        resp = session.get(LOGIN_PAGE_URL, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        csrf_token_tag = soup.find("input", {"name": "_csrf"})
        if not csrf_token_tag:
            return {"success": False, "error": "CSRF token not found."}

        payload = {"j_username": username, "j_password": password, "_csrf": csrf_token_tag["value"]}
        login_res = session.post(AUTH_URL, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded", **HEADERS}, timeout=10)
        login_res.raise_for_status()

        if "Bad credentials" in login_res.text:
            return {"success": False, "error": "Invalid credentials provided."}

        dash_res = session.get(LOGIN_PAGE_URL, headers=HEADERS, timeout=10)
        dash_res.raise_for_status()
        soup = BeautifulSoup(dash_res.text, "html.parser")

        profile = {
            "name": None, "prn": None, "srn": None, "semester": None,
            "branch": None, "photo_base64": None
        }

        img_tag = soup.find("div", class_="user_image")
        if img_tag and img_tag.img and "src" in img_tag.img.attrs:
            src = img_tag.img["src"]
            if src.startswith("data:image"):
                profile["photo_base64"] = src.split("base64,")[-1].strip()

        col = soup.find("div", class_="col-md-7 text-center")
        if col:
            name_tag = col.find("h4", class_="info_header")
            if name_tag: profile["name"] = name_tag.get_text(strip=True)

            prn_tag = col.find("h5", class_="info_header")
            if prn_tag: profile["prn"] = prn_tag.get_text(strip=True)

            info_span = col.find("span", class_="info_text")
            if info_span:
                info_lines = [l.strip() for l in info_span.get_text(separator="\n").split("\n") if l.strip()]
                for line in info_lines:
                    if line.startswith("SRN"):
                        profile["srn"] = line.replace("SRN :", "").strip()
                    elif line.lower().startswith("sem-"):
                        profile["semester"] = line.strip()
                    else:
                        profile["branch"] = line.strip()

        return { "success": True, "profile": profile }

    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"A network error occurred: {e}"}
    except Exception as e:
        return {"success": False, "error": f"An unexpected error occurred: {e}"}
