// ==UserScript==
// @name         TP Tracking
// @author		Curlybear
// @description		Track TP profit
// @version		0.6
// @updateURL		https://curlybear.eu/erep/tptracking.user.js
// @downloadURL		https://curlybear.eu/erep/tptracking.user.js
// @include		https://www.erepublik.com/*
// @run-at		document-end
// @grant		none
// ==/UserScript==

// Changelog:
// 0.2 - Add Taxrate query + apply taxrate to income
// 0.3 - Init previous day to see TP increase from installation on first day
// 0.4 - Add total and table below sidebar profile info
// 0.5 - Fix two-digit tax rates, refresh tax rate daily
// 0.6 - Fetch the profile at most every 2 minutes instead of on every page

(function () {
    'use strict';

    function numberWithCommas(x) {
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    }

    // Tax rate is refreshed once per eRep day so a move or a tax change is picked up
    let taxrate = JSON.parse(localStorage.getItem("tp_taxrate"));
    const taxrateDay = JSON.parse(localStorage.getItem("tp_taxrate_day"));
    if (taxrate === null || taxrateDay !== erepublik.settings.eDay) {
        var xobj2 = new XMLHttpRequest();
        xobj2.overrideMimeType("application/json");
        xobj2.open('GET', 'https://www.erepublik.com/en/country/economy/' + erepublik.citizen.countryLocationPermalink);
        xobj2.onreadystatechange = function () {
            if (xobj2.readyState == 4) {
                if (xobj2.status == "200") {
                    updateTax(xobj2.responseText);
                }
                fetchProfile();
            }
        };
        xobj2.send();
    } else {
        fetchProfile();
    }

    // Fetched after the tax rate so income is never computed with a missing rate.
    // Skipped when fetched less than 2 minutes ago and today is already recorded; the table then uses stored data.
    const PROFILE_CACHE_TTL = 2 * 60 * 1000;
    function fetchProfile() {
        let lastFetch = 0;
        try {
            lastFetch = parseInt(sessionStorage.getItem("tp_last_fetch"), 10) || 0;
        } catch (e) { }
        const stored = JSON.parse(localStorage.getItem("tp_data"));
        if (Date.now() - lastFetch < PROFILE_CACHE_TTL && stored && stored[erepublik.settings.eDay] !== undefined) {
            doStuff(null);
            return;
        }

        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', 'https://www.erepublik.com/en/main/citizen-profile-json/' + erepublik.citizen.citizenId);
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                try {
                    sessionStorage.setItem("tp_last_fetch", Date.now());
                } catch (e) { }
                doStuff(JSON.parse(xobj.responseText).military.truePatriot.damage);
            }
        };
        xobj.send();
    }

    // damage: today's TP damage, or null to render from stored data only
    function doStuff(damage) {
        let currentDay = erepublik.settings.eDay;
        let data = JSON.parse(localStorage.getItem("tp_data"));

        if (damage !== null) {
            if (!data) {
                data = {};
                data[currentDay - 1] = damage;
            }

            data[currentDay] = damage;
            localStorage.setItem("tp_data", JSON.stringify(data));
        }

        if (location.pathname.includes(erepublik.citizen.citizenId)) {
            let ten_days = Object.keys(data).slice(-11);
            let previous_tp = -1;

            // Setup table
            jQuery(".citizen_content").prepend("<div id='tp_div'></div>");
            jQuery("#tp_div").append("<table id='tp_table'><thead><tr><th>eRep Day</th><th>TP Damage Done</th><th>CC Earned</th></tr></thead><tbody id='tp_table_body'></tbody></table>");

            let totalIncome = 0;
            let totalDamage = 0;
            ten_days.forEach(function (day) {
                if (previous_tp != -1) {
                    console.log(day);
                    let income = (Math.round(data[day] / 100000000) - Math.round(previous_tp / 100000000)) * (1000 - (1000 * (taxrate / 100)));
                    let damage = data[day] - previous_tp
                    totalIncome = totalIncome + income;
                    totalDamage = totalDamage + damage;
                    jQuery("#tp_table_body").append("<tr><td>" + day + "</td><td>" + numberWithCommas(damage) + "</td><td>" + numberWithCommas(income) + "</td></tr>");
                }
                previous_tp = data[day];
            })
            jQuery("#tp_table").append("<tfoot><tr><th>Total</th><th>" + numberWithCommas(totalDamage) + "</th><th>" + numberWithCommas(totalIncome) + "</th></tr></tfoot>");
        } else {
            let ten_days = Object.keys(data).slice(-11);
            let previous_tp = -1;

            // Setup table
            jQuery(".sidebar").append("<div id='tp_div' class='tp_sidebar'></div>");
            jQuery("#tp_div").append("<table id='tp_table'><thead><tr><th>eRep Day</th><th>CC Earned</th></tr></thead><tbody id='tp_table_body'></tbody></table>");

            let totalIncome = 0;
            ten_days.forEach(function (day) {
                if (previous_tp != -1) {
                    console.log(day);
                    let income = (Math.round(data[day] / 100000000) - Math.round(previous_tp / 100000000)) * (1000 - (1000 * (taxrate / 100)));
                    totalIncome = totalIncome + income;
                    jQuery("#tp_table_body").append("<tr><td>" + day + "</td><td>" + numberWithCommas(income) + "</td></tr>");
                }
                previous_tp = data[day];
            })
            jQuery("#tp_table").append("<tfoot><tr><th>Total</th><th>" + numberWithCommas(totalIncome) + "</th></tr></tfoot>");
        }
    }

    function updateTax(response) {
        // \d+ so two-digit rates (e.g. 15.00%) are read in full
        let re = /(\d+)\.00%/;
        let taxes = response.match(re);
        if (!taxes) return;
        taxrate = parseInt(taxes[1], 10);
        localStorage.setItem("tp_taxrate", taxrate);
        localStorage.setItem("tp_taxrate_day", erepublik.settings.eDay);
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
#tp_table {
  font-family: Arial, Helvetica, sans-serif;
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 5px;
}

#tp_table td, #tp_table th {
  border: 1px solid #ddd;
  padding: 5px;
}

#tp_table tr:nth-child(even){background-color: #f2f2f2;}

#tp_table tr:hover {background-color: #ddd;}

#tp_table th {
  padding-top: 5px;
  padding-bottom: 5px;
  padding-left: 5px;
  text-align: left;
  background-color: #474747;
  color: white;
  font-weight: bold;
}
.tp_sidebar {
  padding-left: 3px;
  padding-right: 8px;
}
#tp_div.tp_sidebar th, #tp_div.tp_sidebar td {
  padding-top: 3px;
  padding-bottom: 3px;
}
`);
})();