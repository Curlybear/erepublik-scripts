// ==UserScript==
// @name         eRepublik Article Banner
// @author		Curlybear
// @updateURL		https://curlybear.eu/erep/ereparticlebanner.user.js
// @downloadURL		https://curlybear.eu/erep/ereparticlebanner.user.js
// @version      0.1
// @description  Displays the titles of the latest 10 articles in a scrolling banner, refreshes every minute
// @match        https://www.erepublik.com/*
// @exclude      https://www.erepublik.com/*/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const url = 'https://www.erepublik.com/en/main/news/latest/all/all/1/rss';

function postIsInBanner(title) {
    const bannerContent = document.getElementById('erepublikBannerContent');
    if (bannerContent) {
        const bannerTitles = bannerContent.innerText;
        return bannerTitles.includes(title);
    }
    return false;
}

function createOrUpdateBanner() {
    let bannerContainer = document.getElementById('erepublikBannerContainer');

    if (!bannerContainer) {
        bannerContainer = document.createElement('div');
        bannerContainer.id = 'erepublikBannerContainer';

        const bannerContent = document.createElement('div');
        bannerContent.id = 'erepublikBannerContent';

        bannerContent.addEventListener('mouseenter', () => {
            bannerContent.style.animationPlayState = 'paused';
        });

        bannerContent.addEventListener('mouseleave', () => {
            bannerContent.style.animationPlayState = 'running';
        });

        bannerContainer.appendChild(bannerContent);
        const newMenuElement = document.querySelector('.new_banners_wrapper');
        newMenuElement.parentNode.insertBefore(bannerContainer, newMenuElement);
    }

    return bannerContainer.querySelector('#erepublikBannerContent');
}

function updateBanner(bannerContent, posts) {
    bannerContent.innerHTML = posts.map(post => `<a href="${post.link}" target="_blank">${post.title}</a>`).join(' ● ');
}

function fetchAndDisplayPosts() {
    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function (response) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(response.responseText, 'text/xml');

            const entries = xmlDoc.querySelectorAll('item');
            const newPosts = [];

            entries.forEach((entry) => {
                const title = entry.querySelector('title').textContent;
                const link = entry.querySelector('link').textContent;
                newPosts.push({ title, link });
            });

            const bannerContent = createOrUpdateBanner();
            updateBanner(bannerContent, newPosts);
        },
    });
}


function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

addGlobalStyle('#erepublikBannerContainer {width: 748px;\
height:22px;\
float: right;\
display: block;\
margin: 0 0 5px 0;\
position: relative;\
overflow: hidden;\
white-space: nowrap;\
background-color: #f8f7f3;\
border-radius: 3px;\
border: 1px solid #edeae3;\
padding: 5px;}\
\
#erepublikBannerContent {display: inline-block;\
font-size:18px;\
animation: marquee 60s linear infinite;\
padding-top: 2px;\
padding-bottom: 2px;\
}\
#erepublikBannerContent > a {color: #333;font-family: arial,sans-serif;}\
#erepublikBannerContent > a:hover {color: #000;text-decoration: underline dotted;}\
@keyframes marquee {\
    0% {\
        transform: translateX(5%);\
    }\
    100% {\
        transform: translateX(-100%);\
    }\
}\
\
.scrolling-banner span {\
    display: inline-block;\
    margin-right: 20px; /* Adjust as needed */\
}');


// Initial fetch and display
fetchAndDisplayPosts();

// Refresh every minute
setInterval(fetchAndDisplayPosts, 60000);
