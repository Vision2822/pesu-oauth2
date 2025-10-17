document.addEventListener('DOMContentLoaded', () => {

    function initializePage() {
        initFlowStepAnimations();
        initTextRevealAnimation();
        if (document.getElementById('startAuth')) {
            initTesterPage();
        }
    }

    function handleNavigation(event) {
        const link = event.target.closest('a');

        if (link && link.hostname === window.location.hostname && !link.closest('form')) {
            event.preventDefault();
            const href = link.href;
            const contentContainer = document.getElementById('page-content');

            contentContainer.classList.add('fade-out');

            setTimeout(() => {
                fetch(href)
                    .then(response => response.text())
                    .then(html => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');

                        document.title = doc.title;
                        contentContainer.innerHTML = doc.getElementById('page-content').innerHTML;

                        window.history.pushState({}, doc.title, href);

                        initializePage();

                        contentContainer.classList.remove('fade-out');
                    })
                    .catch(err => {
                        console.error('Failed to fetch page: ', err);
                        window.location.href = href;
                    });
            }, 300);
        }
    }

    document.addEventListener('click', handleNavigation);

    window.addEventListener('popstate', () => {
        const contentContainer = document.getElementById('page-content');
        contentContainer.classList.add('fade-out');
        setTimeout(() => {
            window.location.reload();
        }, 300);
    });

    function initFlowStepAnimations() {
        const flowSteps = document.querySelectorAll('.flow-step');
        if (flowSteps.length > 0) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            }, { threshold: 0.1 });

            flowSteps.forEach(step => observer.observe(step));
        }
    }

    function initTextRevealAnimation() {
        const container = document.getElementById('text-reveal-container');
        if (!container) return;

        const words = container.textContent.trim().split(' ');
        container.innerHTML = '';
        words.forEach(word => {
            const span = document.createElement('span');
            span.className = 'text-reveal-word';
            span.textContent = word + ' ';
            container.appendChild(span);
        });

        const wordSpans = container.querySelectorAll('.text-reveal-word');
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    wordSpans.forEach((span, index) => {
                        setTimeout(() => {
                            span.classList.add('is-visible');
                        }, index * 100);
                    });
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(container);
    }

    function initTesterPage() {
        const clientIdInput = document.getElementById('clientId');
        const clientSecretInput = document.getElementById('clientSecret');
        const startAuthBtn = document.getElementById('startAuth');
        const authUrlOutput = document.getElementById('authUrlOutput');
        const authCodeInput = document.getElementById('authCode');
        const exchangeTokenBtn = document.getElementById('exchangeToken');
        const tokenResponseOutput = document.getElementById('tokenResponse');
        const fetchUserBtn = document.getElementById('fetchUser');
        const userResponseOutput = document.getElementById('userResponse');

        let accessToken = null;

        function base64urlEncode(str) {
            return btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
                .replace(/\+/g, '-').replace(/\
        }

        async function generatePkceCodes() {
            const verifier = new Uint8Array(32);
            crypto.getRandomValues(verifier);
            const code_verifier = base64urlEncode(verifier);
            const encoder = new TextEncoder();
            const data = encoder.encode(code_verifier);
            const digest = await crypto.subtle.digest('SHA-256', data);
            const code_challenge = base64urlEncode(digest);
            return { code_verifier, code_challenge };
        }

        startAuthBtn.addEventListener('click', async () => {
            const clientId = clientIdInput.value;
            const clientSecret = clientSecretInput.value;
            if (!clientId || !clientSecret) {
                alert('Please enter both Client ID and Client Secret.');
                return;
            }
            sessionStorage.setItem('clientId', clientId);
            sessionStorage.setItem('clientSecret', clientSecret);
            const { code_verifier, code_challenge } = await generatePkceCodes();
            sessionStorage.setItem('code_verifier', code_verifier);
            const redirectUri = window.location.origin + window.location.pathname;
            const scopes = 'profile:basic profile:academic profile:contact profile:photo';
            const params = new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: scopes,
                code_challenge: code_challenge,
                code_challenge_method: 'S256',
            });
            const authUrl = `${window.location.origin}/oauth2/authorize?${params.toString()}`;
            authUrlOutput.textContent = authUrl;
            window.location.href = authUrl;
        });

        window.addEventListener('load', () => {
            if(!clientIdInput) return;
            const storedClientId = sessionStorage.getItem('clientId');
            const storedClientSecret = sessionStorage.getItem('clientSecret');
            if (storedClientId) {
                clientIdInput.value = storedClientId;
                clientSecretInput.value = storedClientSecret;
            }
            const params = new URLSearchParams(window.location.search);
            const authCode = params.get('code');
            if (authCode) {
                authCodeInput.value = authCode;
                exchangeTokenBtn.disabled = false;
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        });

        exchangeTokenBtn.addEventListener('click', async () => {
            const payload = {
                code: authCodeInput.value,
                client_id: clientIdInput.value,
                client_secret: clientSecretInput.value,
                redirect_uri: window.location.origin + window.location.pathname,
                code_verifier: sessionStorage.getItem('code_verifier'),
            };
            try {
                const response = await fetch('/proxy/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                tokenResponseOutput.textContent = JSON.stringify(data, null, 2);
                if (response.ok) {
                    accessToken = data.access_token;
                    fetchUserBtn.disabled = false;
                } else {
                    fetchUserBtn.disabled = true;
                }
            } catch (error) {
                tokenResponseOutput.textContent = `Error: ${error.message}`;
            }
        });

        fetchUserBtn.addEventListener('click', async () => {
            if (!accessToken) return;
            try {
                const response = await fetch('/api/v1/user', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const data = await response.json();
                userResponseOutput.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                userResponseOutput.textContent = `Error: ${error.message}`;
            }
        });
    }

    initializePage();
});
