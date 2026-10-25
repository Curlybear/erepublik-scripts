// ==UserScript==
// @name         ErepCO
// @author		Curlybear
// @description		Add Combat orders on the homepage
// @version		0.3
// @updateURL		https://curlybear.eu/erep/erepco.user.js
// @downloadURL		https://curlybear.eu/erep/erepco.user.js
// @match		https://www.erepublik.com/*
// @exclude		https://www.erepublik.com/*/*
// @run-at		document-end
// @grant		none
// ==/UserScript==

// 0.1
// Initial release

// 0.2
// SOme "unique" bs, idk, it's fixed

// 0.3
// Homepage only, cache Combat Orders for 2 minutes, stop relying on the game's Array.prototype.unique


(function () {
    'use strict';
    jQuery(jQuery(".column")[0]).append(`<div id='co_box' class='media_widget'><h2><span>Combat Orders</span></h2><div class='news_mask'></div><div class='news_holder'><ul id='co_list'></ul></div></div>`)
    jQuery('#co_list').append("<li><div class='co_wrapper'><div class='co_info'><p class='co_div'></p><p class='co_country'></p></div>    <div class='co_data'><p class='co_reward'>Reward</p><p class='co_budget'>(Budget)</p><p class='co_threshold'>Threshold</p><p class='co_wall'>(Current)</p></div></div></li>")

    // Combat Orders are cached in sessionStorage so reloading the homepage doesn't refetch campaignsJson every time
    const CACHE_KEY = 'erepco_cos';
    const CACHE_TTL = 2 * 60 * 1000;

    let cached = null;
    try {
        cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
    } catch (e) { }

    if (cached && Date.now() - cached.time < CACHE_TTL) {
        renderCOs(cached.cos);
    } else {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', 'https://www.erepublik.com/en/military/campaignsJson/', true);
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                const cos = extractCOs(xobj.responseText);
                try {
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), cos }));
                } catch (e) { }
                renderCOs(cos);
            }
        };
        xobj.send();
    }

    // Returns one entry per Combat Order, for both sides of every division
    function extractCOs(response) {
        const battleData = JSON.parse(response);
        const cos = [];
        for (const [battle_id, battle] of Object.entries(battleData.battles)) {
            for (const [div_id, div] of Object.entries(battle.div)) {
                for (const side of ['inv', 'def']) {
                    const countryId = battle[side].id;
                    const wall = div.wall.for == countryId ? div.wall.dom : 100 - div.wall.dom;
                    for (const co of Object.values((div.co && div.co[side]) || {})) {
                        cos.push({
                            battle_id,
                            div_id,
                            div: div.div,
                            region_name: battle.region.name,
                            country_name: battleData.countries[countryId].name,
                            reward: co.reward,
                            budget: co.budget,
                            threshold: co.threshold,
                            wall
                        });
                    }
                }
            }
        }
        return cos;
    }

    function renderCOs(cos) {
        for (const co of cos) {
            jQuery('#co_list').append("<li><a href='https://www.erepublik.com/en/military/battlefield/" + co.battle_id + "/" + co.div_id + "'>" + co.region_name + "</a><div class='co_wrapper'><div class='co_info'><p class='co_div'>D" + co.div + "</p><p class='co_country'>" + co.country_name + "</p></div>    <div class='co_data'><p class='co_reward'>" + co.reward + "cc</p><p class='co_budget'>(" + co.budget + "cc)</p><p class='co_threshold'>" + co.threshold + "%</p><p class='co_wall'>(" + co.wall.toFixed(2) + "%)</p></div></div></li>")
        }
    }

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
#co_box {
    padding-bottom: 5px;
}
#co_box .news_holder > ul {
    min-height: auto;
}
.co_wrapper {
    display: flex;
    width: 100%;
}
.co_info, .co_data {
    display:flex;
}
.co_info {
    width:30%;
}
.co_data {
    width:70%;
}
.co_threshold {
    margin-left:auto; margin-right:0;
}
.co_div, .co_reward, .co_threshold, .co_budget {
    padding-right: 4px;
}
.co_country {
    overflow: hidden;
}
`);
})();
