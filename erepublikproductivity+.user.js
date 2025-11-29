// ==UserScript==
// @name         eRepublik Productivity+
// @author       Curlybear
// @version      1.0
// @description  Display productivity data for eRepublik regions
// @updateURL	 https://curlybear.eu/erep/erepublikproductivity+.user.js
// @downloadURL	 https://curlybear.eu/erep/erepublikproductivity+.user.js
// @match        https://www.erepublik.com/*/main/region/*
// @match        https://www.erepublik.com/*/country/economy/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at		 document-end
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const API_URL = 'https://productivityapi.curlybear.eu/productivity/';

    // Add styles
    GM_addStyle(`
        .productivity-panel {
            background: white;
            margin: 10px 0;
            font-size: 12px;
        }

        .productivity-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 4px;
        }

        .productivity-table th {
            text-align: center;
            padding: 5px;
            font-weight: 700;
            border-bottom: 1px solid #ccc;
        }

        .productivity-table th.industry{
            text-align: center;
            padding: 5px;
            font-weight: normal;
        }

        .productivity-table td {
            background: #777;
            color: white;
            padding: 5px 8px;
            text-align: center;
            border-radius: 3px;
        }

        .industry-icon {
            vertical-align: middle;
            margin-right: 5px;
            width: 25px;
            height: 25px;
        }

        .industry-name {
            color: #666;
            font-weight: bold;
            display: flex;
            align-items: center;
        }

        .header-cell {
            text-align: center;
            color: #666;
            font-weight: bold;
        }

        .productivity-cell {
            min-width: 50px;
        }

        .productivity-cell.na {
            background: transparent;
            color: #594527;
        }

        /* Economy page specific styles */
        .economy-productivity-panel {
            background: white;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }

        .industry-tabs {
            display: inline-flex;
            gap: 5px;
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }

        .industry-tab {
            padding: 8px 15px;
            box-shadow: 0 2px 2px 1px rgba(0, 0, 0, .25), 0 2px 0 0 #4991bb, 0 0 7px 3px rgba(0, 0, 0, .1) inset;
            background-color: #4d93bc;
            border-radius: 3px;
            cursor: pointer;
            color: white;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s ease;
            font-size: 13px !important;
            font-weight: bold;
        }

        .industry-tab:hover {
            background-color: #56afe4;
        }

        .industry-tab.active {
            box-shadow: 0 2px 2px 1px rgba(0, 0, 0, .25), 0 2px 0 0 #4991bb, 0 0 7px 3px rgba(0, 0, 0, .1) inset;
            background-color: #297bab;
            color: white;
            border-color: #594527;
        }

        .industry-tab img {
            width: 20px;
            height: 20px;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .economy-table {
            width: 100%;
            border-collapse: collapse;
        }

        .economy-table th {
            border-bottom: 1px solid #ccc;
            font-weight: 700;
            color: #666;
            text-shadow: #fff 0 1px 0;
            background: #f8f8f8;
            padding: 8px 0;
            text-align: left;
            white-space: nowrap;
            cursor: pointer;
            user-select: none;
            position: relative;
        }

        .economy-table th:hover {
            background: #f0f0f0;
        }

        .economy-table th::after {
            content: '↕';
            position: absolute;
            right: 5px;
            opacity: 0.3;
        }

        .economy-table th.sort-asc::after {
            content: '↑';
            opacity: 1;
        }

        .economy-table th.sort-desc::after {
            content: '↓';
            opacity: 1;
        }

        .economy-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #eee;
        }

        .economy-table td.unstable a {
            color: darkred;
            font-style: italic;
        }

        .economy-table td:not(:first-child) {
            text-align: right;
            font-family: monospace;
            font-size: 13px;
        }

        .economy-table tbody tr:hover {
            background: #f9f9f9;
        }

        .economy-table a {
            color: #3c8fa7;
            text-decoration: none;
            font-weight: bold;
        }

        .economy-table a:hover {
            text-decoration: underline;
        }
    `);

    // Region page functions
    function createRegionPanel(data) {
        const panel = document.createElement('div');
        panel.className = 'productivity-panel';

        const table = document.createElement('table');
        table.className = 'productivity-table';

        // Headers
        const headers = ['Industry', 'Raw', '★', '★★', '★★★', '★★★★', '★★★★★', '★★★★★★', '★★★★★★★'];
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.className = 'header-cell';
            th.textContent = header;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Data rows
        const industries = [
            { name: 'Food', icon: '//www.erepublik.com/images/icons/industry/1/q7.png', count: 7 },
            { name: 'Weapon', icon: '//www.erepublik.com/images/icons/industry/2/q7.png', count: 7 },
            { name: 'House', icon: '//www.erepublik.com/images/icons/industry/3/q5.png', count: 5 },
            { name: 'Aircraft Weapons', icon: '//www.erepublik.com/images/icons/industry/4/q5.png', count: 5 }
        ];

        industries.forEach(industry => {
            const row = document.createElement('tr');

            // Industry name cell with icon
            const nameCell = document.createElement('td');
            nameCell.style.background = 'transparent';
            nameCell.innerHTML = `
                <div class="industry-name">
                    <img src="${industry.icon}" class="industry-icon" />
                    ${industry.name}
                </div>
            `;
            row.appendChild(nameCell);

            // Raw material productivity
            const rawKey = `${industry.name.toLowerCase().split(' ')[0].charAt(0)}rm_productivity`;
            const rawCell = document.createElement('td');
            rawCell.className = 'productivity-cell';
            rawCell.textContent = `${(data[rawKey] * 100).toFixed(2)}%`;
            row.appendChild(rawCell);

            // Quality levels
            for (let i = 1; i <= 7; i++) {
                const cell = document.createElement('td');
                cell.className = 'productivity-cell';

                if (i <= industry.count) {
                    const key = `${industry.name.toLowerCase().split(' ')[0]}_${i}_productivity`;
                    cell.textContent = `${(data[key] * 100).toFixed(2)}%`;
                } else {
                    cell.textContent = 'N/A';
                    cell.className += ' na';
                }
                row.appendChild(cell);
            }

            table.appendChild(row);
        });

        panel.appendChild(table);
        return panel;
    }

    // Economy page functions
    function createEconomyPanel(data) {
        const panel = document.createElement('div');
        panel.className = 'economy-productivity-panel';

        const industries = [
            { id: 'food', name: 'Food', icon: '//www.erepublik.com/images/icons/industry/1/q7.png', count: 7 },
            { id: 'weapon', name: 'Weapons', icon: '//www.erepublik.com/images/icons/industry/2/q7.png', count: 7 },
            { id: 'house', name: 'Houses', icon: '//www.erepublik.com/images/icons/industry/3/q5.png', count: 5 },
            { id: 'aircraft', name: 'Aircraft', icon: '//www.erepublik.com/images/icons/industry/4/q5.png', count: 5 }
        ];

        // Create tabs
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'industry-tabs';
        industries.forEach(industry => {
            const tab = document.createElement('div');
            tab.className = 'industry-tab';
            tab.dataset.tab = industry.id;
            tab.innerHTML = `
                <img src="${industry.icon}" alt="${industry.name}" />
                ${industry.name}
            `;
            if (industry.id === 'food') tab.classList.add('active');
            tabsContainer.appendChild(tab);
        });

        // Create content for each tab
        const contentContainer = document.createElement('div');
        industries.forEach(industry => {
            const content = document.createElement('div');
            content.className = 'tab-content';
            content.dataset.tab = industry.id;
            if (industry.id === 'food') content.classList.add('active');

            content.appendChild(createIndustryTable(data, industry));
            contentContainer.appendChild(content);
        });

        // Add event listeners for tabs
        tabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.industry-tab');
            if (!tab) return;

            panel.querySelectorAll('.industry-tab').forEach(t => t.classList.remove('active'));
            panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            panel.querySelector(`.tab-content[data-tab="${tab.dataset.tab}"]`).classList.add('active');
        });

        panel.appendChild(tabsContainer);
        panel.appendChild(contentContainer);
        return panel;
    }

    function createIndustryTable(data, industry) {
        const table = document.createElement('table');
        table.className = 'economy-table';

        // Define headers
        const headers = [
            { id: 'region', label: 'Region', sort: (a, b) => a.region.localeCompare(b.region) },
            { id: `${industry.id.charAt(0)}rm_productivity`, label: 'Raw Material', sort: (a, b) => b[`${industry.id.charAt(0)}rm_productivity`] - a[`${industry.id.charAt(0)}rm_productivity`] }
        ];

        // Add quality level headers
        for (let i = 1; i <= industry.count; i++) {
            const key = `${industry.id}_${i}_productivity`;
            headers.push({
                id: key,
                label: `Quality ${i}`,
                sort: (a, b) => b[key] - a[key]
            });
        }

        // Create thead
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.label;
            th.dataset.columnId = header.id;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create tbody
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        // Initialize with sorted data
        let sortedData = [...data].sort((a, b) => a.region.localeCompare(b.region));
        let currentSort = { column: 'region', direction: 'asc' };

        // Function to update table body
        function updateTableBody() {
            tbody.innerHTML = '';
            sortedData.forEach(region => {
                const row = document.createElement('tr');

                // Region name
                const nameCell = document.createElement('td');
                if(region.is_unstable){
                    nameCell.className = 'unstable';
                }
                nameCell.innerHTML = `<a href="/en/main/region/${region.permalink}">${region.region}</a>`;
                row.appendChild(nameCell);

                // Raw material
                const rawKey = `${industry.id.charAt(0)}rm_productivity`;
                const rawCell = document.createElement('td');
                rawCell.textContent = `${(region[rawKey] * 100).toFixed(2)}%`;
                row.appendChild(rawCell);

                // Quality levels
                for (let i = 1; i <= industry.count; i++) {
                    const cell = document.createElement('td');
                    const key = `${industry.id}_${i}_productivity`;
                    cell.textContent = `${(region[key] * 100).toFixed(2)}%`;
                    row.appendChild(cell);
                }

                tbody.appendChild(row);
            });
        }

        // Add click handlers for sorting
        headerRow.addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (!th) return;

            const columnId = th.dataset.columnId;
            const header = headers.find(h => h.id === columnId);

            // Remove sort classes from all headers
            headerRow.querySelectorAll('th').forEach(header => {
                header.classList.remove('sort-asc', 'sort-desc');
            });

            // Toggle sort direction if same column
            if (currentSort.column === columnId) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = columnId;
                currentSort.direction = 'desc';
            }

            // Add sort class to current header
            th.classList.add(`sort-${currentSort.direction}`);

            // Sort data
            sortedData.sort(header.sort);
            if (currentSort.direction === 'asc') {
                sortedData.reverse();
            }

            // Update table
            updateTableBody();
        });

        // Initial render
        updateTableBody();

        return table;
    }

    // Fetch and display data based on page type
    function fetchAndDisplayData() {
        const isEconomyPage = window.location.pathname.includes('/country/economy/');

        if (isEconomyPage) {
            const countryName = getCountryNameFromUrl();
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${API_URL}?country=${countryName}`,
                headers: {
                    'Accept': 'application/json'
                },
                onload: function(response) {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        if (data && data.length > 0) {
                            const insertPoint = document.querySelector('#productivityInformation');
                            if (insertPoint) {
                                const panel = createEconomyPanel(data);
                                insertPoint.after(panel);
                            }
                        }
                    }
                }
            });
        } else {
            // Original region page code
            const permalink = window.location.pathname.split('/').pop();
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${API_URL}?permalink=${permalink}`,
                headers: {
                    'Accept': 'application/json'
                },
                onload: function(response) {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText)[0];
                        if (data) {
                            const insertPoint = [...document.querySelectorAll("h2")].find(el => el.innerHTML.includes("Productivity Information"));
                            if (insertPoint) {
                                const panel = createRegionPanel(data);
                                insertPoint.after(panel);
                            }
                        }
                    }
                }
            });
        }
    }

    function getCountryNameFromUrl() {
        // Extract the last part of the current page URL
        const permalink = window.location.pathname.split('/').pop();

        // Access the countries object
        const countries = erepublik.info.countries;
        // Iterate over the country objects
        for (let key in countries) {
            if (countries[key].permalink === permalink) {
                return countries[key].name;
            }
        }
        // Return null if not found
        return null;
    }

    // Initialize when the page is loaded
    fetchAndDisplayData();
})();