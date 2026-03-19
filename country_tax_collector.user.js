// ==UserScript==
// @name         Country Tax Collector
// @version      0.1
// @description  Aggregate and breakdown daily tax revenue collected from other countries
// @author       Curlybear
// @match        https://www.erepublik.com/*/country/economy/*
// @grant        none
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    // Only inject on pages with jQuery available and chartDataJSON
    if (typeof jQuery === 'undefined') return;

    // Inject UI
    const uiHtml = `
        <div id="ctc-container" style="position: fixed; top: 120px; right: 20px; width: 340px; background: rgba(30, 30, 30, 0.95); border: 1px solid #444; color: #eee; padding: 15px; z-index: 9999; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.5); font-family: Arial, sans-serif; display: none;">
            <div style="cursor: move; font-weight: bold; margin-bottom: 15px; text-align: center; border-bottom: 1px solid #555; padding-bottom: 8px; font-size: 14px;" id="ctc-header">
                💰 Country Tax Collector
                <span id="ctc-close" style="float:right; cursor:pointer; color:#aaa; font-size: 16px; line-height: 14px;" title="Close">✖</span>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-direction: column;">
                <div style="font-size: 12px; color: #bbb;">Select Date Range (Available: <span id="ctc-available-range">Loading...</span>)</div>
                <select id="ctc-preset-terms" style="width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #555; background: #222; color: #fff; border-radius: 4px;">
                    <option value="">-- Custom Range --</option>
                </select>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <select id="ctc-start-day" style="flex: 1; min-width: 0; box-sizing: border-box; padding: 6px; border: 1px solid #555; background: #222; color: #fff; border-radius: 4px;"></select>
                    <span>-</span>
                    <select id="ctc-end-day" style="flex: 1; min-width: 0; box-sizing: border-box; padding: 6px; border: 1px solid #555; background: #222; color: #fff; border-radius: 4px;"></select>
                </div>
            </div>

            <div style="display: flex; gap: 10px;">
                <button id="ctc-aggregate-btn" style="flex: 1; padding: 8px; background: #2a73cc; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Aggregate Taxes</button>
                <button id="ctc-export-btn" style="flex: 1; padding: 8px; background: #28a745; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Export CSV</button>
            </div>

            <div id="ctc-status" style="margin-top: 15px; font-size: 12px; color: #aaa; text-align: center;">Waiting for input...</div>
            <div id="ctc-results" style="margin-top: 15px; max-height: 350px; overflow-y: auto; font-size: 13px; display: flex; flex-direction: column; gap: 4px;"></div>
        </div>
        <div id="ctc-toggle-btn" style="position: fixed; bottom: 20px; right: 20px; background: #218838; color: white; padding: 10px 15px; border-radius: 20px; z-index: 9998; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-weight: bold; font-family: Arial, sans-serif;">
            💰 Tax Collector
        </div>
    `;

    jQuery("body").append(uiHtml);

    // Constants & State
    const STANDARD_COLS = ["Day", "Work as Manager", "Work", "Value Added Tax", "Medals", "Import Tax", "Combat Orders", "Treasury Donations", "Cities Subsidy"];
    let minDay = 999999;
    let maxDay = 0;

    const setStatus = (msg) => { jQuery("#ctc-status").text(msg); };

    const formatNumber = (num) => {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const extractDayNumber = (dayStr) => {
        const parts = dayStr.split(' ');
        if (parts.length > 1) {
            return parseInt(parts[1].replace(/,/g, ''), 10);
        }
        return parseInt(dayStr.replace(/,/g, ''), 10);
    };

    const getMonthName = (m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m];

    const dayToDateString = (day) => {
        const d = new Date(Date.UTC(2007, 10, 21));
        d.setUTCDate(d.getUTCDate() + (day - 1));
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const yy = String(d.getUTCFullYear()).slice(-2);
        return `Day ${day} - ${dd}/${mm}/${yy}`;
    };

    function setupData() {
        if (typeof window.chartDataJSON === 'undefined') {
            setStatus("Error: chartDataJSON not found on page.");
            jQuery("#ctc-aggregate-btn").prop("disabled", true);
            return;
        }

        const data = window.chartDataJSON;
        if (data.length <= 1) {
            setStatus("No tax data available.");
            return;
        }

        minDay = 999999;
        maxDay = 0;

        const activeDays = [];
        for (let i = 1; i < data.length; i++) {
            const dayNum = extractDayNumber(data[i][0]);
            if (!isNaN(dayNum)) {
                activeDays.push(dayNum);
                if (dayNum < minDay) minDay = dayNum;
                if (dayNum > maxDay) maxDay = dayNum;
            }
        }

        if (activeDays.length === 0) return;
        activeDays.sort((a, b) => a - b);

        if (minDay <= maxDay) {
            jQuery("#ctc-available-range").text(`Day ${minDay} - Day ${maxDay}`);

            // Populate Selects
            let optionsHtml = '';
            activeDays.forEach(day => {
                optionsHtml += `<option value="${day}">${dayToDateString(day)}</option>`;
            });
            jQuery("#ctc-start-day").html(optionsHtml);
            jQuery("#ctc-end-day").html(optionsHtml);

            // Pre-fill min and max if they were empty
            if (!jQuery("#ctc-start-day").val()) jQuery("#ctc-start-day").val(minDay);
            if (!jQuery("#ctc-end-day").val()) jQuery("#ctc-end-day").val(maxDay);

            // Build Presets
            const terms = {};
            activeDays.forEach(day => {
                const d = new Date(Date.UTC(2007, 10, 21));
                d.setUTCDate(d.getUTCDate() + (day - 1));

                let termYear = d.getUTCFullYear();
                let termMonth = d.getUTCMonth();

                if (d.getUTCDate() < 6) {
                    termMonth--;
                    if (termMonth < 0) {
                        termMonth = 11;
                        termYear--;
                    }
                }

                const termKey = `${termYear}-${termMonth}`;
                if (!terms[termKey]) {
                    terms[termKey] = {
                        name: `${getMonthName(termMonth)} ${termYear} Term`,
                        days: []
                    };
                }
                terms[termKey].days.push(day);
            });

            let presetHtml = '<option value="">-- Custom Range --</option>';
            Object.values(terms).forEach(term => {
                const minD = term.days[0];
                const maxD = term.days[term.days.length - 1];
                presetHtml += `<option value="${minD}-${maxD}">${term.name} (${term.days.length} days)</option>`;
            });

            // Only populate preset terms once to avoid erasing user choice on toggle
            if (jQuery("#ctc-preset-terms").children().length <= 1) {
                jQuery("#ctc-preset-terms").html(presetHtml);
            }
        }
    }

    // Bind preset selector
    jQuery("body").on("change", "#ctc-preset-terms", function () {
        const val = jQuery(this).val();
        if (val) {
            const parts = val.split('-');
            jQuery("#ctc-start-day").val(parts[0]);
            jQuery("#ctc-end-day").val(parts[1]);
        }
    });

    // Toggle UI
    const toggleCtcWindow = (show) => {
        if (show) {
            setupData();
            jQuery("#ctc-container").show();
            localStorage.setItem("ctc_window_open", "true");
        } else {
            jQuery("#ctc-container").hide();
            localStorage.setItem("ctc_window_open", "false");
        }
    };

    if (localStorage.getItem("ctc_window_open") === "true") {
        toggleCtcWindow(true);
    }

    jQuery("#ctc-toggle-btn").on("click", () => {
        toggleCtcWindow(!jQuery("#ctc-container").is(":visible"));
    });
    jQuery("#ctc-close").on("click", () => {
        toggleCtcWindow(false);
    });

    // Simple Drag & Drop
    const container = document.getElementById("ctc-container");
    const header = document.getElementById("ctc-header");
    let isDragging = false, startX, startY, initX, initY;

    header.addEventListener("mousedown", (e) => {
        if (e.target.id === 'ctc-close') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initX = container.offsetLeft;
        initY = container.offsetTop;
    });

    // Restore window position
    const savedPos = localStorage.getItem("ctc_window_pos");
    if (savedPos) {
        try {
            const pos = JSON.parse(savedPos);
            container.style.top = pos.top;
            container.style.left = pos.left;
            container.style.right = pos.right;
        } catch (e) { }
    }

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        container.style.left = (initX + e.clientX - startX) + "px";
        container.style.top = (initY + e.clientY - startY) + "px";
        container.style.right = 'auto';
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            localStorage.setItem("ctc_window_pos", JSON.stringify({
                top: container.style.top,
                left: container.style.left,
                right: container.style.right
            }));
        }
    });

    jQuery("#ctc-aggregate-btn").on("click", () => {
        if (typeof window.chartDataJSON === 'undefined') return;

        const startDay = parseInt(jQuery("#ctc-start-day").val(), 10);
        const endDay = parseInt(jQuery("#ctc-end-day").val(), 10);

        if (isNaN(startDay) || isNaN(endDay) || startDay > endDay) {
            setStatus("Invalid date range.");
            return;
        }

        const data = window.chartDataJSON;
        const headers = data[0];

        // Find indices of conquered country columns
        const countryIndices = [];
        for (let i = 0; i < headers.length; i++) {
            if (!STANDARD_COLS.includes(headers[i])) {
                countryIndices.push({ index: i, name: headers[i] });
            }
        }

        if (countryIndices.length === 0) {
            setStatus("No conquered countries found in the tax data.");
            jQuery("#ctc-results").empty();
            return;
        }

        // Initialize sum object
        const sums = {};
        countryIndices.forEach(c => sums[c.name] = 0);

        let daysProcessed = 0;

        // Iterate through rows and sum data
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const currentDay = extractDayNumber(row[0]);

            if (currentDay >= startDay && currentDay <= endDay) {
                daysProcessed++;
                countryIndices.forEach(c => {
                    const val = parseFloat(row[c.index]) || 0;
                    sums[c.name] += val;
                });
            }
        }

        // Display results
        jQuery("#ctc-results").empty();

        if (daysProcessed === 0) {
            setStatus(`No data matches range (Day ${startDay} - ${endDay}).`);
            return;
        }

        let totalTaxes = 0;

        // Convert to array and sort by value descending
        const sortedSums = Object.entries(sums).sort((a, b) => b[1] - a[1]);

        let html = `<table style="width: 100%; border-collapse: collapse; text-align: left;">`;
        html += `<tr style="border-bottom: 2px solid #555; background: #222;">
                    <th style="padding: 6px;">Country</th>
                    <th style="padding: 6px; text-align: right;">Collected</th>
                 </tr>`;

        // Output rows
        sortedSums.forEach(([countryName, value]) => {
            if (value > 0) {
                totalTaxes += value;
                html += `<tr style="border-bottom: 1px solid #444;">
                            <td style="padding: 6px; color: #6fb0fc; font-weight: bold;">${countryName}</td>
                            <td style="padding: 6px; text-align: right; color: #ddd;">${formatNumber(value)} cc</td>
                         </tr>`;
            }
        });

        // Grand total row
        html += `<tr style="background: #2a2a2a; border-top: 2px solid #555;">
                    <td style="padding: 8px; font-weight: bold; color: #fff;">GRAND TOTAL</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold; color: #73cc2a;">${formatNumber(totalTaxes)} cc</td>
                 </tr>`;

        html += `</table>`;

        jQuery("#ctc-results").html(html);
        setStatus(`Aggregated over ${daysProcessed} days.`);
    });

    jQuery("#ctc-export-btn").on("click", () => {
        if (typeof window.chartDataJSON === 'undefined') return;

        const startDay = parseInt(jQuery("#ctc-start-day").val(), 10);
        const endDay = parseInt(jQuery("#ctc-end-day").val(), 10);

        if (isNaN(startDay) || isNaN(endDay) || startDay > endDay) {
            setStatus("Invalid date range for export.");
            return;
        }

        const data = window.chartDataJSON;
        const headers = data[0];

        let csvContent = headers.map(h => `"${h}"`).join(",") + "\n";
        let exportCount = 0;

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const currentDay = extractDayNumber(row[0]);

            if (currentDay >= startDay && currentDay <= endDay) {
                exportCount++;
                csvContent += row.map(val => `"${val}"`).join(",") + "\n";
            }
        }

        if (exportCount === 0) {
            setStatus(`No data matches range (Day ${startDay} - ${endDay}).`);
            return;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const urlParts = window.location.pathname.replace(/\/$/, '').split('/');
        const countryName = urlParts.pop() || "unknown";
        link.setAttribute("href", url);
        link.setAttribute("download", `erepublik_${countryName}_taxes_day_${startDay}_to_${endDay}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setStatus(`Exported ${exportCount} days to CSV!`);
    });

})();
