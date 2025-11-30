// ==UserScript==
// @name         Anniversary Quest Helper
// @version      1.8
// @description  Displays total remaining time for locked locations and required miles and tokens for unclaimed locations for the Anniversary Quest on eRepublik.
// @author       Curlybear
// @match        https://www.erepublik.com/*/main/anniversaryQuest
// @updateURL    https://curlybear.eu/erep/anniversaryhelper.user.js
// @downloadURL  https://curlybear.eu/erep/anniversaryhelper.user.js
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @run-at		document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const DATA_URL = "https://www.erepublik.com/en/main/anniversaryQuestData";

    // Fetch the data
    $.getJSON(DATA_URL, function (data) {
        const inventory = data.status.inventory;
        const progress = data.status.progress;
        const queue = data.status.queue;
        const cities = data.cities;

        let totalRemainingTime = 0;
        let totalMilesNeeded = 0;
        let totalTokensNeeded = 0;

        // Calculate totals for locked locations
        for (const cityId in cities) {
            const city = cities[cityId];
            const cityProgress = progress[cityId];

            if (!cityProgress) {
                // City is still locked
                totalRemainingTime += city.waitTime || 0;
            }
        }

        // Add remaining time for the last unlocking location in the queue (times are cumulative)
        if (queue.length > 0) {
            totalRemainingTime += queue[queue.length - 1].remainingTime || 0;
        }

        // Calculate totals for unlocked but unclaimed locations
        for (const cityId in cities) {
            const city = cities[cityId];
            const cityProgress = progress[cityId];

            if (cityProgress && cityProgress.nodeStatus === "unclaimed" && (cityProgress.extraStatus === "e_locked" || cityProgress.extraStatus === "e_unavailable")) {
                // City is unlocked but not claimed
                totalMilesNeeded += city.miles;
                totalTokensNeeded += city.tokens;
            }
        }

        // Check if the user has enough miles and tokens
        const hasEnoughMiles = inventory.miles >= totalMilesNeeded;
        const hasEnoughTokens = inventory.tokens >= totalTokensNeeded;

        // Styling for the helper
        const container = $(`
            <div id="anniversary-helper" style="
                background: #f4f4f4;
                border: 2px solid #ccc;
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            ">
                <h3 style="margin-bottom: 10px; font-size: 18px; color: #333;">Anniversary Quest Summary</h3>
                <p><strong>Total Remaining Time (Locked + Unlocking Locations):</strong> ${formatTimeWithDays(totalRemainingTime)}</p>
                <p><strong>Total Miles Required (Unlocked & Unclaimed Locations):</strong> <span style="color: ${hasEnoughMiles ? 'green' : 'red'};">${formatNumber(totalMilesNeeded)} (You have: ${formatNumber(inventory.miles)})</span></p>
                <p><strong>Total Tokens Required (Unlocked & Unclaimed Locations):</strong> <span style="color: ${hasEnoughTokens ? 'green' : 'red'};">${formatNumber(totalTokensNeeded)} (You have: ${formatNumber(inventory.tokens)})</span></p>
            </div>
        `);

        // Append the container after the #anniversaryQuestMap
        $('#anniversaryQuestMap').after(container);
    });

    function formatTimeWithDays(seconds) {
        const days = Math.floor(seconds / 86400);
        const hrs = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${days}d ${hrs}h ${mins}m ${secs}s`;
    }

    function formatNumber(num) {
        return num.toLocaleString('en-US');
    }
})();
