// ==UserScript==
// @name         ErepCO
// @author		Curlybear
// @description		Add Combat orders on the homepage
// @version		0.2
// @updateURL		https://curlybear.eu/erep/erepco.user.js
// @downloadURL		https://curlybear.eu/erep/erepco.user.js
// @include		https://www.erepublik.com/*
// @run-at		document-end
// @grant		none
// ==/UserScript==

// 0.1
// Initial release

// 0.2
// SOme "unique" bs, idk, it's fixed


(function () {
    'use strict';
    jQuery(jQuery(".column")[0]).append(`<div id='co_box' class='media_widget'><h2><span>Combat Orders</span></h2><div class='news_mask'></div><div class='news_holder'><ul id='co_list'></ul></div></div>`)
    jQuery('#co_list').append("<li><div class='co_wrapper'><div class='co_info'><p class='co_div'></p><p class='co_country'></p></div>    <div class='co_data'><p class='co_reward'>Reward</p><p class='co_budget'>(Budget)</p><p class='co_threshold'>Threshold</p><p class='co_wall'>(Current)</p></div></div></li>")

    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'https://www.erepublik.com/en/military/campaignsJson/', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            doStuff(xobj.responseText);
        }
    };
    xobj.send();

    function doStuff(response) {
        const battleData = JSON.parse(response);
        for (let battle_id in battleData.battles) {
            for (let div_id in battleData.battles[battle_id].div) {
                if (battleData.battles[battle_id].div[div_id].co.inv.length > 0) {
                    for (let co_id in battleData.battles[battle_id].div[div_id].co.inv) {
                        if (co_id != 'unique') {
                            const co = battleData.battles[battle_id].div[div_id].co.inv[co_id]
                            const wall = battleData.battles[battle_id].div[div_id].wall.for == battleData.battles[battle_id].inv.id ? battleData.battles[battle_id].div[div_id].wall.dom : 100 - battleData.battles[battle_id].div[div_id].wall.dom
                            const country_name = battleData.countries[battleData.battles[battle_id].inv.id].name
                            const region_name = battleData.battles[battle_id].region.name
                            jQuery('#co_list').append("<li><a href='https://www.erepublik.com/en/military/battlefield/" + battle_id + "/" + div_id + "'>" + region_name + "</a><div class='co_wrapper'><div class='co_info'><p class='co_div'>D" + battleData.battles[battle_id].div[div_id].div + "</p><p class='co_country'>" + country_name + "</p></div>    <div class='co_data'><p class='co_reward'>" + co.reward + "cc</p><p class='co_budget'>(" + co.budget + "cc)</p><p class='co_threshold'>" + co.threshold + "%</p><p class='co_wall'>(" + wall.toFixed(2) + "%)</p></div></div></li>")
                        }
                    }
                }
                if (battleData.battles[battle_id].div[div_id].co.def.length > 0) {
                    for (let co_id in battleData.battles[battle_id].div[div_id].co.def) {
                        if (co_id != 'unique') {
                            const co = battleData.battles[battle_id].div[div_id].co.def[co_id]
                            const wall = battleData.battles[battle_id].div[div_id].wall.for == battleData.battles[battle_id].def.id ? battleData.battles[battle_id].div[div_id].wall.dom : 100 - battleData.battles[battle_id].div[div_id].wall.dom
                            const country_name = battleData.countries[battleData.battles[battle_id].def.id].name
                            const region_name = battleData.battles[battle_id].region.name
                            jQuery('#co_list').append("<li><a href='https://www.erepublik.com/en/military/battlefield/" + battle_id + "/" + div_id + "'>" + region_name + "</a><div class='co_wrapper'><div class='co_info'><p class='co_div'>D" + battleData.battles[battle_id].div[div_id].div + "</p><p class='co_country'>" + country_name + "</p></div>    <div class='co_data'><p class='co_reward'>" + co.reward + "cc</p><p class='co_budget'>(" + co.budget + "cc)</p><p class='co_threshold'>" + co.threshold + "%</p><p class='co_wall'>(" + wall.toFixed(2) + "%)</p></div></div></li>")
                        }
                    }
                }
            }
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
