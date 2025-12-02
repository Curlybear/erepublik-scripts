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

    function initCompanyManager() {
        if (!$j) {
            console.error("jQuery not found");
            return;
        }

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

        const uiContainer = $j('<div class="company-manager-ui" style="padding: 5px; background: #f0f0f0; margin-top: 5px; border-radius: 5px; display: flex; gap: 10px; align-items: center;"></div>');

        // Industry Dropdown
        const industrySelect = $j('<select id="cm-industry"><option value="all">All Industries</option><option value="food">Food</option><option value="food_raw">Food Raw</option><option value="weapon">Weapon</option><option value="weapon_raw">Weapon Raw</option><option value="house">House</option><option value="house_raw">House Raw</option><option value="aircraft">Aircraft</option><option value="aircraft_raw">Aircraft Raw</option></select>');

        // Quality Dropdown
        const qualitySelect = $j('<select id="cm-quality"><option value="all">All Qualities</option><option value="q1">Q1</option><option value="q2">Q2</option><option value="q3">Q3</option><option value="q4">Q4</option><option value="q5">Q5</option><option value="q6">Q6</option><option value="q7">Q7</option></select>');

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
