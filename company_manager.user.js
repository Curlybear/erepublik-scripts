// ==UserScript==
// @name         Company Manager
// @version      0.7
// @description  Streamline company management in eRepublik
// @updateURL    https://curlybear.eu/erep/company_manager.user.js
// @downloadURL  https://curlybear.eu/erep/company_manager.user.js
// @author       Curlybear
// @match        https://www.erepublik.com/*/economy/myCompanies*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    const $j = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).jQuery;
    let cachedCompanies = [];
    let updateStatsTimeout;

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
            .cm-checkbox-container {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                color: #555;
                font-weight: bold;
                cursor: pointer;
                user-select: none;
            }
            .cm-checkbox-container input {
                margin: 0;
                cursor: pointer;
            }
            /* Toast Notifications */
            #toast-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .toast {
                padding: 12px 20px;
                border-radius: 4px;
                color: white;
                font-size: 14px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s, transform 0.3s;
                min-width: 200px;
                max-width: 400px;
                font-family: Arial, sans-serif;
            }
            .toast.visible {
                opacity: 1;
                transform: translateY(0);
            }
            .toast.success { background-color: #4caf50; }
            .toast.error { background-color: #f44336; }
            .toast.info { background-color: #2196f3; }
            .toast.warning { background-color: #ff9800; }

            /* Employee Manager Specific Styles */
            #cm-employee-manager {
                background: #e1f5fe; /* Light blue background to distinguish */
                justify-content: flex-start;
                flex-wrap: wrap;
            }
            #cm-employee-manager .cm-custom-select {
                min-width: 100px;
            }
            #cm-employee-manager label {
                font-weight: bold;
                color: #4d93bc;
                font-size: 11px;
                margin-right: 5px;
            }
            #cm-amount-input {
                width: 60px;
                height: 30px;
                border: 1px solid #ccc;
                border-radius: 3px;
                padding: 0 5px;
                text-align: center;
                font-weight: bold;
                color: #555;
            }
            #cm-amount-input:focus {
                border-color: #3c8dbc;
                outline: none;
            }

            .cm-panel-wrapper {
                position: absolute;
                top: 0;
                left: 100%; /* Position to the right of the listing holder */
                bottom: 0;
                display: flex;
                align-items: flex-start;
                z-index: 999;
                pointer-events: none;
            }

            .cm-panel-toggle {
                position: absolute;
                right: 100%; /* Anchor to left side of panel (inside listing holder) */
                top: 10px;
                width: 30px;
                height: 30px;
                background: #4d93bc;
                color: white;
                border: none;
                border-radius: 3px 0 0 3px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                box-shadow: -2px 0 2px rgba(0,0,0,0.1);
                pointer-events: auto;
            }
            .cm-panel-toggle:hover {
                background: #56afe4;
            }

            .cm-panel-container {
                width: 0;
                background: #fff;
                border: 1px solid #e0e0e0; /* Border all around */
                box-shadow: 2px 0 5px rgba(0,0,0,0.1); /* Shadow to right */
                transition: width 0.3s ease;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                pointer-events: auto;
                height: 100%;
                box-sizing: border-box;
            }

            .cm-panel-container * {
                box-sizing: border-box;
            }

            .cm-panel-wrapper.expanded .cm-panel-container {
                width: 300px;
            }

            /* Adjust listing_holder to be relative for absolute positioning of panel */
            .listing_holder {
                position: relative;
            }

            .cm-panel-content {
                padding: 15px;
                overflow-y: auto;
                width: 300px; /* Fixed width for content to prevent reflow during anim */
            }

            .cm-holding-stats {
                margin-bottom: 20px;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }
            .cm-holding-stats:last-child {
                border-bottom: none;
            }
            .cm-holding-title {
                font-weight: bold;
                color: #4d93bc;
                margin-bottom: 10px;
                font-size: 14px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
            }
            .cm-holding-title:hover {
                color: #56afe4;
            }
            .cm-holding-title::after {
                content: '▼';
                font-size: 10px;
                transition: transform 0.2s;
            }
            .cm-holding-title.collapsed::after {
                transform: rotate(-90deg);
            }

            .cm-holding-details {
                display: block;
            }
            .cm-holding-details.collapsed {
                display: none;
            }

            .cm-stat-row {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                margin-bottom: 5px;
                color: #555;
            }
            .cm-stat-label {
                font-weight: bold;
            }
            .cm-productivity-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 5px;
                font-size: 11px;
            }
            .cm-productivity-table th, .cm-productivity-table td {
                border: 1px solid #eee;
                padding: 3px;
                text-align: center;
            }
            .cm-productivity-table th {
                background: #f9f9f9;
                color: #666;
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

        initPanel();
        buildCompanyCache();
        injectEmployeeManagerUI();
    }

    function buildCompanyCache() {
        cachedCompanies = [];
        const groups = $j('.companies_group').not(':last'); // Exclude unassigned

        groups.each(function () {
            const group = $j(this);
            group.find('.listing.companies').each(function () {
                const company = $j(this);

                // Identify company
                let companyInfo = null;
                company.find('.area_pic img').each(function () {
                    const fname = this.src.split('/').pop();
                    if (companyDefinitions[fname]) {
                        companyInfo = companyDefinitions[fname];
                        return false;
                    }
                });

                if (companyInfo) {
                    // Get Resource Bonus (Static per page load)
                    let mult = 1.0;
                    const bonusEl = company.find('b.resource_bonus');
                    const bonusText = bonusEl.text().trim();
                    if (bonusText && bonusText.includes('%')) {
                        mult = parseFloat(bonusText.replace('%', '')) / 100;
                    }

                    cachedCompanies.push({
                        element: company,
                        info: companyInfo,
                        multiplier: mult
                    });
                }
            });
        });
        console.log(`Company Manager: Cached ${cachedCompanies.length} companies.`);
    }

    function injectEmployeeManagerUI() {
        const listingHolder = $j('.listing_holder');
        const heading = listingHolder.find('.heading');

        if (heading.length === 0 || $j('#cm-employee-manager').length > 0) return;

        // Build Holding Options
        let holdingOptions = '<option value="all">All Holdings</option>';
        $j('.companies_group').not(':last').each(function (index) {
            const group = $j(this);
            const fullLocation = group.find('.companies_header .location').text().trim();
            const parts = fullLocation.split(',');
            const region = parts.length >= 2 ? parts[1].trim() : fullLocation;

            // Check if we can get a better ID, but index based matches `scrapeHoldings` logic mostly
            // However, `scrapeHoldings` generates IDs like `holding-0`.
            // We need to match the filter logic.
            // Let's use the group ID from the DOM if possible, or fall back to index matching.
            // The groups have IDs like `holding_135626`.
            const groupId = group.attr('id');
            holdingOptions += `<option value="${groupId}">${region}</option>`;
        });

        const ui = $j(`<div id="cm-employee-manager" class="company-manager-ui">
            <div style="display:flex; align-items:center; margin-right: 15px;">
                <label>EMPLOYEES:</label>
            </div>

            <div style="display:flex; align-items:center; gap: 5px;">
                <select id="cm-emp-holding" class="cm-custom-select">${holdingOptions}</select>

                <select id="cm-emp-industry" class="cm-custom-select">
                    <option value="all">All Industries</option>
                    <option value="food">Food</option>
                    <option value="food_raw">Food Raw</option>
                    <option value="weapon">Weapon</option>
                    <option value="weapon_raw">Weapon Raw</option>
                    <option value="house">House</option>
                    <option value="house_raw">House Raw</option>
                    <option value="aircraft">Aircraft</option>
                    <option value="aircraft_raw">Aircraft Raw</option>
                </select>

                <select id="cm-emp-quality" class="cm-custom-select">
                    <option value="all">All Qualities</option>
                    <option value="q1">Q1</option>
                    <option value="q2">Q2</option>
                    <option value="q3">Q3</option>
                    <option value="q4">Q4</option>
                    <option value="q5">Q5</option>
                    <option value="q6">Q6</option>
                    <option value="q7">Q7</option>
                </select>

                <input type="number" id="cm-amount-input" min="0" max="100" value="1" title="Number of employees to assign (0 to unassign)">

                <button id="cm-assign-btn" class="std_global_btn smallSize blueColor" title="Assign Employees">Assign</button>

                <span id="cm-productivity-display" style="margin-left: 10px; font-weight: bold; color: #555; font-size: 11px;"></span>
            </div>
            <div id="cm-production-recap" style="width: 100%; margin-top: 8px; font-size: 11px; color: #666; font-style: italic; border-top: 1px dashed #ddd; padding-top: 5px; display:none;">
                Production: ...
            </div>
        </div>`);

        heading.after(ui);

        // Event Listeners
        ui.find('#cm-assign-btn').click(function (e) {
            e.preventDefault();
            const holdingId = $j('#cm-emp-holding').val();
            const industry = $j('#cm-emp-industry').val();
            const quality = $j('#cm-emp-quality').val();
            const amount = parseInt($j('#cm-amount-input').val()) || 0;

            assignEmployees(holdingId, industry, quality, amount);
        });

        const inputs = ui.find('select');
        inputs.click(function (e) { e.stopPropagation(); }); // Prevent freeze from bubbling
        inputs.change(function () {
            clearTimeout(updateStatsTimeout);
            updateStatsTimeout = setTimeout(updateStats, 50);
        });

        // Listen for manual (or scripted) changes to assignments
        $j('.listing_holder').on('click', '.employees_selector a', function () {
            // Small delay to allow class update to propagate
            clearTimeout(updateStatsTimeout);
            updateStatsTimeout = setTimeout(updateStats, 50);
        });

        // Also update immediately
        updateStats();

        function updateStats() {
            const holdingId = $j('#cm-emp-holding').val();
            const industry = $j('#cm-emp-industry').val();
            const quality = $j('#cm-emp-quality').val();

            // Productivity Display
            const prodSpan = $j('#cm-productivity-display');
            prodSpan.text('');

            let productivity = 0;
            if (holdingId !== 'all' && industry !== 'all' && quality !== 'all') {
                let prodKey = '';
                if (industry.endsWith('_raw')) {
                    const prefix = industry.charAt(0);
                    prodKey = `${prefix}rm_productivity`;
                } else {
                    const qNum = quality.replace('q', '');
                    prodKey = `${industry}_${qNum}_productivity`;
                }

                const el = $j(`#${holdingId} .cm-prod-val[data-prod-key="${prodKey}"]`);
                const text = el.first().text();
                if (text && text.includes('%')) {
                    productivity = parseInt(text.replace('%', '')) / 100;
                    prodSpan.text(`Productivity: ${text}`);

                    if (productivity >= 1) prodSpan.css('color', 'green');
                    else prodSpan.css('color', 'orange');
                }
            }

            // Production Recap (Current Active Assignments)
            const recapDiv = $j('#cm-production-recap');
            let units = {};

            // Use Cached Companies
            // Filter logic matches the user requirement: "Calculate for all assigned employees"
            // But we can respect the filter if we wanted to only show stats for what's filtered?
            // The previous code had the filter check commented out with "Filter check REMOVED".
            // So we iterate ALL cached companies.

            for (const item of cachedCompanies) {
                const { element, info, multiplier } = item;

                // Check for current assignment (Dynamic)
                // We must check the DOM for the 'active' class
                const activeBtn = element.find('.employees_selector a.active, .employees_selector a.employee_works_active').last();

                if (activeBtn.length > 0) {
                    const assigned = parseInt(activeBtn.attr('employee')) || 0;
                    if (assigned > 0) {
                        const produced = assigned * (info.baseProduction || 0) * multiplier;

                        const unitKey = `${info.industry.replace('_raw', ' Raw')} ${info.quality.toUpperCase()}`;
                        if (!units[unitKey]) units[unitKey] = 0;
                        units[unitKey] += produced;
                    }
                }
            }

            if (Object.keys(units).length > 0) {
                const parts = [];
                for (const [u, val] of Object.entries(units)) {
                    parts.push(`${val.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${u}`);
                }
                recapDiv.text(`Production: ${parts.join(', ')}`);
                recapDiv.show();
            } else {
                recapDiv.hide();
            }
        }
    }

    function assignEmployees(holdingId, industry, quality, amount) {
        let count = 0;
        let companies = $j('.companies_group').not(':last'); // Exclude unassigned
        let remainingToAssign = amount;

        if (holdingId !== 'all') {
            companies = $j(`#${holdingId}`);
        }

        // If amount is 0, we treat it as "Unassign All" for the filtered group
        // If amount > 0, we distribute greedily
        const isUnassign = (amount === 0);

        companies.each(function () {
            // Stop if we ran out of employees to assign (and not unassigning)
            if (!isUnassign && remainingToAssign <= 0) return false; // break loop

            const group = $j(this);
            group.find('.listing.companies').each(function () {
                if (!isUnassign && remainingToAssign <= 0) return false; // break loop

                const company = $j(this);

                // --- Filter Logic ---
                let companyInfo = null;
                company.find('.area_pic img').each(function () {
                    const src = this.src;
                    const fname = src.split('/').pop();
                    if (companyDefinitions[fname]) {
                        companyInfo = companyDefinitions[fname];
                        return false;
                    }
                });

                if (!companyInfo) return;

                if (industry !== 'all' && companyInfo.industry !== industry) return;
                if (quality !== 'all' && companyInfo.quality !== quality) return;

                // --- Assignment Logic ---
                if (isUnassign) {
                    // Unassign: Find active employee button and click it to toggle off
                    const activeBtns = company.find('.employees_selector a.active, .employees_selector a.employee_works_active');
                    if (activeBtns.length > 0) {
                        activeBtns.last().click();
                        count++;
                    }
                } else {
                    // Distribute greedy
                    const limit = parseInt(company.find('.employees_selector').attr('data-employee_limit')) || 0;

                    // How many can we put here?
                    // We want to fill this company as much as possible with remaining employees
                    const toAssign = Math.min(remainingToAssign, limit);

                    if (toAssign > 0) {
                        // Find button for specific amount
                        const btn = company.find(`.employees_selector a[employee="${toAssign}"]`);

                        if (btn.length > 0) {
                            // Check if THIS specific button is active
                            const isActive = btn.hasClass('active') || btn.hasClass('employee_works_active');

                            if (!isActive) {
                                btn.click();
                                count++;
                            }

                            // Deduct from pool
                            remainingToAssign -= toAssign;
                        } else {
                            // Fallback: if we can't find the button (e.g. limit mismatch),
                            // we check if we can assign at least something?
                            // User requirement implies "fill up", but we only have precise buttons.
                            // If toAssign is 7, and limit is 10, we click 7.
                            // If toAssign is 10, and limit is 10, we click 10.
                            // The logic holds.
                        }
                    }
                }
            });
        });

        if (count > 0) {
            if (isUnassign) {
                showToast(`Unassigned employees from ${count} companies.`, 'success');
            } else {
                const assigned = amount - remainingToAssign; // Calculate actual assigned
                showToast(`Assigned ${assigned} employees across ${count} companies.`, 'success');
            }
        } else {
            if (!isUnassign && remainingToAssign < amount) {
                showToast('Assignments partially completed.', 'info');
            } else {
                showToast('No eligible companies found or changes needed.', 'info');
            }
        }
    }

    function initPanel() {
        const listingHolder = $j('.listing_holder');
        if (listingHolder.length === 0) return;

        // Create Panel Wrapper
        const wrapper = $j(`
            <div class="cm-panel-wrapper" id="cm-panel-wrapper">
                <button class="cm-panel-toggle" id="cm-panel-toggle" title="Toggle Info Panel">
                    <i class="fa fa-chevron-left"></i>
                </button>
                <div class="cm-panel-container" id="cm-info-panel">
                    <div class="cm-panel-content" id="cm-panel-content">
                        <div style="text-align:center; color:#999;">Loading data...</div>
                    </div>
                </div>
            </div>
        `);

        listingHolder.append(wrapper);

        // Toggle Logic
        const toggleBtn = wrapper.find('#cm-panel-toggle');
        toggleBtn.click(function () {
            wrapper.toggleClass('expanded');
            const icon = wrapper.hasClass('expanded') ? 'fa-chevron-right' : 'fa-chevron-left';
            toggleBtn.find('i').attr('class', `fa ${icon}`);
        });

        // Scrape and Fetch Data
        const holdings = scrapeHoldings();
        renderPanel(holdings); // Render initial structure

        // Fetch productivity for each holding
        holdings.forEach(holding => {
            fetchProductivity(holding.region).then(data => {
                if (data) {
                    updateHoldingProductivity(holding.id, data);
                }
            });
        });

        updateHeaders(holdings);
    }

    function updateHeaders(holdings) {
        const groups = $j('.companies_group').not(':last');
        groups.each(function (index) {
            if (index >= holdings.length) return;

            const group = $j(this);
            const holding = holdings[index];
            const headerNumber = group.find('.companies_header .number');

            // Avoid duplicate injection
            if (group.find('.cm-header-stats').length > 0) return;

            const statsSpan = $j(`<span class="cm-header-stats" style="margin-left: 10px; font-size: 12px; font-weight: bold; color: #4d93bc;" title="Workable Companies / Total Manager Companies">
                (${holding.totalWorkable} / ${holding.totalManager})
            </span>`);

            headerNumber.after(statsSpan);
        });
    }

    function scrapeHoldings() {
        const holdings = [];
        // Exclude the last companies_group as it is the "Unassigned companies" placeholder
        const groups = $j('.companies_group').not(':last');

        groups.each(function (index) {
            const group = $j(this);

            // Extract region name: "City, Region, Country" -> "Region"
            const fullLocation = group.find('.companies_header .location').text().trim();
            const parts = fullLocation.split(',');
            const region = parts.length >= 2 ? parts[1].trim() : fullLocation;

            const id = `holding-${index}`;

            const companies = {};
            let totalWorkable = 0;
            let totalManager = 0;

            group.find('.listing.companies').each(function () {
                const company = $j(this);
                const isWorkable = !company.hasClass('disabled');

                company.find('.area_pic img').each(function () {
                    const src = this.src;
                    const fname = src.split('/').pop();
                    if (companyDefinitions[fname]) {
                        const def = companyDefinitions[fname];
                        const key = `${def.industry}_${def.quality}`;
                        if (!companies[key]) {
                            companies[key] = { ...def, count: 0, workableCount: 0, totalEmployeeSlots: 0 };
                        }
                        companies[key].count++;

                        const employeeLimit = parseInt(company.find('.employees_selector').attr('data-employee_limit')) || 0;
                        companies[key].totalEmployeeSlots += employeeLimit;

                        const isManagerWorkable = !['house', 'house_raw', 'aircraft', 'aircraft_raw'].includes(def.industry);

                        if (isWorkable && isManagerWorkable) {
                            companies[key].workableCount++;
                            totalWorkable++;
                        }

                        if (isManagerWorkable) {
                            totalManager++;
                        }
                        return false;
                    }
                });
            });

            holdings.push({
                id: id,
                region: region,
                companies: companies,
                totalWorkable: totalWorkable,
                totalManager: totalManager
            });
        });
        return holdings;
    }

    function fetchProductivity(regionName) {
        return new Promise((resolve) => {
            // Slugify: "Southern Cyprus" -> "Southern-Cyprus", "Pohja-Eesti" -> "Pohja-Eesti"
            // 1. Lowercase everything
            // 2. Replace spaces with dashes
            // 3. Capitalize first letter and any letter after a dash
            const slug = regionName.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/(^|-)([a-z])/g, (match) => match.toUpperCase());

            console.log(`Fetching productivity for: ${regionName} -> ${slug}`);

            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://productivityapi.curlybear.eu/productivity/?permalink=${slug}`,
                headers: {
                    'Accept': 'application/json'
                },
                onload: function (response) {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            resolve(data[0]); // API returns an array
                        } catch (e) {
                            console.error("Error parsing API response", e);
                            resolve(null);
                        }
                    } else {
                        console.warn(`API Error ${response.status} for ${slug}`);
                        resolve(null);
                    }
                },
                onerror: function (err) {
                    console.error("API Request Failed", err);
                    resolve(null);
                }
            });
        });
    }

    function renderPanel(holdings) {
        const content = $j('#cm-panel-content');
        content.empty();

        if (holdings.length === 0) {
            content.html('<div style="text-align:center; color:#999;">No holdings found.</div>');
            return;
        }

        holdings.forEach(holding => {
            const holdingDiv = $j(`<div class="cm-holding-stats" id="${holding.id}"></div>`);

            // Title with Toggle
            const title = $j(`<div class="cm-holding-title">${holding.region}</div>`);
            holdingDiv.append(title);

            // Details Container
            const detailsDiv = $j(`<div class="cm-holding-details"></div>`);

            // Group by Industry
            const byIndustry = {};
            Object.values(holding.companies).forEach(c => {
                if (!byIndustry[c.industry]) byIndustry[c.industry] = [];
                byIndustry[c.industry].push(c);
            });

            // Render per Industry
            Object.entries(byIndustry).forEach(([ind, companies]) => {
                // Format industry name
                const indName = ind.replace('_raw', ' Raw').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                const indDiv = $j(`<div class="cm-industry-group" style="margin-bottom:10px;"></div>`);
                indDiv.append(`<div style="font-weight:bold; font-size:12px; color:#555; border-bottom:1px solid #eee; margin-bottom:5px;">${indName}</div>`);

                companies.sort((a, b) => {
                    // Sort by quality: q1 < q2 ... < q7
                    const qA = parseInt(a.quality.replace('q', '')) || 0;
                    const qB = parseInt(b.quality.replace('q', '')) || 0;
                    return qA - qB;
                });

                companies.forEach(c => {
                    // Determine productivity key
                    let prodKey = '';
                    if (c.industry.endsWith('_raw')) {
                        // food_raw -> frm_productivity
                        const prefix = c.industry.charAt(0);
                        prodKey = `${prefix}rm_productivity`;
                    } else {
                        // food, q1 -> food_1_productivity
                        const qNum = c.quality.replace('q', '');
                        prodKey = `${c.industry}_${qNum}_productivity`;
                    }

                    const row = $j(`
                        <div class="cm-stat-row">
                            <span style="flex:1;">${c.quality.toUpperCase()}</span>
                            <span style="flex:2; text-align:center;">
                                <div>x${c.count} (${c.workableCount})</div>
                                <div style="font-size:10px; color:#999;">Max employees: ${c.totalEmployeeSlots}</div>
                            </span>
                            <span style="flex:1; text-align:right;" class="cm-prod-val" data-prod-key="${prodKey}">...</span>
                        </div>
                     `);
                    indDiv.append(row);
                });

                detailsDiv.append(indDiv);
            });

            // Total Workable Summary
            let totalWorkable = 0;
            Object.values(holding.companies).forEach(c => totalWorkable += c.workableCount);
            detailsDiv.append(`<div style="font-size:11px; color:#777; margin-top:5px; text-align:right;">Total Workable: ${totalWorkable}</div>`);

            holdingDiv.append(detailsDiv);

            // Toggle Event
            title.click(function () {
                title.toggleClass('collapsed');
                detailsDiv.toggleClass('collapsed');
            });

            content.append(holdingDiv);
        });
    }

    function updateHoldingProductivity(holdingId, data) {
        const container = $j(`#${holdingId}`);
        if (!data) {
            container.find('.cm-prod-val').text('N/A');
            return;
        }

        container.find('.cm-prod-val').each(function () {
            const el = $j(this);
            const key = el.attr('data-prod-key');
            if (key && data[key] !== undefined) {
                const val = (data[key] * 100).toFixed(0);
                el.text(`${val}%`);
                // Color coding
                if (val >= 100) el.css('color', 'green');
                else el.css('color', 'orange');
            } else {
                el.text('-');
            }
        });
    }

    function showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Trigger reflow
        toast.offsetHeight;

        toast.classList.add('visible');

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                toast.remove();
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, 3000);
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

        // Checkbox
        const limitCheckbox = $j('<label class="cm-checkbox-container"><input type="checkbox" id="cm-limit-energy"> Limit by Energy</label>');

        // Event Listeners
        selectBtn.click(function (e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent header toggle
            const limitByEnergy = limitCheckbox.find('input').is(':checked');
            applySelection(group, industrySelect.val(), qualitySelect.val(), true, limitByEnergy);
        });

        unselectBtn.click(function (e) {
            e.preventDefault();
            e.stopPropagation();
            applySelection(group, industrySelect.val(), qualitySelect.val(), false, false);
        });

        resetBtn.click(function (e) {
            e.preventDefault();
            e.stopPropagation();
            resetSelection(group);
        });

        // Stop propagation on clicks to dropdowns/checkbox to prevent header collapsing
        industrySelect.click(function (e) { e.stopPropagation(); });
        qualitySelect.click(function (e) { e.stopPropagation(); });
        limitCheckbox.click(function (e) { e.stopPropagation(); });

        uiContainer.append(industrySelect, qualitySelect, selectBtn, unselectBtn, resetBtn, limitCheckbox);
        header.append(uiContainer);
    }

    const companyDefinitions = {
        // Food Raw
        'grain.png': { industry: 'food_raw', quality: 'q1', baseProduction: 0.35 },
        'fruits.png': { industry: 'food_raw', quality: 'q2', baseProduction: 0.70 },
        'fish.png': { industry: 'food_raw', quality: 'q3', baseProduction: 1.25 },
        'cattle.png': { industry: 'food_raw', quality: 'q4', baseProduction: 1.75 },
        'deer.png': { industry: 'food_raw', quality: 'q5', baseProduction: 2.50 },

        // Weapon Raw
        'iron.png': { industry: 'weapon_raw', quality: 'q1', baseProduction: 0.35 },
        'oil.png': { industry: 'weapon_raw', quality: 'q2', baseProduction: 0.70 },
        'aluminum.png': { industry: 'weapon_raw', quality: 'q3', baseProduction: 1.25 },
        'saltpeter.png': { industry: 'weapon_raw', quality: 'q4', baseProduction: 1.75 },
        'rubber.png': { industry: 'weapon_raw', quality: 'q5', baseProduction: 2.50 },

        // House Raw
        'sand.png': { industry: 'house_raw', quality: 'q1', baseProduction: 0.35 },
        'clay.png': { industry: 'house_raw', quality: 'q2', baseProduction: 0.70 },
        'wood.png': { industry: 'house_raw', quality: 'q3', baseProduction: 1.25 },
        'limestone.png': { industry: 'house_raw', quality: 'q4', baseProduction: 1.75 },
        'granite.png': { industry: 'house_raw', quality: 'q5', baseProduction: 2.50 },

        // Aircraft Raw
        'magnesium.png': { industry: 'aircraft_raw', quality: 'q1', baseProduction: 0.35 },
        'titanium.png': { industry: 'aircraft_raw', quality: 'q2', baseProduction: 0.70 },
        'walfram.png': { industry: 'aircraft_raw', quality: 'q3', baseProduction: 1.25 },
        'cobalt.png': { industry: 'aircraft_raw', quality: 'q4', baseProduction: 1.75 },
        'neodymium.png': { industry: 'aircraft_raw', quality: 'q5', baseProduction: 2.50 },

        // Food
        'food_q1.png': { industry: 'food', quality: 'q1', baseProduction: 100 },
        'food_q2.png': { industry: 'food', quality: 'q2', baseProduction: 100 },
        'food_q3.png': { industry: 'food', quality: 'q3', baseProduction: 100 },
        'food_q4.png': { industry: 'food', quality: 'q4', baseProduction: 100 },
        'food_q5.png': { industry: 'food', quality: 'q5', baseProduction: 100 },
        'food_q6.png': { industry: 'food', quality: 'q6', baseProduction: 100 },
        'food_q7.png': { industry: 'food', quality: 'q7', baseProduction: 100 },

        // Weapon
        'weapons_q1.png': { industry: 'weapon', quality: 'q1', baseProduction: 10 },
        'weapons_q2.png': { industry: 'weapon', quality: 'q2', baseProduction: 10 },
        'weapons_q3.png': { industry: 'weapon', quality: 'q3', baseProduction: 10 },
        'weapons_q4.png': { industry: 'weapon', quality: 'q4', baseProduction: 10 },
        'weapons_q5.png': { industry: 'weapon', quality: 'q5', baseProduction: 10 },
        'weapons_q6.png': { industry: 'weapon', quality: 'q6', baseProduction: 10 },
        'weapons_q7.png': { industry: 'weapon', quality: 'q7', baseProduction: 10 },

        // Aircraft
        'aircraft_weapons_q1.png': { industry: 'aircraft', quality: 'q1', baseProduction: 5 },
        'aircraft_weapons_q2.png': { industry: 'aircraft', quality: 'q2', baseProduction: 5 },
        'aircraft_weapons_q3.png': { industry: 'aircraft', quality: 'q3', baseProduction: 5 },
        'aircraft_weapons_q4.png': { industry: 'aircraft', quality: 'q4', baseProduction: 5 },
        'aircraft_weapons_q5.png': { industry: 'aircraft', quality: 'q5', baseProduction: 5 },
        'aircraft_weapons_q6.png': { industry: 'aircraft', quality: 'q6', baseProduction: 5 },
        'aircraft_weapons_q7.png': { industry: 'aircraft', quality: 'q7', baseProduction: 5 },

        // House
        'house_q1.png': { industry: 'house', quality: 'q1', baseProduction: 0.20 },
        'house_q2.png': { industry: 'house', quality: 'q2', baseProduction: 0.10 },
        'house_q3.png': { industry: 'house', quality: 'q3', baseProduction: 0.05 },
        'house_q4.png': { industry: 'house', quality: 'q4', baseProduction: 0.025 },
        'house_q5.png': { industry: 'house', quality: 'q5', baseProduction: 0.0166666666666667 },
        'house_q6.png': { industry: 'house', quality: 'q6', baseProduction: 0.0083333333333333 }, // Extrapolated 1/120
        'house_q7.png': { industry: 'house', quality: 'q7', baseProduction: 0.0041666666666667 }  // Extrapolated 1/240
    };

    function applySelection(group, targetIndustry, targetQuality, isSelect, limitByEnergy = false) {
        let maxCompanies = Infinity;
        let selectedCount = 0;

        if (isSelect && limitByEnergy) {
            if (typeof erepublik !== 'undefined' && erepublik.citizen && erepublik.citizen.energy) {
                const currentEnergy = erepublik.citizen.energy;
                maxCompanies = Math.floor(currentEnergy / 10);
                console.log(`Energy: ${currentEnergy}, Max Companies: ${maxCompanies}`);
            } else {
                console.warn("Energy variable not found");
            }
        }

        let companiesToSelect = [];

        group.find('.listing.companies').each(function () {
            const company = $j(this);
            let companyInfo = null;

            // Skip disabled companies
            if (company.hasClass('disabled')) return;

            // Iterate through images to find the one matching a defined company type
            // Non-raw industries have an extra upgrade button, shifting the index
            company.find('.area_pic img').each(function () {
                const src = this.src;
                const fname = src.split('/').pop();
                if (companyDefinitions[fname]) {
                    companyInfo = companyDefinitions[fname];
                    return false; // Break the loop
                }
            });

            if (!companyInfo) {
                // Fallback or ignore if unknown image
                console.log("Could not identify company type from images");
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
                    companiesToSelect.push(workBtn);
                } else if (!isSelect && isActive) {
                    workBtn.click();
                }
            }
        });

        if (isSelect) {
            let limitReached = false;
            for (let i = 0; i < companiesToSelect.length; i++) {
                if (limitByEnergy && (i + 1) > maxCompanies) {
                    limitReached = true;
                    break;
                }
                companiesToSelect[i].click();
            }

            if (limitReached) {
                showToast(`Selection limited by energy! Selected ${maxCompanies} companies.`, 'warning');
            }
        }
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
