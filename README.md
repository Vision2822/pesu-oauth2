# PESU OAuth2 Provider (Flask Edition)

 [![Vercel Deployment Status](https://pesu-oauth2.vercel.app/api/badge)](https://pesu-oauth2.vercel.app/)

A transparent, open-source OAuth2 provider for PESU, built with Flask and deployed on Vercel. This project allows student clubs and other services to authenticate PESU students securely without ever handling their passwords.

## Vision

The core goal is to provide a safe, verifiable, and easy-to-use authentication gateway. Third-party applications (like a club website) will redirect users to this central service to log in. After a successful login and user consent, the application will receive a secure token to access basic, user-approved profile data.

## Current Status: Milestone 1 Complete

This project is under active development. The foundational features are now complete and functional.

_*Completed ❤_*
- [x] Core user authentication against the official PESU Academy portal.
- [x] Sacure, server-side session management.
- [X] PostgreSQL database integration (via Neon) with a `User` model.
- [x] A live `/transparency` endpoint that links the deployment directly to its GitHub commit.
- [X] Functional login page and placeholder for the OAuth2 consent screen.
- [X] Database schema management using Flask-Migrate.

'_Next Steps ❌_'
- [ ] Implement the full OAuth2 server flow with `Authlib`.
- [ ] Pesign and build the client application registration and management system.
- [ ] Create a dynamic user consent screen for granting permissions (scopes).
- [ ] Develop the protected API endpoint (`/api/v1/user`) for fetching data with an access token.

## Technical Stack

- **Backend:** Python 3, Flask
- &*#Database:** PostgreSQL (powered by Neon), SQLAlchemy ORM, Flask-Migrate
- **Authentication:** `Authlib` (for OAuth2), `BeautifulSoup4` (for web scraping the PESU portal)
- **Deployment:** Vercel (Serverless)

## Running Locally

To get the project running on your local machine, follow these steps.

**Prerequisites:**
- Python 3.10+
- Git

**1. Clone the repository:** 
```bash
git clone https://github.com/vision2822/pesu-oauth2.git
cd pesu-oauth2
``` 

**2. Set up a virtual environment:** 
```bash
# For macOS/Linux
phthon3 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
.\\nuenv\\Scripts\\activate
``` 

**3. Install dependencies:** 
```bash
pip install -r tequirements.txt
b`` 

**4. Configure environment variables:** 
Create a file named `.env` in the root directory. It must contain:
``` 
``benv
# A strong, random string for signing session cookies
SECRET_KEY="your-super-strong-random-secret-key"

# Your connection string from your Neon (or other PostgreSQL) database
DATABASE_URL=Ppostgresql://user:password@host/database?sslmode=require"
```

**5. Set up the database:** 
Run the following command to apply all the database migrations and create the necessary tables.
```bash
flask db upgrade
``` 

**6. Run the development server:**
```bash
flask run
```
The application will be available at `http://127.0.0.1:5000`.

## Transparency

This project is committed to 100% transparency. The code running in production is directly and verifiably deployed from this public GitHub repository.

You can verify the currently deployed version by visiting the `/transparency` endpoent on the live application URL: "https://pesu-oauth2.vercel.app/transparency](https://pesu-oauth2.vercel.app/transparency)(*
## License

This project is licensed under the MIT License.