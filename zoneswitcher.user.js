// ==UserScript==
// @name         Zone Switcher
// @author       Curlybear
// @description  Zone/Division Switcher for eRepublik
// @version      0.20
// @updateURL    https://curlybear.eu/erep/zoneswitcher.user.js
// @downloadURL  https://curlybear.eu/erep/zoneswitcher.user.js
// @match        https://www.erepublik.com/*/military/battlefield/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

// Changelog
// 0.3
// Initial release

// 0.4
// Line return for small terrain names

// 0.5
// Add medal damage status of each zone

// 0.6
// Format the damage numbers to be readable

// 0.7
// Browser compatibility

// 0.8
// Check for even more non existant data (thx erep)

// 0.9
// Fix for lower div players

// 0.10
// Add zone status

// 0.11
// Remove event related features
// De-activate during air rounds
// Increase button size

// 0.12
// Add air divisions

// 0.13
// - Erep fucked with some default array method, and js took it badly, so now I have to check for something absurd

// 0.15
// - Add total influence and influence diff to the display

// 0.16
// - Adjust side based on player location and have the absolute value for the influence difference

// 0.17
// - Fresh coat of paint, features should still work as it did. Maybe. Like I think so.

// 0.18
// - Make the influence things optional for now

// 0.19
// - Add an actual settings menu to activate/deactivate data displays

// 0.20
// - Attempt a fix for div orders
// - Add light/dark theming
// - Add hover description on the various fields

