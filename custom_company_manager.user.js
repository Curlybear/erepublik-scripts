// ==UserScript==
// @name         eRepublik Custom Company Manager
// @version      0.2
// @description  High-performance, custom "Company Manager plus" dashboard.
// @author       Curlybear
// @match        https://www.erepublik.com/en/economy/custom-manager*
// @match        https://www.erepublik.com/en/economy/myCompanies
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      erepublik.com
// ==/UserScript==

(function () {
    'use strict';

    // ==========================================
    // 1. CONFIGURATION & CONSTANTS
    // ==========================================
    const DB_NAME = 'eRepCustomManagerDB';
    const DB_VERSION = 1;
    const CUSTOM_URL = '/en/economy/custom-manager';

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
        'food_q1.png': { industry: 'food', quality: 'q1', baseProduction: 100, rawCost: 0.01 },
        'food_q2.png': { industry: 'food', quality: 'q2', baseProduction: 100, rawCost: 0.02 },
        'food_q3.png': { industry: 'food', quality: 'q3', baseProduction: 100, rawCost: 0.03 },
        'food_q4.png': { industry: 'food', quality: 'q4', baseProduction: 100, rawCost: 0.04 },
        'food_q5.png': { industry: 'food', quality: 'q5', baseProduction: 100, rawCost: 0.05 },
        'food_q6.png': { industry: 'food', quality: 'q6', baseProduction: 100, rawCost: 0.06 },
        'food_q7.png': { industry: 'food', quality: 'q7', baseProduction: 100, rawCost: 0.20 },

        // Weapon
        'weapons_q1.png': { industry: 'weapon', quality: 'q1', baseProduction: 10, rawCost: 0.1 },
        'weapons_q2.png': { industry: 'weapon', quality: 'q2', baseProduction: 10, rawCost: 0.2 },
        'weapons_q3.png': { industry: 'weapon', quality: 'q3', baseProduction: 10, rawCost: 0.3 },
        'weapons_q4.png': { industry: 'weapon', quality: 'q4', baseProduction: 10, rawCost: 0.4 },
        'weapons_q5.png': { industry: 'weapon', quality: 'q5', baseProduction: 10, rawCost: 0.5 },
        'weapons_q6.png': { industry: 'weapon', quality: 'q6', baseProduction: 10, rawCost: 0.6 },
        'weapons_q7.png': { industry: 'weapon', quality: 'q7', baseProduction: 10, rawCost: 2.0 },

        // Aircraft
        'aircraft_weapons_q1.png': { industry: 'aircraft', quality: 'q1', baseProduction: 5, rawCost: 0.2 },
        'aircraft_weapons_q2.png': { industry: 'aircraft', quality: 'q2', baseProduction: 5, rawCost: 0.4 },
        'aircraft_weapons_q3.png': { industry: 'aircraft', quality: 'q3', baseProduction: 5, rawCost: 0.6 },
        'aircraft_weapons_q4.png': { industry: 'aircraft', quality: 'q4', baseProduction: 5, rawCost: 0.8 },
        'aircraft_weapons_q5.png': { industry: 'aircraft', quality: 'q5', baseProduction: 5, rawCost: 1.0 },
        'aircraft_weapons_q6.png': { industry: 'aircraft', quality: 'q6', baseProduction: 5, rawCost: 1.0 },
        'aircraft_weapons_q7.png': { industry: 'aircraft', quality: 'q7', baseProduction: 5, rawCost: 1.0 },

        // House
        'house_q1.png': { industry: 'house', quality: 'q1', baseProduction: 0.20, rawCost: 10 },
        'house_q2.png': { industry: 'house', quality: 'q2', baseProduction: 0.10, rawCost: 20 },
        'house_q3.png': { industry: 'house', quality: 'q3', baseProduction: 0.05, rawCost: 40 },
        'house_q4.png': { industry: 'house', quality: 'q4', baseProduction: 0.025, rawCost: 80 },
        'house_q5.png': { industry: 'house', quality: 'q5', baseProduction: 0.0166666666666667, rawCost: 120 },
        'house_q6.png': { industry: 'house', quality: 'q6', baseProduction: 0.0083333333333333, rawCost: 120 },
        'house_q7.png': { industry: 'house', quality: 'q7', baseProduction: 0.0041666666666667, rawCost: 120 }
    };

    // State
    const AppState = {
        companiesArr: [],
        filteredArr: [],
        employeesArr: [],
        employeeOverview: {},
        holdingsMap: {},
        pageDetails: {},
        energyData: {},
        csrfToken: '',
        activeTab: 'companies',
        filters: {
            holding: 'all',
            industry: 'all',
            quality: 'all',
            productivity: 0
        },
        virtualList: null,
        employeeList: null,
        syncSettings: {
            csrf: { auto: true },
            infrastructure: { auto: true },
            workforce: { auto: true },
            storage: { auto: false },
            energy: { auto: true }
        },
        syncMeta: {
            lastDay: 0,
            timestamps: {}
        }
    };

    // ==========================================
    // 2. DATABASE LAYER (IndexedDB)
    // ==========================================
    const dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('gameData')) {
                db.createObjectStore('gameData');
            }
        };
        request.onsuccess = function (event) { resolve(event.target.result); };
        request.onerror = function (event) { reject(event.target.errorCode); };
    });

    async function setDbValue(key, value) {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction('gameData', 'readwrite');
            const store = tx.objectStore('gameData');
            store.put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function getDbValue(key) {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction('gameData', 'readonly');
            const store = tx.objectStore('gameData');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ==========================================
    // 3. VIRTUAL LIST COMPONENT
    // ==========================================
    class VirtualList {
        constructor(containerId, rowHeight, renderRowFn) {
            this.container = document.getElementById(containerId);
            this.rowHeight = rowHeight;
            this.renderRowFn = renderRowFn;
            this.items = [];

            // Setup DOM structure
            this.container.style.overflowY = 'auto';
            this.container.style.position = 'relative';

            this.scroller = document.createElement('div');
            this.container.appendChild(this.scroller);

            this.content = document.createElement('div');
            this.content.style.position = 'absolute';
            this.content.style.top = '0';
            this.content.style.left = '0';
            this.content.style.width = '100%';
            this.container.appendChild(this.content);

            this.container.addEventListener('scroll', () => this.render());
        }

        setItems(items) {
            this.items = items;
            this.scroller.style.height = (this.items.length * this.rowHeight) + 'px';
            this.container.scrollTop = 0;
            this.render();
        }

        render() {
            const scrollTop = this.container.scrollTop;
            const viewportHeight = this.container.clientHeight;

            const startIdx = Math.floor(scrollTop / this.rowHeight);
            const visibleNodesCount = Math.ceil(viewportHeight / this.rowHeight);

            const buffer = 5;
            const firstNode = Math.max(0, startIdx - buffer);
            const lastNode = Math.min(this.items.length - 1, startIdx + visibleNodesCount + buffer);

            this.content.style.transform = `translateY(${firstNode * this.rowHeight}px)`;

            // Build HTML
            let html = '<table class="company-table"><tbody>';
            for (let i = firstNode; i <= lastNode; i++) {
                html += this.renderRowFn(this.items[i]);
            }
            html += '</tbody></table>';

            this.content.innerHTML = html;
        }
    }

    // ==========================================
    // 4. API HELPER
    // ==========================================
    async function apiPost(url, payload) {
        console.log(`[API POST Request] URL: ${url}`, payload);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                data: payload,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
                onload: function (r) {
                    console.log(`[API POST Response] URL: ${url} Status: ${r.status}`, r.responseText);
                    (r.status >= 200 && r.status < 300) ? resolve(r.responseText) : reject('Fail: ' + r.status);
                },
                onerror: function (err) {
                    console.error(`[API POST Error] URL: ${url}`, err);
                    reject('Network error.');
                }
            });
        });
    }

    const sleep = ms => new Promise(res => setTimeout(res, ms));

    // ==========================================
    // 5. CORE LOGIC & UI BUILDER
    // ==========================================
    async function initCustomManager() {
        if (!window.location.pathname.startsWith(CUSTOM_URL)) return;

        document.title = "Custom Company Manager";
        document.body.innerHTML = '';
        document.head.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap');
                :root {
                    --surface: #121416;
                    --surface-container-lowest: #0c0e10;
                    --surface-container-low: #1a1c1e;
                    --surface-container: #232527;
                    --surface-container-high: #282a2c;
                    --surface-container-highest: #333537;
                    --surface-bright: #38393c;
                    --primary: #fabd00;
                    --on-primary-container: #c09000;
                    --on-primary-fixed: #261a00;
                    --secondary: #b4cad6;
                    --outline: #454652;
                    --text-main: #f8fafc;
                    --on-surface-variant: #c6c5d4;
                    --success-container: #00390a;
                    --success-text: #48ab4d;
                    --danger-container: #93000a;
                    --danger-text: #ffdad6;
                    --spacing-1: 5px;
                    --spacing-2: 10px;
                }
                body {
                    background: url('https://www.erepublik.net/images/modules/myland/bg_pattern.png') var(--surface) !important;
                    background-blend-mode: overlay !important;
                    color: var(--text-main) !important;
                    font-family: 'Inter', system-ui, sans-serif !important;
                    margin: 0 !important;
                    padding: 20px !important;
                }
                #app { max-width: 1400px; margin: 0 auto; }
                
                h1, h2, h3, h4 { font-family: 'Space Grotesk', sans-serif; }
                h1 { margin: 0; font-size: 24px; color: #fff; text-shadow: 0 0 10px rgba(250, 189, 0, 0.2); }
                h3 { margin-top: 0; margin-bottom: 15px; font-weight: 500; font-size: 16px; color: var(--text-main); }
                
                .header {
                    display: flex; justify-content: space-between; align-items: center;
                    border-bottom: 2px solid rgba(69, 70, 82, 0.15);
                    padding-bottom: 20px; margin-bottom: 20px;
                }
                
                .btn {
                    background: linear-gradient(135deg, var(--primary), var(--on-primary-container));
                    color: var(--on-primary-fixed); border: none; padding: 10px 20px;
                    border-radius: 0.125rem; cursor: pointer; font-weight: 600; font-size: 14px;
                    font-family: 'Inter', sans-serif;
                    transition: transform 0.2s, opacity 0.2s, box-shadow 0.2s;
                    box-shadow: 0 4px 15px rgba(250, 189, 0, 0.15);
                }
                .btn:hover:not(:disabled) { 
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(250, 189, 0, 0.3);
                }
                .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
                
                .btn-secondary {
                    background: transparent;
                    border: 1px solid rgba(69, 70, 82, 0.2);
                    color: var(--secondary);
                    box-shadow: none;
                }
                .btn-secondary:hover:not(:disabled) {
                    border-color: var(--outline);
                    background: rgba(69, 70, 82, 0.1);
                    transform: translateY(0);
                }

                .layout { display: grid; grid-template-columns: 320px 1fr; gap: 20px; height: calc(100vh - 120px); }
                
                .panel { 
                    background: rgba(12, 14, 16, 0.85);
                    backdrop-filter: blur(12px);
                    padding: 20px; border-radius: 0.25rem; 
                    display: flex; flex-direction: column;
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(250, 189, 0, 0.04);
                }
                
                .form-group { margin-bottom: var(--spacing-2); }
                .form-group label { display: block; margin-bottom: var(--spacing-1); font-size: 0.75rem; color: var(--on-surface-variant); font-weight: 500; }
                .form-control {
                    width: 100%; padding: 8px 12px; background: var(--surface-container-highest); 
                    border: none; border-bottom: 2px solid transparent;
                    color: #fff; border-radius: 2px 2px 0 0; box-sizing: border-box; font-size: 0.75rem;
                    transition: border-bottom-color 0.2s;
                }
                .form-control:focus { outline: none; border-bottom-color: var(--primary); }
                
                #list-container, #employee-list-container { flex: 1; min-height: 0; background: transparent; }
                #tab-companies, #tab-employees { flex: 1; display: flex; flex-direction: column; min-height: 0; }
                
                .company-table { width: 100%; border-collapse: separate; border-spacing: 0 var(--spacing-1); table-layout: fixed; }
                .company-table th, .company-table td { 
                    text-align: left; padding: 10px 15px; 
                    text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 0.75rem;
                }
                .company-table td { height: 40px; box-sizing: border-box; background: var(--surface-container-low); }
                .company-table tbody tr:hover td { background: var(--surface-bright); }
                
                .header-row { display: flex; background: var(--surface-container-highest); font-weight: 600; font-size: 0.75rem; padding-right: 15px; border-radius: 0.125rem;}
                .header-row div { padding: 10px 15px; text-align: left; overflow: hidden; white-space: nowrap; color: var(--on-surface-variant); font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.5px; text-transform: uppercase; font-size: 0.6875rem; }
                
                .tabs {
                    display: flex; gap: 10px; margin-bottom: 20px;
                    border-bottom: 1px solid var(--outline);
                }
                .tab {
                    padding: 10px 20px; cursor: pointer; font-family: 'Space Grotesk', sans-serif;
                    font-size: 0.875rem; font-weight: 500; color: var(--on-surface-variant);
                    border-bottom: 2px solid transparent; transition: all 0.2s;
                }
                .tab:hover { color: #fff; background: rgba(255,255,255,0.05); }
                .tab.active { color: var(--primary); border-bottom-color: var(--primary); }

                /* Settings Panel */
                .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
                .settings-card { 
                    background: var(--surface-container-low); border-radius: 4px; padding: 20px; 
                    border: 1px solid var(--outline); display: flex; flex-direction: column; gap: 15px;
                }
                .settings-card h4 { margin: 0; color: var(--primary); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 1px; }
                .settings-card .meta { font-size: 0.75rem; color: var(--on-surface-variant); }
                .settings-card .actions { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }

                .summary-bar {
                    display: flex; gap: 30px; background: var(--surface-container-low);
                    padding: 15px 20px; border-radius: 0.25rem; margin-bottom: 20px;
                    border-left: 4px solid var(--primary);
                }
                .summary-item { display: flex; flex-direction: column; gap: 4px; }
                .summary-item .label { font-size: 0.6875rem; text-transform: uppercase; color: var(--on-surface-variant); font-weight: 600; }
                .summary-item .value { font-size: 1.125rem; font-weight: 700; color: #fff; }

                .presence-dot {
                    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
                    margin-right: 4px;
                }
                .dot-worked { background: var(--success-text); box-shadow: 0 0 5px var(--success-text); }
                .dot-missed { background: var(--danger-container); box-shadow: 0 0 5px var(--danger-container); }
                .dot-pending { background: var(--outline); box-shadow: 0 0 5px var(--outline); }

                #toast-container {
                    position: fixed; bottom: 20px; right: 20px;
                    display: flex; flex-direction: column; gap: 10px; z-index: 10000;
                }
                .toast {
                    background: rgba(12, 14, 16, 0.95); backdrop-filter: blur(8px);
                    color: #fff; padding: 12px 20px; border-radius: 4px;
                    border-left: 4px solid var(--primary);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                    font-size: 0.8125rem; min-width: 250px;
                    display: flex; justify-content: space-between; align-items: center;
                    animation: toast-in 0.3s ease-out;
                }
                .toast.error { border-left-color: #ffdad6; }
                .toast.success { border-left-color: #48ab4d; }
                @keyframes toast-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .toast.fade-out {
                    opacity: 0; transform: translateX(100%);
                    transition: opacity 0.3s, transform 0.3s;
                }

                .col-name { width: 35%; }
                .col-q { width: 10%; }
                .col-emp { width: 15%; }
                .col-hold { width: 25%; }
                .col-stat { width: 15%; }
                
                .summary { font-size: 0.75rem; color: var(--on-surface-variant); margin-bottom: 15px; line-height: 1.4; }
                
                .status-chip {
                    display: inline-block; padding: 2px 8px; border-radius: 0.125rem; font-size: 0.6875rem; font-weight: 600;
                }
                .chip-success { background: var(--success-container); color: var(--success-text); }
                .chip-danger { background: var(--danger-container); color: var(--danger-text); }
                
                .info-tooltip {
                    position: relative; display: inline-block; cursor: help;
                    margin-left: 5px; color: var(--secondary);
                }
                .info-tooltip:hover::after {
                    content: attr(data-tip);
                    position: absolute; bottom: 125%; left: 50%; transform: translateX(-50%);
                    background: var(--surface-container-highest); color: #fff;
                    padding: 8px 12px; border-radius: 4px; font-size: 0.6875rem;
                    width: 200px; white-space: normal; z-index: 100;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                    border: 1px solid var(--outline);
                }

                hr { border: none; border-bottom: 2px solid rgba(69, 70, 82, 0.15); margin: 20px 0; }
            </style>
        `;

        document.body.innerHTML = `
            <div id="app">
                <div id="toast-container"></div>
                <div class="header">
                    <h1>Custom Company Manager</h1>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span id="energy-display" style="font-weight: bold; color: var(--primary);">Energy: --</span>
                        <button id="btn-sync" class="btn">Full System Sync</button>
                    </div>
                </div>
                <div class="layout">
                    <div class="panel">
                        <h3 style="margin-top:0">Filters</h3>
                        
                        <div class="form-group">
                            <label>Holding</label>
                            <select id="filter-holding" class="form-control">
                                <option value="all">All Holdings (incl. Unassigned)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Industry</label>
                            <select id="filter-industry" class="form-control">
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
                        </div>
                        <div class="form-group">
                            <label>Quality</label>
                            <select id="filter-quality" class="form-control">
                                <option value="all">All Qualities</option>
                                <option value="1">Q1</option>
                                <option value="2">Q2</option>
                                <option value="3">Q3</option>
                                <option value="4">Q4</option>
                                <option value="5">Q5</option>
                                <option value="6">Q6</option>
                                <option value="7">Q7</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="display:flex; justify-content:space-between; align-items:center;">
                                <span>Productivity ≥</span>
                                <div style="display:flex; align-items:center; gap:2px;">
                                    <input type="number" id="filter-prod-num" value="0" min="0" max="300" 
                                           style="width:50px; background:transparent; border:none; border-bottom:1px solid var(--outline); color:var(--primary); font-weight:bold; text-align:right; font-size:0.75rem; padding:0;" />
                                    <span style="color:var(--on-surface-variant); font-size:0.75rem;">%</span>
                                </div>
                            </label>
                            <input type="range" id="filter-prod" min="0" max="300" step="1" value="0" style="width:100%; accent-color:var(--primary); background:var(--surface-container-highest);">
                        </div>

                        <hr style="border-color: var(--border); margin: 20px 0;" />

                        <h3 style="margin-top:0">Mass Actions</h3>
                        <p class="summary" id="action-summary">Select a specific holding to enable Work as Manager.</p>
                        <div style="display:flex; align-items:center; gap:15px; margin-bottom:10px;">
                            <button id="btn-wam" class="btn" disabled>Work as Manager in Holding</button>
                            <div style="display:flex; flex-direction:column; gap:5px;">
                                <label style="display:flex; align-items:center; gap:5px; font-size:0.6875rem; color:var(--on-surface-variant); cursor:pointer;">
                                    <input type="checkbox" id="chk-travel-holding" checked> Auto-Travel to Holding
                                </label>
                                <label style="display:flex; align-items:center; gap:5px; font-size:0.6875rem; color:var(--on-surface-variant); cursor:pointer;">
                                    <input type="checkbox" id="chk-travel-home" checked> Return Home Afterwards
                                </label>
                            </div>
                        </div>
                        
                        <hr style="border-color: var(--border); margin: 20px 0;" />
                        <h3 style="margin-top:0">Employee Assignment</h3>
                        <p class="summary" id="assign-summary">Filter above to find target companies.</p>
                        <div class="form-group" style="display:flex; gap:10px; align-items:flex-end;">
                            <div style="flex:1;">
                                <label>Employees to Assign</label>
                                <input type="number" id="emp-amount" class="form-control" value="0" min="0" />
                            </div>
                            <button id="btn-assign" class="btn" disabled>Assign & Work</button>
                        </div>
                        
                        <hr style="border-color: var(--border); margin: 20px 0;" />
                        <h3 style="margin-top:0">Mass Company Upgrade <span class="info-tooltip" data-tip="Requires a specific Holding, Non-Raw Industry, and Quality level to be selected.">ⓘ</span></h3>
                        <p class="summary" id="upgrade-summary">Filter by industry to enable.</p>
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <div style="flex:1;">
                                <label style="font-size:0.6875rem; color:var(--on-surface-variant);">Target Q</label>
                                <select id="upgrade-target-q" class="form-control">
                                    <option value="2">Q2</option>
                                    <option value="3">Q3</option>
                                    <option value="4">Q4</option>
                                    <option value="5">Q5</option>
                                    <option value="6">Q6</option>
                                    <option value="7">Q7</option>
                                </select>
                            </div>
                            <div style="flex:1;">
                                <label style="font-size:0.6875rem; color:var(--on-surface-variant);">Amount</label>
                                <input type="number" id="upgrade-amount" class="form-control" value="1" min="1" />
                            </div>
                        </div>
                        <button id="btn-mass-upgrade" class="btn" style="width:100%;" disabled>Upgrade Selected</button>

                        <hr />
                        <h3 style="margin-top:0">Personal Work</h3>
                        <p class="summary" id="personal-work-summary">Checking status...</p>
                        <div style="display:flex; gap:10px;">
                            <button id="btn-work-emp" class="btn" disabled style="flex:1; padding: 10px 5px; font-size: 0.75rem;">Work</button>
                            <button id="btn-work-ot" class="btn btn-secondary" disabled style="flex:1; padding: 10px 5px; font-size: 0.75rem;">Overtime</button>
                        </div>
                    </div>
                    
                    <div class="panel" style="padding-bottom: 0;">
                        <div class="tabs">
                            <div class="tab active" data-tab="companies">Inventory & Production</div>
                            <div class="tab" data-tab="employees">Workforce Intelligence</div>
                            <div class="tab" data-tab="settings">Command Center</div>
                        </div>

                        <div id="tab-companies" style="display:flex; flex-direction:column; flex:1; min-height:0;">
                            <h3 style="margin-top:0">Holdings Summary (<span id="count-display">0</span> Companies)</h3>
                            <div class="header-row">
                                <div class="col-name">Industry</div>
                                <div class="col-q">Quality</div>
                                <div class="col-emp">Employees</div>
                                <div class="col-hold">Holding</div>
                                <div class="col-stat">Status</div>
                            </div>
                            <div id="list-container"></div>
                        </div>

                        <div id="tab-employees" style="display:none; flex-direction:column; flex:1; min-height:0;">
                            <div class="summary-bar" id="workforce-summary">
                                <div class="summary-item">
                                    <span class="label">Total Workforce</span>
                                    <span class="value" id="wf-total">--</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Worked Today</span>
                                    <span class="value" id="wf-worked">--</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Avg. Salary (7d)</span>
                                    <span class="value" id="wf-avg-salary">--</span>
                                </div>
                            </div>
                            <h3 style="margin-top:0">Employee Intelligence (<span id="emp-count-display">0</span> Operatives)</h3>
                            <div class="header-row">
                                <div class="col-name">Operative</div>
                                <div class="col-q" style="width:20%">Presence (7d)</div>
                                <div class="col-emp" style="width:20%">Salary</div>
                                <div class="col-hold" style="width:25%">Total Paid (7d)</div>
                            </div>
                            <div id="employee-list-container"></div>
                        </div>

                        <div id="tab-settings" style="display:none; flex-direction:column; flex:1; min-height:0;">
                            <h3 style="margin-top:0">System Synchronization</h3>
                            <div class="settings-grid" id="settings-container"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 2. Initialize Virtual Components
        AppState.virtualList = new VirtualList('list-container', 40, renderCompanyRow);
        AppState.employeeList = new VirtualList('employee-list-container', 48, renderEmployeeRow);

        // 3. Bind Event Listeners
        document.getElementById('btn-sync').addEventListener('click', performGoldenLoad);
        document.getElementById('filter-holding').addEventListener('change', e => { AppState.filters.holding = e.target.value; applyFilters(); });
        document.getElementById('filter-industry').addEventListener('change', e => { AppState.filters.industry = e.target.value; applyFilters(); });
        document.getElementById('filter-quality').addEventListener('change', e => { AppState.filters.quality = e.target.value; applyFilters(); });

        const prodSlider = document.getElementById('filter-prod');
        const prodNum = document.getElementById('filter-prod-num');

        const updateProd = (val) => {
            val = Math.max(0, Math.min(300, parseInt(val) || 0));
            AppState.filters.productivity = val;
            prodSlider.value = val;
            prodNum.value = val;
            applyFilters();
        };

        prodSlider.addEventListener('input', e => updateProd(e.target.value));
        prodNum.addEventListener('input', e => updateProd(e.target.value));

        document.getElementById('btn-wam').addEventListener('click', performMassWam);
        document.getElementById('btn-assign').addEventListener('click', performEmployeeAssignment);
        document.getElementById('emp-amount').addEventListener('input', updateActionUI);

        document.getElementById('upgrade-target-q').addEventListener('change', updateActionUI);        document.getElementById('upgrade-amount').addEventListener('input', updateActionUI);

        document.getElementById('btn-mass-upgrade').addEventListener('click', performMassUpgrade);
        document.getElementById('btn-work-emp').addEventListener('click', performEmployeeWork);
        document.getElementById('btn-work-ot').addEventListener('click', performOvertimeWork);

        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(t => {
            t.addEventListener('click', () => {
                tabs.forEach(x => x.classList.remove('active'));
                t.classList.add('active');
                AppState.activeTab = t.dataset.tab;

                document.getElementById('tab-companies').style.display = (AppState.activeTab === "companies") ? "flex" : "none";
                document.getElementById('tab-employees').style.display = (AppState.activeTab === "employees") ? "flex" : "none";
                document.getElementById('tab-settings').style.display = (AppState.activeTab === "settings") ? "flex" : "none";

                if (AppState.activeTab === "employees") renderEmployeeTab();
                if (AppState.activeTab === "settings") renderSettingsTab();
            });
        });

        // 4. Initial Data Load & Auto-Sync
        await loadDataFromDb();

        const autoSync = async () => {
            if (AppState.syncSettings.csrf.auto) await syncCsrf(true);
            if (AppState.syncSettings.infrastructure.auto) await syncInfrastructure(true);
            if (AppState.syncSettings.workforce.auto) await syncWorkforce(true);
            if (AppState.syncSettings.storage.auto) await syncStorage(true);
            if (AppState.syncSettings.energy.auto) await syncEnergy();
        };
        autoSync();
    }

    // ==========================================
    // 6. DATA LOADING & FILTERING
    // ==========================================
    async function loadDataFromDb() {
        const companies = await getDbValue('companies') || {};
        const holdings = await getDbValue('holdingCompanies') || {};
        AppState.employeesArr = await getDbValue('employees') || [];
        AppState.employeeOverview = await getDbValue('employeeOverview') || {};
        AppState.pageDetails = await getDbValue('pageDetails') || {};
        AppState.energyData = await getDbValue('energyData') || { energy: 0 };
        AppState.csrfToken = await getDbValue('csrfToken') || '';
        AppState.syncMeta = await getDbValue('syncMeta') || { lastDay: 0, timestamps: {} };
        AppState.syncSettings = await getDbValue('syncSettings') || {
            csrf: { auto: true },
            infrastructure: { auto: true },
            workforce: { auto: true },
            storage: { auto: false },
            energy: { auto: true }
        };
        // Ensure migration for existing users
        if (!AppState.syncSettings.energy) AppState.syncSettings.energy = { auto: true };

        AppState.companiesArr = Object.values(companies);
        AppState.holdingsMap = holdings;

        // Populate Holding dropdown
        const holdingSelect = document.getElementById('filter-holding');
        if (holdingSelect) {
            holdingSelect.innerHTML = '<option value="all">All Holdings (incl. Unassigned)</option><option value="unassigned">Unassigned Only</option>';
            Object.values(holdings).forEach(h => {
                holdingSelect.innerHTML += `<option value="${h.id}">${h.name}</option>`;
            });
        }

        // Update Energy UI
        const energyDisp = document.getElementById('energy-display');
        if (energyDisp) energyDisp.textContent = `Energy: ${AppState.energyData.energy || '--'}`;

        applyFilters();
        updateWorkforceSummary();
    }

    function applyFilters() {
        const { holding, industry, quality, productivity } = AppState.filters;

        AppState.filteredArr = AppState.companiesArr.filter(c => {
            let fname = '';
            if (c.building_img) fname = c.building_img.split('/').pop();

            let calcInd = c.industry_name || 'unknown';
            let calcQual = c.quality || '1';

            if (companyDefinitions[fname]) {
                calcInd = companyDefinitions[fname].industry;
                calcQual = companyDefinitions[fname].quality.replace('q', '');
            }

            // Bind calculations for easier rendering
            c.calculated_industry = calcInd;
            c.calculated_quality = calcQual;

            let passHolding = true;
            if (holding === 'unassigned') passHolding = (c.holding_company_id === false);
            else if (holding !== 'all') passHolding = (c.holding_company_id == holding);

            let passInd = (industry === 'all') || (calcInd === industry);
            let passQ = (quality === 'all') || (calcQual == quality);
            let passProd = (parseFloat(c.effective_bonus) || 100) >= productivity;

            return passHolding && passInd && passQ && passProd;
        });

        document.getElementById('count-display').textContent = AppState.filteredArr.length;

        // Grouping Logic for Data Table
        const grouped = {};
        AppState.filteredArr.forEach(c => {
            const hId = c.holding_company_id || 'unassigned';
            const ind = c.calculated_industry || 'unknown';
            const q = c.calculated_quality || '1';
            const key = `${hId}_${ind}_${q}`;

            if (!grouped[key]) {
                const holdingName = hId !== 'unassigned' && AppState.holdingsMap[hId]
                    ? AppState.holdingsMap[hId].name : 'Unassigned';
                grouped[key] = {
                    key: key,
                    holding_name: holdingName,
                    industry: ind,
                    quality: q,
                    count: 0,
                    worked: 0,
                    pending: 0,
                    empSlots: 0,
                    empWorked: 0,
                    productivity: c.effective_bonus || 100
                };
            }
            grouped[key].count++;
            if (c.already_worked) grouped[key].worked++;
            else grouped[key].pending++;

            if (c.can_assign_employees) {
                grouped[key].empSlots += parseInt(c.employee_limit || 0);
                grouped[key].empWorked += parseInt(c.todays_works || 0);
            }
        });

        const aggregatedArr = Object.values(grouped).sort((a, b) => {
            if (a.holding_name < b.holding_name) return -1;
            if (a.holding_name > b.holding_name) return 1;
            if (a.industry < b.industry) return -1;
            if (a.industry > b.industry) return 1;
            return a.quality - b.quality;
        });

        AppState.virtualList.setItems(aggregatedArr);

        updateActionUI();
    }

    function updateWorkforceSummary() {
        if (!AppState.employeesArr.length) return;

        let totalWorksAll = 0;
        let totalPaidAll = 0;
        let workedToday = 0;

        AppState.employeesArr.forEach(emp => {
            totalWorksAll += (emp.totalWorks || 0);
            totalPaidAll += (emp.totalSalary || 0);

            // Last element in workHistory corresponds to today's day number
            const history = emp.workHistory || [];
            if (history.length > 0 && history[history.length - 1] > 0) {
                workedToday++;
            }
        });

        // 7d Effective Average = Total Paid / Total Works (across all employees)
        const avgSalary = totalWorksAll > 0 ? (totalPaidAll / totalWorksAll).toFixed(2) : '0.00';
        const currency = AppState.employeeOverview.currency || '';

        const wfTotal = document.getElementById('wf-total');
        const wfWorked = document.getElementById('wf-worked');
        const wfAvgSalary = document.getElementById('wf-avg-salary');

        if (wfTotal) wfTotal.textContent = AppState.employeesArr.length;
        if (wfWorked) wfWorked.textContent = workedToday;
        if (wfAvgSalary) wfAvgSalary.textContent = `${parseFloat(avgSalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    }

    function renderEmployeeTab() {
        document.getElementById('emp-count-display').textContent = AppState.employeesArr.length;
        AppState.employeeList.setItems(AppState.employeesArr);
    }

    function renderSettingsTab() {
        const container = document.getElementById('settings-container');
        if (!container) return;

        const modules = [
            { id: 'csrf', title: 'Access Credentials', desc: 'CSRF security token for game actions.' },
            { id: 'infrastructure', title: 'Industry & Assets', desc: 'Holdings, factories, and resource bonuses.' },
            { id: 'workforce', title: 'Personnel Intelligence', desc: 'Employee records and work history.' },
            { id: 'storage', title: 'Inventory & Logistics', desc: 'Resource levels, items, and currencies.' },
            { id: 'energy', title: 'Vitality Intelligence', desc: 'Energy levels, pool limits, and recovery status.' }
        ];

        container.innerHTML = modules.map(m => {
            const lastSync = AppState.syncMeta.timestamps[m.id];
            const timeStr = lastSync ? new Date(lastSync).toLocaleString() : 'Never';
            const auto = AppState.syncSettings[m.id].auto;

            return `
                <div class="settings-card">
                    <h4>${m.title}</h4>
                    <span class="meta">${m.desc}</span>
                    <div class="meta" style="margin-top:5px;">Last Sync: <strong>${timeStr}</strong></div>
                    <div class="actions">
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.75rem;">
                            <input type="checkbox" data-sync-id="${m.id}" class="auto-sync-toggle" ${auto ? 'checked' : ''}> Auto-Sync
                        </label>
                        <button class="btn btn-secondary sync-trigger" data-sync-id="${m.id}" style="padding: 5px 12px; font-size: 0.6875rem;">Sync Now</button>
                    </div>
                </div>
            `;
        }).join('');

        // Bind settings events
        container.querySelectorAll('.auto-sync-toggle').forEach(el => {
            el.addEventListener('change', async (e) => {
                const id = e.target.dataset.syncId;
                AppState.syncSettings[id].auto = e.target.checked;
                await setDbValue('syncSettings', AppState.syncSettings);
            });
        });

        container.querySelectorAll('.sync-trigger').forEach(el => {
            el.addEventListener('click', async (e) => {
                const id = e.target.dataset.syncId;
                el.disabled = true;
                el.textContent = 'Syncing...';
                if (id === 'csrf') await syncCsrf();
                else if (id === 'infrastructure') await syncInfrastructure();
                else if (id === 'workforce') await syncWorkforce();
                else if (id === 'storage') await syncStorage();
                else if (id === 'energy') await syncEnergy();
                el.disabled = false;
                el.textContent = 'Sync Now';
            });
        });
    }

    function renderEmployeeRow(emp) {
        const history = emp.workHistory || [0, 0, 0, 0, 0, 0, 0];
        let presenceHtml = '<div style="display:flex; align-items:center;">';
        history.forEach(h => {
            let statusClass = 'dot-missed';
            if (h > 0) statusClass = 'dot-worked';
            else if (h === 0) statusClass = 'dot-pending';

            presenceHtml += `<span class="presence-dot ${statusClass}" title="${h === -1 ? 'Missed' : h + ' works'}"></span>`;
        });
        presenceHtml += '</div>';

        const currency = AppState.employeeOverview.currency || '';

        return `<tr>
            <td class="col-name" style="height:48px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${emp.avatar}" style="width:28px; height:28px; border-radius:50%; border: 1px solid var(--outline);">
                    <div style="display:flex; flex-direction:column;">
                        <strong style="color:var(--text-main)">${emp.name}</strong>
                        <span style="font-size:0.625rem; color:var(--on-surface-variant)">Since day ${emp.hiredOn}</span>
                    </div>
                </div>
            </td>
            <td class="col-q" style="width:20%; height:48px;">${presenceHtml}</td>
            <td class="col-emp" style="width:20%; height:48px;">${parseFloat(emp.salary).toLocaleString()} ${currency}</td>
            <td class="col-hold" style="width:25%; height:48px;">${emp.totalSalary.toLocaleString()} ${currency}</td>
        </tr>`;
    }

    function formatIndustryName(indId) {
        if (!indId) return 'Unknown';
        return indId.replace('_raw', ' Raw').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function renderCompanyRow(comp) {
        let statusStr = '';
        const isWammable = !['house', 'house_raw', 'aircraft', 'aircraft_raw'].includes(comp.industry);

        if (comp.worked > 0) statusStr += `<span class="status-chip chip-success" style="margin-right:2px">${comp.worked} Worked</span>`;
        if (comp.pending > 0 && isWammable) {
            statusStr += `<span class="status-chip chip-danger">${comp.pending} Pending</span>`;
        } else if (!isWammable) {
            statusStr += `<span class="status-chip" style="background:var(--surface-variant); color:var(--on-surface-variant)">Not WAM-able</span>`;
        }

        let empStr = '';
        if (comp.empSlots > 0) {
            const hasSim = comp.empSim > 0;
            const simText = hasSim ? `(${comp.empSim})` : '';
            const isFull = (comp.empWorked + (comp.empSim || 0)) === comp.empSlots;
            const chipClass = isFull ? 'chip-success' : 'chip-danger';
            const extraStyle = (!isFull && !hasSim) ? 'background:var(--warning); color:#fff; border-color:var(--warning);' : '';

            empStr = `<span class="status-chip ${chipClass}" style="padding: 2px 4px; font-size: 0.65rem; ${extraStyle}">${comp.empWorked}${simText}/${comp.empSlots} Emp</span>`;
        } else {
            empStr = `<span style="color:var(--on-surface-variant); font-size:0.65rem;">N/A</span>`;
        }

        return `<tr>
            <td class="col-name">
                <div style="display:flex; flex-direction:column; justify-content:center;">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <strong style="color:var(--text-main)">${formatIndustryName(comp.industry)}</strong>
                        <span style="color:var(--on-surface-variant)">x${comp.count}</span>
                    </div>
                    <span style="font-size:0.625rem; color:var(--secondary); font-weight:500;">Productivity: ${parseFloat(comp.productivity).toFixed(2)}%</span>
                </div>
            </td>
            <td class="col-q">Q${comp.quality}</td>
            <td class="col-emp">${empStr}</td>
            <td class="col-hold">${comp.holding_name}</td>
            <td class="col-stat">${statusStr}</td>
        </tr>`;
    }

    function updateActionUI() {
        const btnWam = document.getElementById('btn-wam');
        const summary = document.getElementById('action-summary');
        const btnAssign = document.getElementById('btn-assign');
        const assignSummary = document.getElementById('assign-summary');
        const empAmount = document.getElementById('emp-amount');
        const btnUpgrade = document.getElementById('btn-mass-upgrade');
        const upgradeSummary = document.getElementById('upgrade-summary');

        const { holding, industry } = AppState.filters;
        if (holding === 'all' || holding === 'unassigned') {
            btnWam.disabled = true;
            summary.textContent = 'Select a specific holding to enable Work as Manager.';
        } else {
            const pendingWam = AppState.filteredArr.filter(c => !c.already_worked && !['house', 'house_raw', 'aircraft', 'aircraft_raw'].includes(c.calculated_industry));

            if (pendingWam.length === 0) {
                btnWam.disabled = true;
                summary.textContent = 'No pending workable companies in this holding/filter combination.';
            } else {
                const energyRequired = pendingWam.length * 10;
                const hasEnergy = (AppState.energyData.energy >= energyRequired);

                // Production & Raw estimates for WAM (Quality-Aware)
                const breakdown = {};
                const rawNames = { food: 'FRM', weapon: 'WRM', house: 'HRM', aircraft: 'ARM' };
                const prodNames = { food: 'Food', weapon: 'Weapons', house: 'Houses', aircraft: 'Aircraft' };
                const rawProjected = {
                    FRM: { produced: 0, consumed: 0 },
                    WRM: { produced: 0, consumed: 0 },
                    HRM: { produced: 0, consumed: 0 },
                    ARM: { produced: 0, consumed: 0 }
                };

                pendingWam.forEach(c => {
                    const fname = c.building_img.split('/').pop();
                    const def = companyDefinitions[fname];
                    if (def && def.baseProduction) {
                        const amount = def.baseProduction * (parseFloat(c.effective_bonus) || 100) / 100;
                        const industry = def.industry;
                        const isRaw = industry.endsWith('_raw');
                        
                        if (isRaw) {
                            const rawType = rawNames[industry.replace('_raw', '')];
                            rawProjected[rawType].produced += amount;
                            if (!breakdown[industry]) breakdown[industry] = { prod: 0, cons: 0, label: rawType, rawType };
                            breakdown[industry].prod += amount;
                        } else {
                            const rawType = rawNames[industry];
                            const key = `${industry}_q${c.quality}`;
                            if (!breakdown[key]) breakdown[key] = { prod: 0, cons: 0, label: `Q${c.quality} ${prodNames[industry]}`, rawType };
                            breakdown[key].prod += amount;
                            if (def.rawCost) {
                                const cons = amount * def.rawCost;
                                breakdown[key].cons += cons;
                                rawProjected[rawType].consumed += cons;
                            }
                        }
                    }
                });

                let estimatesHtml = '';
                Object.values(breakdown).forEach(t => {
                    if (t.prod > 0) {
                        const consLine = t.cons > 0 ? ` (Uses ${t.cons.toFixed(2)} ${t.rawType})` : '';
                        estimatesHtml += `Est. ${t.label}: <strong>${t.prod.toFixed(2)}</strong>${consLine}<br>`;
                    }
                });

                // Delta Logic (Produced + Stock - Consumed)
                let deltaHtml = '';
                const stockMap = {
                    'FRM': AppState.pageDetails.food_raw_stock || 0,
                    'WRM': AppState.pageDetails.weapon_raw_stock || 0,
                    'HRM': AppState.pageDetails.house_raw_stock || 0,
                    'ARM': AppState.pageDetails.airplane_raw_stock || 0
                };

                Object.entries(rawProjected).forEach(([type, stats]) => {
                    if (stats.produced > 0 || stats.consumed > 0) {
                        const current = stockMap[type] || 0;
                        const final = current + stats.produced - stats.consumed;
                        const color = final >= 0 ? 'var(--success-text)' : 'var(--danger-text)';
                        deltaHtml += `<span style="font-size:0.65rem; color:var(--on-surface-variant)">${type} Balance: <strong style="color:${color}">${final.toFixed(2)}</strong></span><br>`;
                    }
                });

                summary.innerHTML = `Found <strong>${pendingWam.length}</strong> workable companies.<br>
                                     ${estimatesHtml}
                                     ${deltaHtml}
                                     Energy Required: <strong style="color: ${hasEnergy ? 'var(--success-text)' : 'var(--danger-text)'}">${energyRequired}</strong>
                                     ${!hasEnergy ? ' <span style="font-size:0.65rem; color:var(--on-surface-variant)">(Requires Energy Bars)</span>' : ''}`;

                btnWam.disabled = !AppState.csrfToken;
                if (!AppState.csrfToken) summary.innerHTML += '<br><span style="color:var(--danger-text)">No CSRF Token. Please Sync.</span>';
            }
        }

        // Employee Assignment UI
        let availableSlots = 0;
        let assignableCompanies = 0;
        const empAvailable = parseInt(AppState.pageDetails.total_works) || 0;
        const inputAmount = parseInt(empAmount.value) || 0;
        
        const empBreakdown = {};
        const rawNames = { food: 'FRM', weapon: 'WRM', house: 'HRM', aircraft: 'ARM' };
        const prodNames = { food: 'Food', weapon: 'Weapons', house: 'Houses', aircraft: 'Aircraft' };
        const rawProjectedEmp = {
            FRM: { produced: 0, consumed: 0 },
            WRM: { produced: 0, consumed: 0 },
            HRM: { produced: 0, consumed: 0 },
            ARM: { produced: 0, consumed: 0 }
        };

        let remainingToSimulate = inputAmount;
        const simAssignments = {}; // Track simulation per company ID

        AppState.filteredArr.forEach(c => {
            if (c.can_assign_employees) {
                const slots = parseInt(c.employee_limit || 0) - (parseInt(c.todays_works) || 0);
                if (slots > 0) {
                    availableSlots += slots;
                    assignableCompanies++;
                    
                    const assignToThisComp = Math.min(remainingToSimulate, slots);
                    if (assignToThisComp > 0) {
                        simAssignments[c.id] = assignToThisComp;
                        const fname = c.building_img.split('/').pop();
                        const def = companyDefinitions[fname];
                        if (def && def.baseProduction) {
                            const prodPerEmp = def.baseProduction * (parseFloat(c.effective_bonus) || 100) / 100;
                            const totalCompProd = prodPerEmp * assignToThisComp;
                            const industry = def.industry;
                            const isRaw = industry.endsWith('_raw');

                            if (isRaw) {
                                const rawType = rawNames[industry.replace('_raw', '')];
                                rawProjectedEmp[rawType].produced += totalCompProd;
                                if (!empBreakdown[industry]) empBreakdown[industry] = { prod: 0, cons: 0, label: rawType, rawType };
                                empBreakdown[industry].prod += totalCompProd;
                            } else {
                                const rawType = rawNames[industry];
                                const key = `${industry}_q${c.quality}`;
                                if (!empBreakdown[key]) empBreakdown[key] = { prod: 0, cons: 0, label: `Q${c.quality} ${prodNames[industry]}`, rawType };
                                empBreakdown[key].prod += totalCompProd;
                                if (def.rawCost) {
                                    const cons = totalCompProd * def.rawCost;
                                    empBreakdown[key].cons += cons;
                                    rawProjectedEmp[rawType].consumed += cons;
                                }
                            }
                        }
                        remainingToSimulate -= assignToThisComp;
                    }
                }
            }
        });

        // Map simulation back to grouped items for display
        if (AppState.virtualList && AppState.virtualList.items) {
            AppState.virtualList.items.forEach(group => {
                group.empSim = 0;
                AppState.filteredArr.forEach(c => {
                    const hId = c.holding_company_id || 'unassigned';
                    const ind = c.calculated_industry || 'unknown';
                    const q = c.calculated_quality || '1';
                    const key = `${hId}_${ind}_${q}`;
                    if (key === group.key && simAssignments[c.id]) {
                        group.empSim += simAssignments[c.id];
                    }
                });
            });
            AppState.virtualList.render();
        }

        let empEstimatesHtml = '';
        Object.values(empBreakdown).forEach(t => {
            if (t.prod > 0) {
                const consLine = t.cons > 0 ? ` (Uses ${t.cons.toFixed(2)} ${t.rawType})` : '';
                empEstimatesHtml += `Est. ${t.label}: <strong>${t.prod.toFixed(2)}</strong>${consLine}<br>`;
            }
        });

        let empDeltaHtml = '';
        const stockMap = {
            'FRM': AppState.pageDetails.food_raw_stock || 0,
            'WRM': AppState.pageDetails.weapon_raw_stock || 0,
            'HRM': AppState.pageDetails.house_raw_stock || 0,
            'ARM': AppState.pageDetails.airplane_raw_stock || 0
        };

        Object.entries(rawProjectedEmp).forEach(([type, stats]) => {
            if (stats.produced > 0 || stats.consumed > 0) {
                const current = stockMap[type] || 0;
                const final = current + stats.produced - stats.consumed;
                const color = final >= 0 ? 'var(--success-text)' : 'var(--danger-text)';
                empDeltaHtml += `<span style="font-size:0.65rem; color:var(--on-surface-variant)">${type} Balance: <strong style="color:${color}">${final.toFixed(2)}</strong></span><br>`;
            }
        });

        if (availableSlots > 0) {
            assignSummary.innerHTML = `<strong>${availableSlots}</strong> slots available across <strong>${assignableCompanies}</strong> companies.<br>
                                       ${empEstimatesHtml}
                                       ${empDeltaHtml}
                                       Employee available: <strong>${empAvailable}</strong>`;
            btnAssign.disabled = !AppState.csrfToken;
            empAmount.max = availableSlots;
        } else {
            assignSummary.innerHTML = `No available employee slots in this filter combination.<br>
                                       Employee available: <strong>${empAvailable}</strong>`;
            btnAssign.disabled = true;
        }

        // Mass Upgrade UI
        const isRaw = industry.endsWith('_raw');
        const upgradableIndustries = ['food', 'weapon', 'house', 'aircraft'];
        const canUpgradeIndustry = upgradableIndustries.includes(industry);
        const { quality } = AppState.filters;

        if (holding === 'all' || holding === 'unassigned') {
            btnUpgrade.disabled = true;
            upgradeSummary.textContent = 'Select a specific holding to enable mass upgrade.';
        } else if (industry === 'all') {
            btnUpgrade.disabled = true;
            upgradeSummary.textContent = 'Select a specific industry to enable mass upgrade.';
        } else if (isRaw || !canUpgradeIndustry) {
            btnUpgrade.disabled = true;
            upgradeSummary.textContent = 'Raw material companies cannot be upgraded.';
        } else if (quality === 'all') {
            btnUpgrade.disabled = true;
            upgradeSummary.textContent = 'Select a specific quality to enable mass upgrade.';
        } else {
            const targetQ = parseInt(document.getElementById('upgrade-target-q').value);
            const currentQ = parseInt(quality);

            if (currentQ >= targetQ) {
                btnUpgrade.disabled = true;
                upgradeSummary.textContent = `Target Q${targetQ} must be higher than current Q${currentQ}.`;
            } else {
                const upgradableSet = AppState.filteredArr.filter(c => c.quality === currentQ && c.upgrades && c.upgrades[targetQ]);

                if (upgradableSet.length === 0) {
                    btnUpgrade.disabled = true;
                    upgradeSummary.textContent = `No Q${currentQ} companies found in this filter that can reach Q${targetQ}.`;
                } else {
                    btnUpgrade.disabled = !AppState.csrfToken;
                    upgradeSummary.innerHTML = `Found <strong>${upgradableSet.length}</strong> companies (Q${currentQ} → Q${targetQ}).`;
                }
            }
        }
        // Personal Work UI
        const btnEmp = document.getElementById('btn-work-emp');
        const btnOt = document.getElementById('btn-work-ot');
        const pwSummary = document.getElementById('personal-work-summary');

        if (!AppState.pageDetails || !AppState.pageDetails.employee) {
            pwSummary.textContent = 'Employee data missing. Please sync.';
        } else {
            const isEmployed = !!AppState.pageDetails.employee.employer;
            if (!isEmployed) {
                pwSummary.textContent = 'You are not currently employed.';
            } else {
                const alreadyWorked = AppState.pageDetails.employee.alreadyWorked;
                const now = Math.floor(Date.now() / 1000);
                const nextOt = AppState.pageDetails.next_overtime_work || 0;

                let otCost = 10;
                let otText = '<span class="status-chip chip-success">Available (10 energy)</span>';
                if (now < nextOt) {
                    otCost = 100;
                    otText = `<span class="status-chip chip-danger">Cooldown (100 energy)</span>`;
                }

                const hasEmpEnergy = AppState.energyData.energy >= 10;
                const hasOtEnergy = AppState.energyData.energy >= otCost;

                let salaryText = `${AppState.pageDetails.employee.salary} ${AppState.pageDetails.employee.currency}`;
                pwSummary.innerHTML = `Salary: <strong style="color:var(--text-main)">${salaryText}</strong><br>Overtime: ${otText}`;

                btnEmp.disabled = alreadyWorked || !hasEmpEnergy || !AppState.csrfToken;
                btnEmp.textContent = alreadyWorked ? 'Already Worked' : 'Work';

                btnOt.disabled = !alreadyWorked || !hasOtEnergy || !AppState.csrfToken;
            }
        }
    }

    // ==========================================
    // 7. SYNCHRONIZATION SYSTEM
    // ==========================================
    async function syncCsrf(silent = false) {
        console.log('[Sync] Fetching CSRF Token...');
        try {
            const data = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://www.erepublik.com/en',
                    onload: r => {
                        console.log(`[Sync Response] CSRF Status: ${r.status}`);
                        (r.status >= 200 && r.status < 300) ? resolve(r.responseText) : reject(r.status);
                    },
                    onerror: () => reject('NetError')
                });
            });
            const csrfMatch = data.match(/var csrfToken\s*=\s*'([^']+)';/);
            if (csrfMatch) {
                AppState.csrfToken = csrfMatch[1];
                console.log(`[Sync] CSRF Token parsed: ${AppState.csrfToken.substring(0, 8)}...`);
                await setDbValue('csrfToken', AppState.csrfToken);
                updateSyncMeta('csrf');
                showToast('CSRF Token updated.', 'success');
                return true;
                }
                } catch (e) { 
                console.error('[Sync Error] CSRF:', e);
                showToast('CSRF Sync failed.', 'error'); 
                }        return false;
    }

    async function syncInfrastructure(silent = false) {
        console.log('[Sync] Fetching Infrastructure Data...');
        try {
            const data = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://www.erepublik.com/en/economy/myCompanies',
                    onload: r => {
                        console.log(`[Sync Response] Infrastructure Status: ${r.status}`);
                        (r.status >= 200 && r.status < 300) ? resolve(r.responseText) : reject(r.status);
                    },
                    onerror: () => reject('NetError')
                });
            });

            const companiesMatch = data.match(/var companies\s*=\s*(\{.*\});/);
            const holdingsMatch = data.match(/var holdingCompanies\s*=\s*(\{.*\});/);
            const energyMatch = data.match(/var energyData\s*=\s*(\{.*\});/);
            const pageMatch = data.match(/var pageDetails\s*=\s*(\{.*\});/);

            if (companiesMatch) {
                const companies = JSON.parse(companiesMatch[1]);
                const holdings = holdingsMatch ? JSON.parse(holdingsMatch[1]) : {};
                const energy = energyMatch ? JSON.parse(energyMatch[1]) : { energy: 0 };
                const pageDetails = pageMatch ? JSON.parse(pageMatch[1]) : {};

                console.log(`[Sync] Infrastructure Parsed: ${Object.keys(companies).length} companies, ${Object.keys(holdings).length} holdings.`);
                await setDbValue('companies', companies);
                await setDbValue('holdingCompanies', holdings);
                await setDbValue('energyData', energy);
                await setDbValue('pageDetails', pageDetails);

                updateSyncMeta('infrastructure');
                await loadDataFromDb();
                showToast(`Infrastructure synced: ${Object.keys(companies).length} companies.`, 'success');
                return true;
                }
                } catch (e) { 
                console.error('[Sync Error] Infrastructure:', e);
                showToast('Infrastructure Sync failed.', 'error'); 
                }        return false;
    }

    async function syncWorkforce(silent = false) {
        console.log('[Sync] Fetching Workforce Intelligence...');
        try {
            const empRes = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://www.erepublik.com/en/economy/manage-employees-json',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    onload: r => {
                        console.log(`[Sync Response] Workforce Status: ${r.status}`);
                        (r.status >= 200 && r.status < 300) ? resolve(r.responseText) : reject(r.status);
                    },
                    onerror: () => reject('NetError')
                });
            });
            const employeeData = JSON.parse(empRes);
            console.log(`[Sync] Workforce Parsed: ${employeeData.employees ? employeeData.employees.length : 0} operatives.`, employeeData);
            if (employeeData.employees) {
                await setDbValue('employees', employeeData.employees);
                await setDbValue('employeeOverview', employeeData.overview || {});

                const currentDay = employeeData.settings ? employeeData.settings.dayNumbers[employeeData.settings.dayNumbers.length - 1] : 0;
                if (currentDay > AppState.syncMeta.lastDay && AppState.syncMeta.lastDay > 0) {
                    await handleDayChange(currentDay);
                } else if (currentDay > 0) {
                    AppState.syncMeta.lastDay = currentDay;
                    await setDbValue('syncMeta', AppState.syncMeta);
                }

                updateSyncMeta('workforce');
                await loadDataFromDb();
                showToast(`Workforce synced: ${employeeData.employees.length} operatives.`, 'success');
                return true;
                }
                } catch (e) { 
                console.error('[Sync Error] Workforce:', e);
                showToast('Workforce Sync failed.', 'error'); 
                }        return false;
    }

    async function syncStorage(silent = false) {
        console.log('[Sync] Fetching Logistics/Inventory Data...');
        try {
            const invRes = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://www.erepublik.com/en/economy/inventory-json',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    onload: r => {
                        console.log(`[Sync Response] Logistics Status: ${r.status}`);
                        (r.status >= 200 && r.status < 300) ? resolve(r.responseText) : reject(r.status);
                    },
                    onerror: () => reject('NetError')
                });
            });
            const inventory = JSON.parse(invRes);
            console.log('[Sync] Logistics Parsed:', inventory);
            await setDbValue('inventory', inventory);
            updateSyncMeta('storage');
            showToast('Logistics (Storage) synced.', 'success');
            return true;
        } catch (e) { 
            console.error('[Sync Error] Logistics:', e);
            showToast('Logistics Sync failed.', 'error'); 
        }
        return false;
    }

    async function syncEnergy() {
        console.log('[Sync] Fetching Vitality/Energy Data (Lightweight)...');
        try {
            const payload = `_token=${AppState.csrfToken}`;
            const responseTxt = await apiPost('https://www.erepublik.com/en/economy/energyRefill-getInventory', payload);
            const res = JSON.parse(responseTxt);

            if (res && typeof res.poolEnergy !== 'undefined') {
                const energy = {
                    energy: res.poolEnergy,
                    energyPoolLimit: res.poolLimit,
                    recoverableEnergy: res.recoverableEnergy,
                    energyPerInterval: res.energyPerInterval,
                    energyStatus: res.energyStatus
                };

                console.log('[Sync] Energy Data Parsed:', energy);
                await setDbValue('energyData', energy);
                AppState.energyData = energy;
                const energyDisp = document.getElementById('energy-display');
                if (energyDisp) energyDisp.textContent = `Energy: ${energy.energy || '--'}`;

                updateSyncMeta('energy');
                showToast('Vitality (Energy) updated.', 'success');
                return true;
            }
        } catch (e) {
            console.error('[Sync Error] Energy:', e);
            showToast('Vitality Sync failed.', 'error');
        }
        return false;
    }
    async function updateSyncMeta(key) {
        AppState.syncMeta.timestamps[key] = Date.now();
        await setDbValue('syncMeta', AppState.syncMeta);
        if (AppState.activeTab === 'settings') renderSettingsTab();
    }

    async function handleDayChange(newDay) {
        showToast(`New eRepublik Day Detected: ${newDay}. Resetting local states.`, 'info');
        const companies = await getDbValue('companies') || {};
        Object.values(companies).forEach(c => { c.already_worked = false; c.todays_works = 0; });
        await setDbValue('companies', companies);
        const pageDetails = await getDbValue('pageDetails') || {};
        if (pageDetails.employee) pageDetails.employee.alreadyWorked = false;
        await setDbValue('pageDetails', pageDetails);
        AppState.syncMeta.lastDay = newDay;
        await setDbValue('syncMeta', AppState.syncMeta);
        await loadDataFromDb();
    }

    async function performGoldenLoad() {
        console.log('[Sync] Initiating Full System Re-calibration...');
        showToast('Initiating Full System Re-calibration...', 'info');
        
        const results = {
            csrf: await syncCsrf(true),
            infrastructure: await syncInfrastructure(true),
            workforce: await syncWorkforce(true),
            storage: await syncStorage(true),
            energy: await syncEnergy()
        };

        const failed = Object.entries(results).filter(([k, v]) => !v).map(([k]) => k);
        const successCount = Object.values(results).filter(v => v).length;

        console.log(`[Sync] Full Calibration Complete. Successes: ${successCount}/5. Failed: ${failed.join(', ') || 'None'}`);

        if (failed.length === 0) {
            showToast('Full System Calibration: SUCCESS (All modules active)', 'success');
        } else if (successCount > 0) {
            showToast(`Full System Calibration: PARTIAL (${failed.length} modules offline: ${failed.join(', ')})`, 'info');
        } else {
            showToast('Full System Calibration: FAILED (System remains offline)', 'error');
        }
    }

    // ==========================================
    // 8. API ACTIONS (Travel, Mass WAM & Employee)
    // ==========================================
    async function performMassWam() {
        const holdingId = AppState.filters.holding;
        const pendingWam = AppState.filteredArr.filter(c => !c.already_worked && !['house', 'house_raw', 'aircraft', 'aircraft_raw'].includes(c.calculated_industry));
        if (pendingWam.length === 0) return;

        const energyRequired = pendingWam.length * 10;
        let useEnergyBar = false;

        if (AppState.energyData.energy < energyRequired) {
            if (confirm(`Insufficient energy (${AppState.energyData.energy}/${energyRequired}). Use energy bars to complete work?`)) {
                useEnergyBar = true;
            } else {
                return;
            }
        }

        if (!confirm(`Work as Manager in ${pendingWam.length} companies?\nThis will cost ${energyRequired} energy.`)) return;

        const btnWam = document.getElementById('btn-wam');
        btnWam.disabled = true;

        const doTravel = document.getElementById('chk-travel-holding').checked;
        const doReturn = document.getElementById('chk-travel-home').checked;
        const holding = AppState.holdingsMap[holdingId];
        const targetRegionId = holding ? holding.region_id : null;

        try {
            const tdResInit = await apiPost('https://www.erepublik.com/en/main/travelData', `_token=${AppState.csrfToken}&holdingId=0&battleId=0`);
            const tdInit = JSON.parse(tdResInit);
            const citizenData = tdInit.citizen || {};
            const currentRegionId = citizenData.region ? citizenData.region.id : (citizenData.residence ? citizenData.residence.regionId : null);
            const residenceRegionId = citizenData.residence ? citizenData.residence.regionId : await getDbValue('residenceRegionId');

            if (doTravel && targetRegionId && currentRegionId != targetRegionId) {
                btnWam.textContent = 'Traveling...';
                const tdResTarget = await apiPost('https://www.erepublik.com/en/main/travelData', `_token=${AppState.csrfToken}&holdingId=0&battleId=0&regionId=${targetRegionId}`);
                const tdTarget = JSON.parse(tdResTarget);

                if (tdTarget.regions && tdTarget.regions[targetRegionId]) {
                    const targetCountryId = tdTarget.regions[targetRegionId].countryId;
                    const movePayload = `check=moveAction&_token=${AppState.csrfToken}&travelMethod=preferCurrency&inRegionId=${targetRegionId}&toCountryId=${targetCountryId}`;
                    await apiPost('https://www.erepublik.com/en/main/travel', movePayload);
                }
            }

            btnWam.textContent = 'Working...';
            const companyIds = pendingWam.map(c => c.id);
            const urlEncodedIds = encodeURIComponent(JSON.stringify(companyIds));
            let payload = `own_work=${urlEncodedIds}&employee_works=%7B%7D&cntOwnWork=${companyIds.length}&cntEmployeeWork=0&cntSelected=${companyIds.length}&action_type=production&_token=${AppState.csrfToken}`;
            if (useEnergyBar) payload += '&useEnergyBar=yes';

            const responseTxt = await apiPost('https://www.erepublik.com/en/economy/work', payload);
            const res = JSON.parse(responseTxt);

            if (res.status === true) {
                AppState.energyData.energy = Math.max(0, AppState.energyData.energy - energyRequired);
                pendingWam.forEach(c => c.already_worked = true);

                await setDbValue('energyData', AppState.energyData);
                const fullCompanies = await getDbValue('companies');
                pendingWam.forEach(c => { if (fullCompanies[c.id]) fullCompanies[c.id].already_worked = true; });
                await setDbValue('companies', fullCompanies);
            } else {
                throw new Error('API returned an error: ' + JSON.stringify(res));
            }

            if (doReturn && residenceRegionId) {
                const tdResReturn = await apiPost('https://www.erepublik.com/en/main/travelData', `_token=${AppState.csrfToken}&holdingId=0&battleId=0&regionId=${residenceRegionId}`);
                const tdReturn = JSON.parse(tdResReturn);
                const currentLocAfterWork = tdReturn.citizen && tdReturn.citizen.region ? tdReturn.citizen.region.id : null;

                if (currentLocAfterWork && currentLocAfterWork != residenceRegionId) {
                    btnWam.textContent = 'Returning Home (Cooling down)...';
                    await sleep(5000);
                    btnWam.textContent = 'Returning Home...';
                    const targetCountryId = tdReturn.regions[residenceRegionId].countryId;
                    const movePayload = `check=moveAction&_token=${AppState.csrfToken}&travelMethod=preferCurrency&inRegionId=${residenceRegionId}&toCountryId=${targetCountryId}`;
                    await apiPost('https://www.erepublik.com/en/main/travel', movePayload);
                }
            }

            showToast(`Produced successfully! XP: ${res.result.xp}, Health restored: ${res.result.health}`, 'success');
            await loadDataFromDb();

            if (AppState.syncSettings.energy.auto) {
                await syncEnergy();
            }

        } catch (e) {
            console.error(e);
            showToast('Error executing WAM / Travel: ' + e, 'error');
        } finally {
            btnWam.textContent = 'Work as Manager in Holding';
            updateActionUI();
        }
    }

    async function performEmployeeAssignment() {
        const amountInput = document.getElementById('emp-amount');
        const amount = parseInt(amountInput.value) || 0;

        if (amount <= 0) {
            showToast('Please enter a valid number of employees to assign.', 'error');
            return;
        }

        const btnAssign = document.getElementById('btn-assign');
        btnAssign.disabled = true;
        btnAssign.textContent = 'Processing...';

        let left = amount;
        let employee_works = {};
        let companyCount = 0;
        let affectedCompanies = [];

        for (const c of AppState.filteredArr) {
            if (left <= 0) break;
            if (c.can_assign_employees) {
                const slots = parseInt(c.employee_limit || 0) - (parseInt(c.todays_works) || 0);
                if (slots > 0) {
                    const assign = Math.min(left, slots);
                    employee_works[c.id] = assign;
                    affectedCompanies.push({ obj: c, amount: assign });
                    left -= assign;
                    companyCount++;
                }
            }
        }

        if (companyCount === 0) {
            showToast('No slots available to assign.', 'error');
            btnAssign.disabled = false;
            btnAssign.textContent = 'Assign & Work';
            return;
        }

        const employeeWorksEncoded = encodeURIComponent(JSON.stringify(employee_works));
        const payload = `own_work=%5B%5D&employee_works=${employeeWorksEncoded}&cntOwnWork=0&cntEmployeeWork=${companyCount}&cntSelected=${companyCount}&action_type=production&_token=${AppState.csrfToken}`;

        try {
            const responseTxt = await apiPost('https://www.erepublik.com/en/economy/work', payload);
            const res = JSON.parse(responseTxt);
            if (res.status === true) {
                showToast(`Successfully worked ${amount - left} employees!`, 'success');

                const fullCompanies = await getDbValue('companies');
                affectedCompanies.forEach(({ obj, amount }) => {
                    obj.todays_works = (parseInt(obj.todays_works) || 0) + amount;
                    if (fullCompanies[obj.id]) {
                        fullCompanies[obj.id].todays_works = obj.todays_works;
                    }
                });
                await setDbValue('companies', fullCompanies);

                amountInput.value = 0;
                await loadDataFromDb();
            } else {
                showToast('API returned an error: ' + JSON.stringify(res), 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error assigning employees: ' + e, 'error');
        } finally {
            btnAssign.textContent = 'Assign & Work';
            updateActionUI();
        }
    }

    async function performMassUpgrade() {
        const targetQ = parseInt(document.getElementById('upgrade-target-q').value);
        const amountInput = document.getElementById('upgrade-amount');
        const amount = parseInt(amountInput.value) || 0;

        if (amount <= 0) {
            showToast('Please enter a valid number of companies to upgrade.', 'error');
            return;
        }

        const upgradableSet = AppState.filteredArr
            .filter(c => c.quality < targetQ && c.upgrades && c.upgrades[targetQ])
            .sort((a, b) => b.quality - a.quality);

        if (upgradableSet.length === 0) {
            showToast(`No companies found below Q${targetQ} in this filter.`, 'error');
            return;
        }

        const toUpgrade = upgradableSet.slice(0, amount);
        let totalCost = 0;
        toUpgrade.forEach(c => {
            const levelData = c.upgrades[targetQ];
            totalCost += parseInt(levelData.cost);
        });

        if (!confirm(`Upgrade ${toUpgrade.length} companies to Q${targetQ}?\nEstimated Total Cost: ${totalCost} Gold.`)) return;

        const btn = document.getElementById('btn-mass-upgrade');
        btn.disabled = true;
        btn.textContent = 'Upgrading...';

        let successCount = 0;
        let successIds = [];
        let lockRetryQueue = [...toUpgrade];
        let attempts = 0;
        const maxAttemptsPerCompany = 3;
        const companyAttemptCount = {};
        toUpgrade.forEach(c => companyAttemptCount[c.id] = 0);

        while (lockRetryQueue.length > 0) {
            const c = lockRetryQueue.shift();
            companyAttemptCount[c.id]++;

            if (successCount > 0 || attempts > 0) await sleep(500);
            attempts++;

            const levelData = c.upgrades[targetQ];
            const payload = `_token=${AppState.csrfToken}&type=upgrade&companyId=${c.id}&level=${targetQ}&pin=false&shownCost=${levelData.cost}`;

            try {
                const responseTxt = await apiPost('https://www.erepublik.com/en/economy/upgrade-company', payload);
                const res = JSON.parse(responseTxt);

                if (res.status === true) {
                    successCount++;
                    successIds.push(c.id);
                    btn.textContent = `Upgrading (${successCount}/${toUpgrade.length})...`;
                } else if (res.message === 'lock') {
                    if (companyAttemptCount[c.id] < maxAttemptsPerCompany) {
                        console.warn(`[Upgrade] Company ${c.id} locked. Re-queuing for retry. (Attempt ${companyAttemptCount[c.id]})`);
                        lockRetryQueue.push(c);
                        btn.textContent = `Retrying Locks (${lockRetryQueue.length} left)...`;
                    } else {
                        console.error(`[Upgrade] Company ${c.id} still locked after ${maxAttemptsPerCompany} attempts. Giving up.`);
                    }
                } else {
                    console.error(`[Upgrade] Company ${c.id} failed:`, res);
                }
            } catch (e) {
                console.error(`[Upgrade] Request error for company ${c.id}:`, e);
            }
        }

        if (successCount > 0) {
            console.log(`[Upgrade] Manually updating local DB for ${successCount} successful upgrades.`);
            const fullCompanies = await getDbValue('companies') || {};
            successIds.forEach(id => {
                const comp = fullCompanies[id];
                if (!comp) return;
                
                const targetLvlData = comp.upgrades ? comp.upgrades[targetQ] : null;
                
                comp.quality = targetQ;
                
                // 1. Update Images (Crucial for filter logic)
                if (comp.building_img) {
                    comp.building_img = comp.building_img.replace(/q\d\.png/, `q${targetQ}.png`);
                }
                if (comp.products_img) {
                    comp.products_img = comp.products_img.replace(/q\d_/, `q${targetQ}_`);
                }

                // 2. Update Stats from Upgrade Map
                if (targetLvlData) {
                    if (targetLvlData.employees) comp.employee_limit = targetLvlData.employees.toString();
                    if (targetLvlData.raw_usage) comp.raw_usage = targetLvlData.raw_usage;
                }

                // 3. Update internal upgrade map types to reflect new state
                if (comp.upgrades) {
                    Object.keys(comp.upgrades).forEach(lvl => {
                        const l = parseInt(lvl);
                        if (l < targetQ) comp.upgrades[lvl].type = -1;
                        else if (l === targetQ) comp.upgrades[lvl].type = 0;
                        else if (comp.upgrades[lvl].type === 0) comp.upgrades[lvl].type = 1;
                    });
                }
            });
            await setDbValue('companies', fullCompanies);
            await loadDataFromDb(); // Re-render UI from updated local DB
        }

        showToast(`Successfully upgraded ${successCount} companies to Q${targetQ}!`, successCount === toUpgrade.length ? 'success' : 'info');

        btn.disabled = false;
        btn.textContent = 'Upgrade Selected';
    }

    async function performEmployeeWork() {
        const btn = document.getElementById('btn-work-emp');
        btn.disabled = true; btn.textContent = 'Working...';

        const payload = `_token=${AppState.csrfToken}&action_type=work`;
        try {
            const responseTxt = await apiPost('https://www.erepublik.com/en/economy/work', payload);
            const res = JSON.parse(responseTxt);
            if (res.status === true || res.message === 'already_worked') {
                if (res.status === true) {
                    showToast('Worked successfully!', 'success');
                    AppState.energyData.energy -= 10;
                    await setDbValue('energyData', AppState.energyData);
                }
                AppState.pageDetails.employee.alreadyWorked = true;
                await setDbValue('pageDetails', AppState.pageDetails);
                if (AppState.syncSettings.energy.auto) {
                    await syncEnergy();
                }
            } else {
                showToast('Error working: ' + JSON.stringify(res), 'error');
            }
        } catch (e) {
            showToast('Request failed: ' + e, 'error');
        } finally {
            updateActionUI();
            btn.textContent = AppState.pageDetails.employee.alreadyWorked ? 'Already Worked' : 'Work';
        }
    }

    async function performOvertimeWork() {
        const now = Math.floor(Date.now() / 1000);
        const nextOt = AppState.pageDetails.next_overtime_work || 0;
        const energyCost = (now < nextOt) ? 100 : 10;

        if (!confirm(`Work overtime? This will cost ${energyCost} energy.`)) return;

        const btn = document.getElementById('btn-work-ot');
        btn.disabled = true; btn.textContent = 'Working...';

        const payload = `_token=${AppState.csrfToken}&action_type=workOvertime`;
        try {
            const responseTxt = await apiPost('https://www.erepublik.com/en/economy/workOvertime', payload);
            const res = JSON.parse(responseTxt);
            if (res.message === true || res.status === true) {
                showToast(`Overtime successful!`, 'success');
                AppState.energyData.energy -= energyCost;
                AppState.pageDetails.next_overtime_work = Math.floor(Date.now() / 1000) + 3600;

                await setDbValue('energyData', AppState.energyData);
                await setDbValue('pageDetails', AppState.pageDetails);
                if (AppState.syncSettings.energy.auto) {
                    await syncEnergy();
                }
            } else {
                showToast('Error working overtime: ' + JSON.stringify(res), 'error');
            }
        } catch (e) {
            showToast('Request failed: ' + e, 'error');
        } finally {
            updateActionUI();
            btn.textContent = 'Work Overtime';
        }
    }

    // ==========================================
    // 9. TOAST NOTIFICATIONS
    // ==========================================
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Start
    initCustomManager();

})();
