// ==UserScript==
// @name		CleanProfiles
// @author		Curlybear
// @description		Clean user profiles
// @version		0.02
// @updateURL		https://curlybear.eu/erep/CleanProfiles.user.js
// @downloadURL		https://curlybear.eu/erep/CleanProfiles.user.js
// @match		https://www.erepublik.com/*/citizen/profile/*
// @run-at		document-end
// @grant		none
// ==/UserScript==


(function () {
    'use strict';

    // Prettyfying stuff
    function addGlobalStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) {
            return;
        }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    addGlobalStyle(`
#career_tab_content_shield, #content > div.ng-scope > div > div.citizen_content.ng-scope > h3:nth-child(9),  #content > div.ng-scope > div > div.citizen_content.ng-scope > div.citizen_military{
    display: none;
}
#content > div.ng-scope > div > div.citizen_content.ng-scope > div:nth-child(13), #content > div.ng-scope > div > div.citizen_content.ng-scope > div:nth-child(15) {
    display: block;
}
`);

})(window);


