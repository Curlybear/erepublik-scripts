// ==UserScript==
// @name         Company Manager
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Streamline company management in eRepublik
// @author       Curlybear
// @match        https://www.erepublik.com/*/economy/myCompanies*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const $j = window.jQuery;

    function addStyles() {
        if (document.getElementById('cm-styles')) return;
        const style = document.createElement('style');
        style.id = 'cm-styles';
        style.textContent = `
            .company-manager-ui {
                padding: 10px;
                background: #f2f5f7;
                margin-top: 10px;
                border-radius: 3px;
                display: flex;
                gap: 10px;
                align-items: center;
                border: 1px solid #e0e0e0;
            }
            .cm-custom-select {
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                background-color: #fff;
                border: 1px solid #ccc;
                border-radius: 3px;
                padding: 0 30px 0 10px;
                font-family: "Arial", sans-serif;
                font-size: 12px;
                font-weight: bold;
                color: #555;
                cursor: pointer;
                height: 30px;
                line-height: 28px;
                background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%23666666%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E');
                background-repeat: no-repeat;
                background-position: right 10px center;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .cm-custom-select:hover {
                border-color: #999;
                color: #333;
            }
            .cm-custom-select:focus {
                border-color: #3c8dbc;
                box-shadow: 0 0 0 2px rgba(60, 141, 188, 0.2);
                outline: none;
            }
            .company-manager-ui .std_global_btn {
                height: 30px;
                line-height: 28px;
                padding: 0 15px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin: 0;
                vertical-align: middle;
                box-sizing: border-box;
                top: 0;
            }
        `;
        document.head.appendChild(style);
    }

    function initCompanyManager() {
        if (!$j) {
            console.error("jQuery not found");
            return;
        }

        addStyles();

        const userLocationText = $j('.user_location .name').text().trim();
        if (!userLocationText) {
            console.log("User location not found");
            return;
        }

        console.log("User Location:", userLocationText);

        $j('.companies_group').each(function () {
            const group = $j(this);
            const header = group.find('.companies_header');
            // Extract text from location, ignoring the travel icon which might be inside
            const holdingLocationText = header.find('.location').text().trim();

            if (holdingLocationText.includes(userLocationText)) {
                console.log("Match found for holding:", holdingLocationText);
                injectManagerUI(header, group);
            }
        });
    }

    function injectManagerUI(header, group) {
        // Prevent double injection
        if (header.find('.company-manager-ui').length > 0) return;

        const uiContainer = $j('<div class="company-manager-ui"></div>');

        // Industry Dropdown
        const industrySelect = $j('<select id="cm-industry" class="cm-custom-select"><option value="all">All Industries</option><option value="food">Food</option><option value="food_raw">Food Raw</option><option value="weapon">Weapon</option><option value="weapon_raw">Weapon Raw</option><option value="house">House</option><option value="house_raw">House Raw</option><option value="aircraft">Aircraft</option><option value="aircraft_raw">Aircraft Raw</option></select>');

        // Quality Dropdown
        const qualitySelect = $j('<select id="cm-quality" class="cm-custom-select"><option value="all">All Qualities</option><option value="q1">Q1</option><option value="q2">Q2</option><option value="q3">Q3</option><option value="q4">Q4</option><option value="q5">Q5</option><option value="q6">Q6</option><option value="q7">Q7</option></select>');

        // Buttons
        const selectBtn = $j('<button class="std_global_btn smallSize blueColor">Select</button>');
        const unselectBtn = $j('<button class="std_global_btn smallSize whiteColor">Unselect</button>');
        const resetBtn = $j('<button class="std_global_btn smallSize redColor" title="Reset All"><i class="fa fa-refresh"></i> ⟳</button>');

        // Event Listeners
        selectBtn.click(function (e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent header toggle
            applySelection(group, industrySelect.val(), qualitySelect.val(), true);
        });

        unselectBtn.click(function (e) {
            e.preventDefault();
            e.stopPropagation();
            applySelection(group, industrySelect.val(), qualitySelect.val(), false);
        });

        resetBtn.click(function (e) {
            e.preventDefault();
            e.stopPropagation();
            resetSelection(group);
        });

        // Stop propagation on clicks to dropdowns to prevent header collapsing
        industrySelect.click(function (e) { e.stopPropagation(); });
        qualitySelect.click(function (e) { e.stopPropagation(); });

        uiContainer.append(industrySelect, qualitySelect, selectBtn, unselectBtn, resetBtn);
        header.append(uiContainer);
    }

    const companyDefinitions = {
        // Food Raw
        'grain.png': { industry: 'food_raw', quality: 'q1' },
        'fruits.png': { industry: 'food_raw', quality: 'q2' },
        'fish.png': { industry: 'food_raw', quality: 'q3' },
        'cattle.png': { industry: 'food_raw', quality: 'q4' },
        'deer.png': { industry: 'food_raw', quality: 'q5' },

        // Weapon Raw
        'iron.png': { industry: 'weapon_raw', quality: 'q1' },
        'oil.png': { industry: 'weapon_raw', quality: 'q2' },
        'aluminum.png': { industry: 'weapon_raw', quality: 'q3' },
        'saltpeter.png': { industry: 'weapon_raw', quality: 'q4' },
        'rubber.png': { industry: 'weapon_raw', quality: 'q5' },

        // House Raw
        'sand.png': { industry: 'house_raw', quality: 'q1' },
        'clay.png': { industry: 'house_raw', quality: 'q2' },
        'wood.png': { industry: 'house_raw', quality: 'q3' },
        'limestone.png': { industry: 'house_raw', quality: 'q4' },
        'granite.png': { industry: 'house_raw', quality: 'q5' },

        // Aircraft Raw
        'magnesium.png': { industry: 'aircraft_raw', quality: 'q1' },
        'titanium.png': { industry: 'aircraft_raw', quality: 'q2' },
        'walfram.png': { industry: 'aircraft_raw', quality: 'q3' },
        'cobalt.png': { industry: 'aircraft_raw', quality: 'q4' },
        'neodymium.png': { industry: 'aircraft_raw', quality: 'q5' },

        // Food
        'food_q1.png': { industry: 'food', quality: 'q1' },
        'food_q2.png': { industry: 'food', quality: 'q2' },
        'food_q3.png': { industry: 'food', quality: 'q3' },
        'food_q4.png': { industry: 'food', quality: 'q4' },
        'food_q5.png': { industry: 'food', quality: 'q5' },
        'food_q6.png': { industry: 'food', quality: 'q6' },
        'food_q7.png': { industry: 'food', quality: 'q7' },

        // Weapon
        'weapons_q1.png': { industry: 'weapon', quality: 'q1' },
        'weapons_q2.png': { industry: 'weapon', quality: 'q2' },
        'weapons_q3.png': { industry: 'weapon', quality: 'q3' },
        'weapons_q4.png': { industry: 'weapon', quality: 'q4' },
        'weapons_q5.png': { industry: 'weapon', quality: 'q5' },
        'weapons_q6.png': { industry: 'weapon', quality: 'q6' },
        'weapons_q7.png': { industry: 'weapon', quality: 'q7' },

        // Aircraft
        'aircraft_weapons_q1.png': { industry: 'aircraft', quality: 'q1' },
        'aircraft_weapons_q2.png': { industry: 'aircraft', quality: 'q2' },
        'aircraft_weapons_q3.png': { industry: 'aircraft', quality: 'q3' },
        'aircraft_weapons_q4.png': { industry: 'aircraft', quality: 'q4' },
        'aircraft_weapons_q5.png': { industry: 'aircraft', quality: 'q5' },
        'aircraft_weapons_q6.png': { industry: 'aircraft', quality: 'q6' },
        'aircraft_weapons_q7.png': { industry: 'aircraft', quality: 'q7' },

        // House
        'house_q1.png': { industry: 'house', quality: 'q1' },
        'house_q2.png': { industry: 'house', quality: 'q2' },
        'house_q3.png': { industry: 'house', quality: 'q3' },
        'house_q4.png': { industry: 'house', quality: 'q4' },
        'house_q5.png': { industry: 'house', quality: 'q5' },
        'house_q6.png': { industry: 'house', quality: 'q6' },
        'house_q7.png': { industry: 'house', quality: 'q7' }
    };

    function applySelection(group, targetIndustry, targetQuality, isSelect) {
        group.find('.listing.companies').each(function () {
            const company = $j(this);
            const imgSrc = company.find('.area_pic img')[2].src || '';

            // Extract filename from src (e.g., "grain.png" from ".../grain.png")
            const filename = imgSrc.split('/').pop();
            const companyInfo = companyDefinitions[filename];

            if (!companyInfo) {
                // Fallback or ignore if unknown image
                console.log("Something ficked up")
                console.log(filename)
                return;
            }

            // Check Industry
            let matchesIndustry = false;
            if (targetIndustry === 'all') {
                matchesIndustry = true;
            } else if (companyInfo.industry === targetIndustry) {
                matchesIndustry = true;
            }

            // Check Quality
            let matchesQuality = false;
            if (targetQuality === 'all') {
                matchesQuality = true;
            } else if (companyInfo.quality === targetQuality) {
                matchesQuality = true;
            }

            if (matchesIndustry && matchesQuality) {
                const workBtn = company.find('.owner_work');
                const isActive = workBtn.hasClass('active');

                if (isSelect && !isActive) {
                    workBtn.click();
                } else if (!isSelect && isActive) {
                    workBtn.click();
                }
            }
        });
    }

    function resetSelection(group) {
        group.find('.listing.companies .owner_work.active').click();
    }

    // Run on load
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initCompanyManager();
    } else {
        window.addEventListener('DOMContentLoaded', initCompanyManager);
    }

})();
