// ==UserScript==
// @name         eRepublik Laws
// @author       Curlybear
// @updateURL    https://curlybear.eu/erep/ereplaws.user.js
// @downloadURL  https://curlybear.eu/erep/ereplaws.user.js
// @version      0.2
// @description  Displays the titles of the latest 5 laws
// @match        https://www.erepublik.com/*
// @exclude      https://www.erepublik.com/*/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Your API key for authentication
    const apiKey = '169cbb294125e6e7a9cb93fe97a52dd04b6e03cd';

    jQuery(jQuery(".column")[0]).prepend(`<div id='law_box' class='media_widget'><h2><span>Latest laws</span></h2><div class='news_mask'></div><div class='news_holder'><ul id='law_list'></ul></div></div>`)

    // Function to fetch data from the API
    function fetchData() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://curlybear.eu/erepapi/latest_laws?num_laws=5&exclude_donate=true',
            headers: {
                'API-Key': apiKey,
            },
            onload: function(response) {
                if (response.status === 200) {
                    const lawsData = JSON.parse(response.responseText);
                    displayLaws(lawsData);
                } else {
                    console.error('Failed to fetch data:', response.statusText);
                }
            },
            onerror: function(error) {
                console.error('Error fetching data:', error);
            },
        });
    }

    // Function to display the titles of the latest 10 laws on the page
    function displayLaws(lawsData) {
        lawsData.laws.slice(0, 10).forEach((law) => {
            const listItem = jQuery('<li></li>');
            const lawWrapper = jQuery('<div class="law_wrapper"></div>');
            const countryWrapper = jQuery('<div class="country_wrapper"></div>');

            // Make country name and law type bold
            const countryFlag = jQuery('<img ng-src="//www.erepublik.net/images/flags_png/S/'+law.country+'.png" src="//www.erepublik.net/images/flags_png/S/'+law.country+'.png">')
            const countryElement = jQuery('<strong></strong>').text(law.country);

            countryWrapper.append(countryFlag);
            countryWrapper.append(countryElement);
            listItem.append(countryWrapper);

            const lawInfo = jQuery('<div class="law_info"></div>');

            const lawTypeElement = jQuery('<p class="law_div"></p>').html(`<a href="https://www.erepublik.com/en/main/law/Belgium/${law.law_id}"><strong>${law.law_type}</strong></a>`);
            lawInfo.append(lawTypeElement);

            lawWrapper.append(lawInfo);

            const lawData = jQuery('<div class="law_data"></div>');
            const lawRewardElement = jQuery('<p class="law_reward"></p>').text(law.law_description);
            lawData.append(lawRewardElement);

            lawWrapper.append(lawData);
            listItem.append(lawWrapper);
            jQuery('#law_list').append(listItem);
        });
    }

    // Fetch data and display laws on page load
    fetchData();

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
#law_box {
    padding-bottom: 5px;
}
#law_box .news_holder > ul {
    min-height: auto;
}
.law_wrapper {
    display: flex;
    width: 100%;
}
.law_info, .law_data, .country_wrapper {
    display:flex;
    align-items: center;
}
.law_info {
    width:30%;
}
.law_data {
    width:70%;
}
.law_threshold {
    margin-left:auto; margin-right:0;
}
.law_div, .law_reward, .law_threshold, .law_budget {
    padding-right: 4px;
}
.law_country {
    overflow: hidden;
}
.country_wrapper > img {
    padding-right: 4px;
}
`);
})();
