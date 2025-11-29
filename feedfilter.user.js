// ==UserScript==
// @name         eRepublik Feed Filter
// @author       Curlybear
// @version      1.0
// @description  Hide autoposts and mute specific users in eRepublik friends feed
// @updateURL    https://curlybear.eu/erep/feedfilter.user.js
// @downloadURL  https://curlybear.eu/erep/feedfilter.user.js
// @match        https://www.erepublik.com/*
// @exclude      https://www.erepublik.com/*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let settings = {
        hideAutoposts: JSON.parse(localStorage.getItem('erepublik_hideAutoposts') || 'true'),
        mutedUsers: JSON.parse(localStorage.getItem('erepublik_mutedUsers') || '{}')
    };

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .feed-filter-btn {
            cursor: pointer;
            margin-left: 5px;
            font-size: 14px;
            vertical-align: middle;
        }
        .feed-filter-modal {
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
        }
        .feed-filter-modal-content {
            background-color: #fefefe;
            margin: 15% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 300px;
            border-radius: 5px;
        }
        .feed-filter-close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        .feed-filter-close:hover {
            color: black;
        }
        .mute-btn {
            background-color: transparent;
            border: none;
            color: #7f7f7f;
            padding: 0 5px;
            font-size: 11px;
            cursor: pointer;
            margin-left: 5px;
        }
        .mute-btn:hover {
            text-decoration: underline;
        }
        #mutedUsersList {
            margin-top: 10px;
            max-height: 200px;
            overflow-y: auto;
        }
        .unmute-btn {
            margin-left: 10px;
            cursor: pointer;
            color: #4267B2;
        }
    `;
    document.head.appendChild(style);

    function saveSettings() {
        localStorage.setItem('erepublik_hideAutoposts', JSON.stringify(settings.hideAutoposts));
        localStorage.setItem('erepublik_mutedUsers', JSON.stringify(settings.mutedUsers));
    }

    function hideAutoposts() {
        const posts = document.querySelectorAll('.postContainer.autoPost');
        posts.forEach(post => {
            post.style.display = settings.hideAutoposts ? 'none' : '';
        });
    }

    function addMuteButton(post) {
        if (post.querySelector('.mute-btn')) return; // Button already added

        const userLink = post.querySelector('h6 a[hovercard]');
        if (!userLink) return;

        const userId = userLink.href.split('/').pop();
        const username = userLink.textContent.trim();
        const muteBtn = document.createElement('span');
        muteBtn.textContent = 'Mute for 24h';
        muteBtn.className = 'mute-btn';

        muteBtn.addEventListener('click', () => {
            const now = Date.now();
            settings.mutedUsers[userId] = {
                username: username,
                mutedUntil: now + 24 * 60 * 60 * 1000 // 24 hours from now
            };
            saveSettings();
            filterPosts();
            updateMutedUsersList();
        });

        const actionsDiv = post.querySelector('.postInfo');
        if (actionsDiv) {
            actionsDiv.appendChild(muteBtn);
        }
    }

    function filterPost(post) {
        if (post.classList.contains('autoPost')) {
            post.style.display = settings.hideAutoposts ? 'none' : '';
            return;
        }

        const userLink = post.querySelector('h6 a[hovercard]');
        if (userLink) {
            const userId = userLink.href.split('/').pop();
            const mutedUser = settings.mutedUsers[userId];
            if (mutedUser && Date.now() < mutedUser.mutedUntil) {
                post.style.display = 'none';
            } else {
                post.style.display = '';
                if (mutedUser) {
                    delete settings.mutedUsers[userId];
                    saveSettings();
                }
            }
        }

        addMuteButton(post);
    }

    function filterPosts() {
        const posts = document.querySelectorAll('.postContainer');
        posts.forEach(filterPost);
    }

    function updateMutedUsersList() {
        const listElement = document.getElementById('mutedUsersList');
        if (!listElement) return;

        listElement.innerHTML = '';
        for (const [userId, userData] of Object.entries(settings.mutedUsers)) {
            if (Date.now() < userData.mutedUntil) {
                const listItem = document.createElement('div');
                listItem.textContent = userData.username;
                const unmuteBtn = document.createElement('span');
                unmuteBtn.textContent = 'Unmute';
                unmuteBtn.className = 'unmute-btn';
                unmuteBtn.onclick = () => {
                    delete settings.mutedUsers[userId];
                    saveSettings();
                    filterPosts();
                    updateMutedUsersList();
                };
                listItem.appendChild(unmuteBtn);
                listElement.appendChild(listItem);
            }
        }
    }

    function createModal() {
        const modal = document.createElement('div');
        modal.className = 'feed-filter-modal';
        modal.innerHTML = `
            <div class="feed-filter-modal-content">
                <span class="feed-filter-close">&times;</span>
                <h2>Feed Filter Options</h2>
                <label>
                    <input type="checkbox" id="hideAutopostsCheckbox" ${settings.hideAutoposts ? 'checked' : ''}>
                    Hide Autoposts
                </label>
                <br><br>
                <h3>Muted Users</h3>
                <div id="mutedUsersList"></div>
                <br>
                <button id="resetMutesBtn">Reset All Mutes</button>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.feed-filter-close');
        closeBtn.onclick = () => modal.style.display = 'none';

        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        };

        document.getElementById('hideAutopostsCheckbox').addEventListener('change', (e) => {
            settings.hideAutoposts = e.target.checked;
            saveSettings();
            hideAutoposts();
        });

        document.getElementById('resetMutesBtn').addEventListener('click', () => {
            settings.mutedUsers = {};
            saveSettings();
            filterPosts();
            updateMutedUsersList();
            alert('All mutes have been reset.');
        });

        updateMutedUsersList();

        return modal;
    }

    function addOptionsButton() {
        const friendsTab = document.querySelector('.tabsWrapper ul li:nth-child(2)');
        if (!friendsTab) return;

        if (friendsTab.querySelector('.feed-filter-btn')) return; // Button already added

        const optionsBtn = document.createElement('span');
        optionsBtn.textContent = '⚙️';
        optionsBtn.className = 'feed-filter-btn';
        optionsBtn.title = 'Feed Filter Options';
        friendsTab.appendChild(optionsBtn);

        const modal = createModal();
        optionsBtn.onclick = () => {
            modal.style.display = 'block';
            updateMutedUsersList();
        };
    }

    function observeForButtonPlacement() {
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    addOptionsButton();
                }
            }
        });

        const config = { childList: true, subtree: true };
        observer.observe(document.body, config);
    }

    function processNewPosts() {
        const posts = document.querySelectorAll('.postContainer:not([data-processed])');
        posts.forEach(post => {
            filterPost(post);
            post.setAttribute('data-processed', 'true');
        });
    }

    function init() {
        observeForButtonPlacement();
        filterPosts();

        // Continuously check for new posts
        setInterval(processNewPosts, 1000); // Check every second

        // Also check when scrolling
        window.addEventListener('scroll', processNewPosts);
    }

    // Run the script when the page is fully loaded
    window.addEventListener('load', init);
})();