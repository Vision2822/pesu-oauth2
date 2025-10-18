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

    // ========== UPDATED TESTER PAGE LOGIC ==========
    function initTesterPage() {
        const clientIdInput = document.getElementById('clientId');
        const startAuthBtn = document.getElementById('startAuth');
        const authUrlOutput = document.getElementById('authUrlOutput');
        const authCodeInput = document.getElementById('authCode');
        const exchangeTokenBtn = document.getElementById('exchangeToken');
        const tokenResponseOutput = document.getElementById('tokenResponse');
        const fetchUserBtn = document.getElementById('fetchUser');
        const userResponseOutput = document.getElementById('userResponse');
        const resetFlowBtn = document.getElementById('resetFlow');

        // Storage keys
        const STORAGE = {
            CLIENT_ID: 'oauth_client_id',
            CODE_VERIFIER: 'oauth_code_verifier',
            CODE_CHALLENGE: 'oauth_code_challenge',
            STATE: 'oauth_state',
            SCOPES: 'oauth_scopes',
            ACCESS_TOKEN: 'oauth_access_token',
            REFRESH_TOKEN: 'oauth_refresh_token'
        };

        let accessToken = localStorage.getItem(STORAGE.ACCESS_TOKEN);

        // Base64URL encoding helper
        function base64urlEncode(arrayBuffer) {
            const bytes = new Uint8Array(arrayBuffer);
            let str = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                str += String.fromCharCode(bytes[i]);
            }
            return btoa(str)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        }

        // Generate random string
        function generateRandomString(length) {
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            return base64urlEncode(array);
        }

        // Generate PKCE codes
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

        // Get selected scopes
        function getSelectedScopes() {
            const checkboxes = document.querySelectorAll('input[name="scopes"]:checked');
            const scopes = Array.from(checkboxes).map(cb => cb.value);
            return scopes.length > 0 ? scopes.join(' ') : 'profile:basic';
        }

        // Restore saved data on page load
        const savedClientId = localStorage.getItem(STORAGE.CLIENT_ID);
        if (savedClientId && clientIdInput) {
            clientIdInput.value = savedClientId;
        }

        const savedScopes = localStorage.getItem(STORAGE.SCOPES);
        if (savedScopes) {
            const scopeArray = savedScopes.split(' ');
            document.querySelectorAll('input[name="scopes"]').forEach(checkbox => {
                checkbox.checked = scopeArray.includes(checkbox.value);
            });
        }

        // Check if we have an access token already
        if (accessToken && fetchUserBtn) {
            fetchUserBtn.disabled = false;
        }

        // Step 1: Start Authorization
        if (startAuthBtn) {
            startAuthBtn.addEventListener('click', async () => {
                const clientId = clientIdInput.value.trim();

                if (!clientId) {
                    alert('Please enter a Client ID');
                    return;
                }

                const scopes = getSelectedScopes();
                if (!scopes) {
                    alert('Please select at least one scope');
                    return;
                }

                startAuthBtn.disabled = true;

                try {
                    // Generate PKCE codes and state
                    const { code_verifier, code_challenge } = await generatePkceCodes();
                    const state = generateRandomString(32);

                    // Store in localStorage
                    localStorage.setItem(STORAGE.CLIENT_ID, clientId);
                    localStorage.setItem(STORAGE.CODE_VERIFIER, code_verifier);
                    localStorage.setItem(STORAGE.CODE_CHALLENGE, code_challenge);
                    localStorage.setItem(STORAGE.STATE, state);
                    localStorage.setItem(STORAGE.SCOPES, scopes);

                    // Display PKCE info (if elements exist)
                    const codeVerifierElem = document.getElementById('codeVerifier');
                    const codeChallengeElem = document.getElementById('codeChallenge');
                    const pkceInfoElem = document.getElementById('pkceInfo');

                    if (codeVerifierElem) codeVerifierElem.value = code_verifier;
                    if (codeChallengeElem) codeChallengeElem.value = code_challenge;
                    if (pkceInfoElem) pkceInfoElem.style.display = 'block';

                    // Build authorization URL
                    const redirectUri = window.location.origin + window.location.pathname;
                    const authUrl = new URL('/oauth2/authorize', window.location.origin);
                    authUrl.searchParams.append('response_type', 'code');
                    authUrl.searchParams.append('client_id', clientId);
                    authUrl.searchParams.append('redirect_uri', redirectUri);
                    authUrl.searchParams.append('scope', scopes);
                    authUrl.searchParams.append('state', state);
                    authUrl.searchParams.append('code_challenge', code_challenge);
                    authUrl.searchParams.append('code_challenge_method', 'S256');

                    if (authUrlOutput) {
                        authUrlOutput.textContent = authUrl.toString();
                    }

                    // Redirect to authorization page
                    setTimeout(() => {
                        window.location.href = authUrl.toString();
                    }, 1000);

                } catch (error) {
                    console.error('Error generating PKCE codes:', error);
                    alert('Failed to start authorization: ' + error.message);
                    startAuthBtn.disabled = false;
                }
            });
        }

        // Step 2: Handle OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        const returnedState = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
            alert(`Authorization error: ${error}\n${urlParams.get('error_description') || ''}`);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (authCode && authCodeInput) {
            // Verify state to prevent CSRF
            const savedState = localStorage.getItem(STORAGE.STATE);

            if (returnedState !== savedState) {
                alert('State mismatch! Possible CSRF attack. Please try again.');
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }

            authCodeInput.value = authCode;
            if (exchangeTokenBtn) {
                exchangeTokenBtn.disabled = false;
            }

            // Clean URL but keep the code in the input
            window.history.replaceState({}, document.title, window.location.pathname);

            // Auto-scroll to step 3 if element exists
            const step3Elem = document.getElementById('step3');
            if (step3Elem) {
                setTimeout(() => {
                    step3Elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500);
            }
        }

        // Step 3: Exchange code for token (PUBLIC CLIENT - NO SECRET)
        if (exchangeTokenBtn) {
            exchangeTokenBtn.addEventListener('click', async () => {
                const code = authCodeInput.value.trim();
                const clientId = localStorage.getItem(STORAGE.CLIENT_ID);
                const codeVerifier = localStorage.getItem(STORAGE.CODE_VERIFIER);
                const redirectUri = window.location.origin + window.location.pathname;

                if (!code) {
                    alert('Authorization code is missing');
                    return;
                }

                if (!clientId || !codeVerifier) {
                    alert('Missing PKCE parameters. Please restart the flow.');
                    return;
                }

                exchangeTokenBtn.disabled = true;

                try {
                    // Direct call to /oauth2/token (no proxy needed for public clients)
                    const response = await fetch('/oauth2/token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            grant_type: 'authorization_code',
                            code: code,
                            redirect_uri: redirectUri,
                            client_id: clientId,
                            code_verifier: codeVerifier,
                            // NO client_secret - this is a public client!
                        })
                    });

                    const data = await response.json();

                    if (tokenResponseOutput) {
                        tokenResponseOutput.textContent = JSON.stringify(data, null, 2);
                    }

                    if (response.ok) {
                        accessToken = data.access_token;
                        localStorage.setItem(STORAGE.ACCESS_TOKEN, data.access_token);

                        if (data.refresh_token) {
                            localStorage.setItem(STORAGE.REFRESH_TOKEN, data.refresh_token);
                        }

                        if (fetchUserBtn) {
                            fetchUserBtn.disabled = false;
                        }

                        // Show token info section
                        const tokenInfoElem = document.getElementById('tokenInfo');
                        if (tokenInfoElem) {
                            tokenInfoElem.style.display = 'block';
                        }

                        // Auto-scroll to step 4
                        const step4Elem = document.getElementById('step4');
                        if (step4Elem) {
                            setTimeout(() => {
                                step4Elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 500);
                        }
                    } else {
                        throw new Error(data.error_description || data.error || 'Token exchange failed');
                    }

                } catch (error) {
                    console.error('Token exchange error:', error);
                    if (tokenResponseOutput) {
                        tokenResponseOutput.textContent = `Error: ${error.message}`;
                    }
                    alert('Token exchange failed: ' + error.message);
                } finally {
                    exchangeTokenBtn.disabled = false;
                }
            });
        }

        // Step 4: Fetch user info
        if (fetchUserBtn) {
            fetchUserBtn.addEventListener('click', async () => {
                if (!accessToken) {
                    alert('No access token available. Please complete the token exchange first.');
                    return;
                }

                fetchUserBtn.disabled = true;

                try {
                    const response = await fetch('/api/v1/user', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });

                    const data = await response.json();

                    if (userResponseOutput) {
                        userResponseOutput.textContent = JSON.stringify(data, null, 2);
                    }

                    if (response.ok) {
                        // Show user info section
                        const userInfoElem = document.getElementById('userInfo');
                        if (userInfoElem) {
                            userInfoElem.style.display = 'block';
                        }
                    } else {
                        throw new Error(data.message || data.error || 'Failed to fetch user info');
                    }

                } catch (error) {
                    console.error('User info fetch error:', error);
                    if (userResponseOutput) {
                        userResponseOutput.textContent = `Error: ${error.message}`;
                    }
                    alert('Failed to fetch user info: ' + error.message);
                } finally {
                    fetchUserBtn.disabled = false;
                }
            });
        }

        // Reset flow
        if (resetFlowBtn) {
            resetFlowBtn.addEventListener('click', () => {
                if (confirm('This will clear all stored data and reset the OAuth flow. Continue?')) {
                    // Clear all OAuth data from localStorage
                    Object.values(STORAGE).forEach(key => localStorage.removeItem(key));

                    // Clear URL parameters
                    window.history.replaceState({}, document.title, window.location.pathname);

                    // Reload page
                    window.location.reload();
                }
            });
        }
    }

    initializePage();
});