(function() {
    'use strict';

    function initZoneSwitcher() {
        if (typeof window.SERVER_DATA === 'undefined') {
            console.error('SERVER_DATA is not available. Zone Switcher cannot initialize.');
            return;
        }

        const SERVER_DATA = window.SERVER_DATA;
        const jQuery = window.jQuery;
        const csrfToken = window.csrfToken;

        class ZoneSwitcher {
            constructor() {
                this.battleId = SERVER_DATA.battleId;
                this.divs = SERVER_DATA.travel.battleZones;
                this.currentDivision = SERVER_DATA.currentDivision;
                this.battleZoneId = SERVER_DATA.battleZoneId;
                this.citizenId = SERVER_DATA.citizenId;
                this.fighterCountryId = SERVER_DATA.fighterCountryId;
                this.realInvaderId = SERVER_DATA.realInvaderId;
                this.currentRoundNumber = SERVER_DATA.currentRoundNumber;
                this.leftBattleId = SERVER_DATA.leftBattleId;

                this.settings = {
                    showInfluence: this.getStoredSetting('showInfluence', true),
                    showMedals: this.getStoredSetting('showMedals', true),
                    showDescriptions: this.getStoredSetting('showDescriptions', true),
                    theme: this.getStoredSetting('theme', 'light')
                };

                this.init();
            }

            init() {
                this.createLayout();
                this.fetchBattleStats();
                this.createSettingsButton();
                this.createSettingsModal();
                this.applyTheme();
            }

            getStoredSetting(key, defaultValue) {
                const storedValue = localStorage.getItem(`zoneSwitcher_${key}`);
                return storedValue !== null ? JSON.parse(storedValue) : defaultValue;
            }

            setStoredSetting(key, value) {
                localStorage.setItem(`zoneSwitcher_${key}`, JSON.stringify(value));
            }

            createLayout() {
                const container = jQuery("<div id='zoneswitchercontainer'></div>");
                jQuery("#content").append(container);
                this.renderZoneSwitcher();
            }

            renderZoneSwitcher() {
                const zonesData = Object.values(this.divs)
                .filter(div => div.division)
                .sort((a, b) => a.division - b.division) // Sort divisions in ascending order
                .map(div => ({
                    id: div.division,
                    name: `DIV ${div.division}`,
                    battleZoneId: div.battleZoneId,
                    damage: 'Loading...',
                    influenceLeft: 'Loading...',
                    influenceRight: 'Loading...',
                    influenceDiff: 'Loading...',
                    status: 'Loading...',
                    isTopDamage: false
                }));

                const zoneSwitcherHtml = `
                    <div class="zone-cards">
                        ${zonesData.map(zone => this.renderZoneCard(zone)).join('')}
                    </div>
                `;

                jQuery("#zoneswitchercontainer").html(zoneSwitcherHtml);
                this.applySettings();
            }

            renderZoneCard(zone) {
                return `
                    <div class="zone-card ${zone.id === this.currentDivision ? 'selected-zone' : ''}" id="zone-${zone.id}">
                        <div class="zone-header" style="background-color: ${this.getZoneColor(zone.id)}">
                            <a href="https://www.erepublik.com/en/military/battlefield/${this.battleId}/${zone.battleZoneId}" class="zone-link">
                                ${zone.name}
                            </a>
                        </div>
                        <div class="zone-content">
                            <div class="zone-damage ${zone.isTopDamage ? 'top-damage' : ''}" id="damage-${zone.id}" data-description="Total damage dealt in this division">
                                ${zone.damage}
                            </div>
                            <div class="zone-influence">
                                <span class="influence-left" id="influence-left-${zone.id}" data-description="Total influence for the left side country">
                                    ${zone.influenceLeft}
                                </span>
                                <span class="influence-right" id="influence-right-${zone.id}" data-description="Total influence for the right side country">
                                    ${zone.influenceRight}
                                </span>
                            </div>
                            <div class="influence-diff" id="influence-diff-${zone.id}" data-description="Difference in influence between the two sides">
                                ${zone.influenceDiff}
                            </div>
                            <div class="zone-status" id="status-${zone.id}" data-description="Current status of the division">
                                ${zone.status}
                            </div>
                        </div>
                    </div>
                `;
            }

            getZoneColor(zoneId) {
                const colors = {
                    1: '#4285F4',
                    2: '#FBBC05',
                    3: '#34A853',
                    4: '#EA4335',
                    11: '#9C27B0'
                };
                return colors[zoneId] || '#000000';
            }

            fetchBattleStats() {
                jQuery.ajax({
                    url: `https://www.erepublik.com/en/military/battle-stats/${this.battleId}/${this.currentDivision}/${this.battleZoneId}`,
                    method: 'GET',
                    dataType: 'json',
                    success: (data) => this.processBattleStats(data),
                    error: (xhr, status, error) => console.error("Error fetching battle stats:", error)
                });
            }

            processBattleStats(battleData) {
                const roundData = battleData.stats.current[this.currentRoundNumber];

                for (let divid in this.divs) {
                    if (divid !== 'unique') {
                        this.updateZoneDamage(roundData, this.divs[divid]);
                        this.fetchZoneInfluence(this.divs[divid]);
                    }
                }

                this.fetchZoneStatus();
            }

            updateZoneDamage(roundData, zone) {
                const damageElement = jQuery(`#damage-${zone.division}`);
                const divData = roundData && roundData[zone.division] && roundData[zone.division][this.leftBattleId] && roundData[zone.division][this.leftBattleId][zone.battleZoneId];

                if (divData) {
                    const damage = this.abbreviateNumber(divData.top_damage[0].damage, 0);
                    damageElement.text(damage);

                    if (divData.top_damage[0].citizen_id == this.citizenId) {
                        damageElement.addClass("top-damage");
                    }
                } else {
                    damageElement.text("Open");
                }
            }

            fetchZoneInfluence(zone) {
                jQuery.post('https://www.erepublik.com/en/military/battle-console', {
                    battleId: this.battleId,
                    zoneId: this.battleZoneId,
                    action: 'charts',
                    battleZoneId: zone.battleZoneId,
                    page: 1,
                    _token: csrfToken
                }).done((data) => this.updateZoneInfluence(data, zone));
            }

            updateZoneInfluence(data, zone) {
                const infdata = data.pop();
                const isInvader = this.realInvaderId == this.fighterCountryId;
                const influenceLeft = isInvader ? infdata.invader_overall_damage : infdata.defender_overall_damage;
                const influenceRight = isInvader ? infdata.defender_overall_damage : infdata.invader_overall_damage;
                const influenceDiff = Math.abs(infdata.invader_overall_damage - infdata.defender_overall_damage);

                jQuery(`#influence-left-${zone.division}`).text(this.abbreviateNumber(influenceLeft));
                jQuery(`#influence-right-${zone.division}`).text(this.abbreviateNumber(influenceRight));
                jQuery(`#influence-diff-${zone.division}`).text(this.abbreviateNumber(influenceDiff));
            }

            fetchZoneStatus() {
                jQuery.post('https://www.erepublik.com/en/military/battle-console', {
                    battleId: this.battleId,
                    zoneId: this.battleZoneId,
                    action: 'battleConsole',
                    battleZoneId: this.battleZoneId,
                    _token: csrfToken
                }).done((data) => this.updateZoneStatus(data));
            }

            updateZoneStatus(data) {
                const statusData = data.division;
                for (let zone in statusData) {
                    if (zone !== 'unique') {
                        const statusElement = jQuery(`#status-${statusData[zone].division}`);
                        const status = statusData[zone].countries.dominatingCountry == this.leftBattleId ? 'Winning' : 'Losing';
                        statusElement.text(status).removeClass('winning losing').addClass(status.toLowerCase());
                    }
                }
            }

            abbreviateNumber(num, fixed) {
                if (num === null) return null;
                if (num === 0) return '0';
                fixed = (!fixed || fixed < 0) ? 0 : fixed;
                var b = (num).toPrecision(2).split("e"),
                    k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3),
                    c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3)).toFixed(1 + fixed),
                    d = c < 0 ? c : Math.abs(c),
                    e = d + ['', 'K', 'M', 'B', 'T'][k];
                return e;
            }

            createSettingsButton() {
                const settingsButton = jQuery('<button id="zone-switcher-settings" class="zone-switcher-settings-btn">⚙️</button>');
                jQuery("#zoneswitchercontainer").append(settingsButton);
                settingsButton.on('click', () => this.toggleSettingsModal());
            }

            createSettingsModal() {
                const modal = jQuery(`
                    <div id="zone-switcher-modal" class="zone-switcher-modal hide-me">
                        <div class="zone-switcher-modal-content">
                            <h3>Zone Switcher Settings</h3>
                            <label>
                                <input type="checkbox" id="show-influence" ${this.settings.showInfluence ? 'checked' : ''}>
                                Show Influence Data
                            </label>
                            <label>
                                <input type="checkbox" id="show-medals" ${this.settings.showMedals ? 'checked' : ''}>
                                Show Medal Data
                            </label>
                            <label>
                                <input type="checkbox" id="show-descriptions" ${this.settings.showDescriptions ? 'checked' : ''}>
                                Show Hover Descriptions
                            </label>
                            <label>
                                Theme:
                                <select id="theme-select">
                                    <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Light</option>
                                    <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                                </select>
                            </label>
                            <button id="save-zone-switcher-settings">Save</button>
                        </div>
                    </div>
                `);
                jQuery("body").append(modal);

                jQuery("#save-zone-switcher-settings").on('click', () => this.saveSettings());
            }

            toggleSettingsModal() {
                jQuery("#zone-switcher-modal").toggleClass('hide-me');
            }

            saveSettings() {
                this.settings.showInfluence = jQuery("#show-influence").is(':checked');
                this.settings.showMedals = jQuery("#show-medals").is(':checked');
                this.settings.showDescriptions = jQuery("#show-descriptions").is(':checked');
                this.settings.theme = jQuery("#theme-select").val();

                this.setStoredSetting('showInfluence', this.settings.showInfluence);
                this.setStoredSetting('showMedals', this.settings.showMedals);
                this.setStoredSetting('showDescriptions', this.settings.showDescriptions);
                this.setStoredSetting('theme', this.settings.theme);

                this.applySettings();
                this.applyTheme();
                this.toggleSettingsModal();
            }

            applySettings() {
                if (this.settings.showInfluence) {
                    jQuery(".zone-influence, .influence-diff").removeClass('hide-me');
                } else {
                    jQuery(".zone-influence, .influence-diff").addClass('hide-me');
                }

                if (this.settings.showMedals) {
                    jQuery(".top-damage").removeClass('hide-me');
                } else {
                    jQuery(".top-damage").addClass('hide-me');
                }

                if (this.settings.showDescriptions) {
                    this.enableHoverDescriptions();
                } else {
                    this.disableHoverDescriptions();
                }
            }

            applyTheme() {
                document.body.setAttribute('data-zone-switcher-theme', this.settings.theme);
            }

            enableHoverDescriptions() {
                jQuery("[data-description]").each((index, element) => {
                    const $element = jQuery(element);
                    const description = $element.data('description');
                    $element.attr('title', description);
                });
            }

            disableHoverDescriptions() {
                jQuery("[data-description]").removeAttr('title');
            }
        }

        // Initialize the ZoneSwitcher
        new ZoneSwitcher();
    }

    // Ensure the script runs after the page is fully loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initZoneSwitcher();
    } else {
        window.addEventListener('DOMContentLoaded', initZoneSwitcher);
    }

    // Styles
    const styles = `
        body[data-zone-switcher-theme="light"] {
            --zs-bg-color: #ffffff;
            --zs-text-color: #000000;
            --zs-card-bg: #ffffff;
            --zs-card-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            --zs-modal-bg: #ffffff;
            --zs-modal-text: #000000;
        }

        body[data-zone-switcher-theme="dark"] {
            --zs-bg-color: #1e1e1e;
            --zs-text-color: #ffffff;
            --zs-card-bg: #2c2c2c;
            --zs-card-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            --zs-modal-bg: #2c2c2c;
            --zs-modal-text: #ffffff;
        }

        #zoneswitchercontainer {
            width: 100.5%;
            box-sizing: border-box;
            display: flow-root;
            padding-top: 5px;
            background-color: var(--zs-bg-color);
            color: var(--zs-text-color);
            padding-left: 5px;
            padding-right: 5px;
        }

        .zone-cards {
            display: flex;
            justify-content: space-between;
            flex-wrap: nowrap;
            gap: 10px;
        }

        .zone-card {
            flex: 1;
            background-color: var(--zs-card-bg);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: var(--zs-card-shadow);
            color: var(--zs-text-color);
        }

        .zone-header {
            padding: 8px;
            text-align: center;
            font-weight: bold;
            color: #ffffff;
        }

        .zone-link {
            color: #ffffff;
            text-decoration: none;
            font-size: 18px;
            position: relative;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: block;
        }

        .zone-content {
            padding: 8px;
        }

        .zone-damage {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 5px;
            position: relative;
        }

        .top-damage {
            background: lightblue;
            border-radius: 8px;
        }

        .zone-influence {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 15px;
        }

        .influence-left, .influence-right, .influence-diff {
            color: var(--zs-text-color);
        }

        .influence-diff {
            text-align: center;
            font-size: 15px;
            margin-bottom: 5px;
        }

        .zone-status {
            text-align: center;
            font-weight: bold;
            font-size: 12px;
        }

        .winning {
            color: #34A853;
        }

        .losing {
            color: #EA4335;
        }

        .selected-zone {
            box-shadow: 0 0 0 2px #4285F4;
        }

        .hide-me {
            display: none !important;
        }

        .zone-switcher-settings-btn {
            position: relative;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
        }

        .zone-switcher-modal {
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
        }

        .zone-switcher-modal-content {
            background-color: var(--zs-modal-bg);
            color: var(--zs-modal-text);
            margin: 15% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 300px;
            border-radius: 5px;
        }

        .zone-switcher-modal-content h3 {
            margin-top: 0;
        }

        .zone-switcher-modal-content label {
            display: block;
            margin-bottom: 10px;
        }

        .zone-switcher-modal-content button {
            margin-top: 10px;
            background-color: var(--zs-bg-color);
            color: var(--zs-text-color);
            border: 1px solid var(--zs-text-color);
            padding: 5px 10px;
            cursor: pointer;
        }

        .zone-switcher-modal-content button:hover {
            background-color: var(--zs-text-color);
            color: var(--zs-bg-color);
        }

        .zone-switcher-modal-content select {
            background-color: var(--zs-bg-color);
            color: var(--zs-text-color);
            border: 1px solid var(--zs-text-color);
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
})();