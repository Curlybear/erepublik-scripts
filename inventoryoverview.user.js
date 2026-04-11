// ==UserScript==
// @name         eRepublik Inventory Overview
// @author       Curlybear
// @version      2.3
// @description  Display a customizable inventory overview
// @updateURL    https://curlybear.eu/erep/inventoryoverview.user.js
// @downloadURL  https://curlybear.eu/erep/inventoryoverview.user.js
// @match        https://www.erepublik.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Global variables
    let config, inventoryOverview, configModal, saleModal, offersModal, toggleButton, configToggle, offersToggle;

    // Constants
    const CACHE_DURATION = 30 * 1000; // 30 seconds
    const DEFAULT_CONFIG = {
        currencies: true,
        activeEnhancements: true,
        boosters: true,
        finalProducts: true,
        rawMaterials: true,
        blueprints: true,
        inProduction: true,
        width: 330,
        anchor: 'left',
        totalStorage: 1000000
    };

    // Sellable items configuration
    const SELLABLE_RULES = {
        1: { minQuality: 1, maxQuality: 7 },  // Food
        2: { minQuality: 1, maxQuality: 7 },  // Weapons
        7: { minQuality: 1, maxQuality: 1 },  // FRM
        12: { minQuality: 1, maxQuality: 1 }, // WRM
        17: { minQuality: 1, maxQuality: 1 }, // HRM
        24: { minQuality: 1, maxQuality: 1 }, // ARM
        4: { minQuality: 1, maxQuality: 5 },  // Aircraft
        23: { minQuality: 1, maxQuality: 5 }, // Houses
        3: { minQuality: 1, maxQuality: 5 }   // Tickets
    };

    // Special pack icons mapping
    const SPECIAL_PACK_ICONS = {
        "Power Pack": "https://www.erepublik.net/images/icons/boosters/52px/power_pack.png",
        "Blitzkrieg Pack": "https://www.erepublik.net/images/icons/boosters/52px/blitzkrieg_pack.png",
        "Maverick Pack": "https://www.erepublik.net/images/icons/boosters/52px/division_switch_pack.png"
    };

    function formatNumber(num) {
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Create and inject CSS
    const createStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap');

            :root {
                --surface: #121416;
                --surface-container-lowest: rgba(12, 14, 16, 0.85);
                --surface-container-low: rgba(26, 28, 30, 0.85);
                --surface-container: #282a2c;
                --surface-container-highest: #333537;
                --surface-bright: #38393c;
                --primary: #fabd00;
                --on-primary-container: #c09000;
                --on-primary-fixed: #261a00;
                --on-surface: #ffffff;
                --on-surface-variant: #c6c5d4;
                --outline-variant: rgba(69, 70, 82, 0.15);
                --ghost-border: rgba(69, 70, 82, 0.20);
                --secondary: #b4cad6;
                --tertiary-container: #00390a;
                --on-tertiary-container: #48ab4d;
                --error-container: #93000a;
                --on-error-container: #ffdad6;
                --font-display: 'Space Grotesk', sans-serif;
                --font-body: 'Inter', sans-serif;
            }

            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
            ::-webkit-scrollbar-thumb { background-color: var(--surface-container-highest); border-radius: 2px; }
            ::-webkit-scrollbar-thumb:hover { background-color: rgba(69, 70, 82, 0.5); }

            #inventory-overview, #config-modal, #sale-modal, #offers-modal {
                position: fixed;
                border-radius: 2px;
                font-family: var(--font-body);
                font-size: 12px;
                color: var(--on-surface);
                background-color: var(--surface-container-lowest);
                backdrop-filter: blur(12px);
                box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), 0 0 10px rgba(250, 189, 0, 0.04);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                border: 1px solid var(--outline-variant);
            }

            #inventory-overview { top: 40px; }
            
            .modal-header {
                background-color: var(--surface-container-highest);
                padding: 10px;
                font-family: var(--font-display);
                border-bottom: 1px solid var(--outline-variant);
                margin: 0;
            }
            .modal-header h3 { margin: 0; font-size: 14px; font-weight: 500; color: var(--on-surface); }

            .modal-body {
                padding: 10px;
                background-color: var(--surface-container-low);
                overflow-y: auto;
                flex-grow: 1;
                max-height: 70vh;
            }

            .left-anchored { left: 10px; }
            .right-anchored { right: 10px; }

            #inventory-overview ul {
                list-style-type: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
            }

            #inventory-overview li {
                display: flex;
                flex-direction: column;
                align-items: center;
                border-radius: 2px;
                padding: 3px;
                width: 50px;
                background-color: transparent;
                transition: background-color 0.2s;
            }
            #inventory-overview li:hover { background-color: var(--surface-bright); }

            #inventory-overview .category {
                font-family: var(--font-display);
                font-weight: 500;
                margin-top: 10px;
                margin-bottom: 5px;
                width: 100%;
                color: var(--on-surface);
            }

            #inventory-overview .item-icon { width: 40px; height: 40px; }
            #inventory-overview .item-amount { font-size: 11px; margin-top: 2px; color: var(--on-surface); }
            #inventory-overview .storage-info { margin-bottom: 5px; font-size: 11px; color: var(--on-surface-variant); }

            #inventory-toggle.left-anchored { left: 10px; }
            #config-toggle.left-anchored { left: 120px; }
            #offers-toggle.left-anchored { left: 195px; }
            #inventory-toggle.right-anchored { right: 80px; }
            #config-toggle.right-anchored { right: 10px; }
            #offers-toggle.right-anchored { right: 190px; }

            #inventory-toggle, #config-toggle, #offers-toggle {
                position: fixed;
                z-index: 10000;
                top: 10px;
                user-select: none;
            }

            .btn-primary {
                background: linear-gradient(135deg, var(--primary), var(--on-primary-container));
                color: var(--on-primary-fixed);
                border: none;
                border-radius: 2px;
                padding: 6px 12px;
                font-family: var(--font-body);
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.2s;
            }
            .btn-primary:hover { opacity: 0.9; }

            .btn-secondary {
                background: var(--surface-container-highest);
                color: var(--on-surface);
                border: 1px solid var(--ghost-border);
                border-radius: 2px;
                padding: 6px 12px;
                font-family: var(--font-body);
                cursor: pointer;
                transition: border-color 0.2s;
            }
            .btn-secondary:hover { border-color: rgba(69, 70, 82, 1); }

            .btn-tertiary {
                background: transparent;
                color: var(--secondary);
                border: none;
                padding: 6px 12px;
                font-family: var(--font-body);
                cursor: pointer;
            }
            .btn-tertiary:hover { color: var(--on-surface); }

            #config-modal { width: 300px; left: 50%; top: 50%; transform: translate(-50%, -50%); }
            #config-modal label { display: flex; align-items: center; margin-bottom: 5px; color: var(--on-surface); gap: 5px; }
            #config-modal input[type="range"] { width: 100%; margin: 10px 0; }
            #config-modal input[type="number"], #config-modal input[type="text"],
            #sale-modal input[type="number"] {
                background: var(--surface-container-highest);
                border: none;
                border-bottom: 2px solid transparent;
                color: var(--on-surface);
                padding: 5px;
                border-radius: 2px;
            }
            #config-modal input[type="number"]:focus, #config-modal input[type="text"]:focus,
            #sale-modal input[type="number"]:focus {
                border-bottom: 2px solid var(--primary);
                outline: none;
            }
            #width-value { display: inline-block; width: 40px; text-align: right; }

            #sale-modal, #offers-modal { width: 450px; opacity: 0; transition: transform 0.3s ease, opacity 0.3s ease; }
            #sale-modal.left-anchored, #offers-modal.left-anchored { left: 0; transform: translateX(-100%); }
            #sale-modal.right-anchored, #offers-modal.right-anchored { right: 0; transform: translateX(100%); }
            #sale-modal.visible.left-anchored, #offers-modal.visible.left-anchored { transform: translateX(-1%); opacity: 1; }
            #sale-modal.visible.right-anchored, #offers-modal.visible.right-anchored { transform: translateX(1%); opacity: 1; }

            .house-expiring-soon { border: 1px solid var(--primary); }
            @keyframes pulse-animation {
                0% { box-shadow: 0 0 0 0 rgba(250, 189, 0, 0.4); }
                70% { box-shadow: 0 0 0 6px rgba(250, 189, 0, 0); }
                100% { box-shadow: 0 0 0 0 rgba(250, 189, 0, 0); }
            }
            .house-expiring-very-soon { border: 1px solid var(--primary); animation: pulse-animation 2s infinite; }

            .offer { display: flex; align-items: center; margin-bottom: 5px; padding: 2px; background-color: transparent; transition: background-color 0.2s; }
            .offer:hover { background-color: var(--surface-bright); }
            .offer * { display: flex; }
            .offer-images { align-items: center; padding-right: 5px; }
            .offer-images img { width: 25px; }
            .offer-details { width: 100%; color: var(--on-surface); }
            .offer-details * { padding: 2px; }
            .offer-buttons { align-items: flex-end; flex-direction: column; }
            .offer-totals { justify-content: flex-end; padding: 5px; width: 100%; text-align: right; font-family: var(--font-display); }
            .offer-remove, .offer-link { cursor: pointer; user-select: none; }
            .offer-amount { width: 20%; align-items: center; }

            #toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 10001; display: flex; flex-direction: column; gap: 10px; }
            .toast { padding: 12px 20px; border-radius: 2px; color: var(--on-surface); font-size: 14px; font-family: var(--font-body); opacity: 0; transform: translateY(20px); transition: opacity 0.3s, transform 0.3s; min-width: 200px; max-width: 400px; }
            .toast.visible { opacity: 1; transform: translateY(0); }
            .toast.success { background-color: var(--tertiary-container); color: var(--on-tertiary-container); }
            .toast.error { background-color: var(--error-container); color: var(--on-error-container); }
            .toast.info { background-color: var(--surface-container-high); color: var(--secondary); }
        `;
        document.head.appendChild(style);
    };

    // Utility Functions
    const formatTimeLeft = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const getCorrectIcon = (item) => {
        for (const [packName, iconUrl] of Object.entries(SPECIAL_PACK_ICONS)) {
            if (item.name.includes(packName)) return iconUrl;
        }
        return item.icon;
    };

    const showToast = (message, type = 'info') => {
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
    };

    // Cache Management
    const cache = {
        load() {
            const cachedData = localStorage.getItem('erepublikInventoryData');
            const cachedTime = localStorage.getItem('erepublikInventoryTime');
            return cachedData && cachedTime ? {
                data: JSON.parse(cachedData),
                time: parseInt(cachedTime)
            } : null;
        },
        save(data) {
            localStorage.setItem('erepublikInventoryData', JSON.stringify(data));
            localStorage.setItem('erepublikInventoryTime', Date.now().toString());
        },
        isValid(cachedInfo) {
            return cachedInfo && (Date.now() - cachedInfo.time < CACHE_DURATION);
        }
    };

    // Config Management
    const configManager = {
        load() {
            const savedConfig = localStorage.getItem('erepublikInventoryConfig');
            return savedConfig ? { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) } : DEFAULT_CONFIG;
        },
        save(config) {
            localStorage.setItem('erepublikInventoryConfig', JSON.stringify(config));
        }
    };

    // UI Management
    const setAnchor = (anchor) => {
        const elements = [inventoryOverview, saleModal, offersModal, toggleButton, configToggle, offersToggle];
        elements.forEach(el => {
            if (el) {
                el.classList.remove('left-anchored', 'right-anchored');
                el.classList.add(`${anchor}-anchored`);
            }
        });
    };

    const showSaleModal = (anchor) => {
        const triggerRect = inventoryOverview.getBoundingClientRect();
        if (anchor === "left") {
            saleModal.style.top = `${triggerRect.top}px`;
            saleModal.style.left = `${triggerRect.right}px`;
        } else {
            saleModal.style.top = `${triggerRect.top}px`;
            saleModal.style.left = `${triggerRect.left - saleModal.offsetWidth}px`;
        }
        saleModal.classList.add('visible');
        saleModal.style.display = 'block';
    };

    const hideSaleModal = () => {
        saleModal.classList.remove('visible');
    };

    const showOffersModal = (anchor) => {
        console.log("Open");
        const triggerRect = inventoryOverview.getBoundingClientRect();
        const saleRect = saleModal.getBoundingClientRect();
        if (anchor === "left") {
            offersModal.style.top = `${triggerRect.top + saleRect.height}px`;
            offersModal.style.left = `${triggerRect.right}px`;
            offersModal.style.maxHeight = `${(window.innerHeight * 0.8) - saleRect.height}px`;
        } else {
            offersModal.style.top = `${triggerRect.top + saleRect.height}px`;
            offersModal.style.left = `${triggerRect.left - offersModal.offsetWidth}px`;
        }
        offersModal.classList.add('visible');
        offersModal.style.display = 'block';
    };

    const hideOffersModal = () => {
        console.log("Close");
        offersModal.classList.remove('visible');
    };

    // Data Processing
    const processInventoryData = (data) => {
        const mainStorage = data.find(section => section.id === 'mainStorage');
        const boosters = data.find(section => section.id === 'boosters');
        const activeEnhancements = data.find(section => section.id === 'activeEnhancements');
        const inProduction = data.find(section => section.id === 'inProduction');

        const status = {
            usedStorage: 0,
            totalStorage: config.totalStorage || 1000000,
            storagePercentage: '0%'
        };

        if (mainStorage?.items) {
            status.usedStorage = mainStorage.items.reduce((total, item) =>
                total + (item.attributes?.storage || 0), 0);
            status.storagePercentage = ((status.usedStorage / status.totalStorage) * 100).toFixed(1) + '%';
        }

        const organizedData = {
            inventoryItems: {
                currencies: { items: {} },
                activeEnhancements: { items: {} },
                finalProducts: { items: {} },
                rawMaterials: { items: {} },
                blueprints: { items: {} },
                boosters: { items: {} },
                inProduction: { items: {} }
            },
            inventoryStatus: status
        };

        // Process each category
        if (activeEnhancements?.items) {
            activeEnhancements.items.forEach(item => {
                organizedData.inventoryItems.activeEnhancements.items[item.id] = {
                    ...item,
                    active: {
                        time_left: item.attributes.active?.activeTimeLeft || 0
                    }
                };
            });
        }

        if (inProduction?.items) {
            inProduction.items.forEach(item => {
                organizedData.inventoryItems.inProduction.items[item.id] = {
                    ...item,
                    amountDisplay: (item.amount * 100).toFixed(1) + '%'
                };
            });
        }

        if (mainStorage?.items) {
            mainStorage.items.forEach(item => {
                const processedItem = {
                    ...item,
                    isBooster: item.type === 'booster' ? 1 : 0,
                    active: item.attributes.active || null
                };

                // Categorize items based on type
                const categoryMap = {
                    'currency': 'currencies',
                    'raw': 'rawMaterials',
                    'vehicle_blueprint': 'blueprints'
                };

                const category = categoryMap[item.type] || 'finalProducts';
                organizedData.inventoryItems[category].items[item.id] = processedItem;
            });
        }

        if (boosters?.items) {
            boosters.items.forEach(item => {
                organizedData.inventoryItems.finalProducts.items[item.id] = {
                    ...item,
                    isBooster: 1,
                    active: item.attributes.active || null
                };
            });
        }

        return organizedData;
    };

    // Display Functions
    const displayInventoryData = (data) => {
        const { inventoryItems, inventoryStatus: status } = data;

        let html = `
            <div class="modal-header">
                <h3>Inventory Overview</h3>
            </div>
            <div class="modal-body">
            <div class="storage-info">Storage: ${status.usedStorage} / ${status.totalStorage} (${status.storagePercentage})</div>
        `;

        const addItems = (category, items, configKey, itemFilter) => {
            if (!config[configKey] || !items || Object.keys(items).length === 0) return;

            const filteredItems = Object.entries(items).filter(([_, item]) => itemFilter(item));
            if (filteredItems.length === 0) return;

            html += `<div class="category">${category}:</div><ul>`;
            filteredItems.forEach(([_, item]) => {
                let displayText = item.amount;
                let expirationClass = '';

                if (category === 'Active Enhancements' && item.active?.time_left) {
                    displayText = formatTimeLeft(item.active.time_left);
                    if (item.name.includes('House')) {
                        expirationClass = item.active.time_left < 86400 ?
                            'house-expiring-very-soon' :
                            item.active.time_left < 604800 ? 'house-expiring-soon' : '';
                    }
                }

                if (item.id == "raw_7_1") {
                    item.industryId = 7;
                    item.quality = 1;
                } else if (item.id == "raw_12_1") {
                    item.industryId = 12;
                    item.quality = 1;
                } else if (item.id == "raw_17_1") {
                    item.industryId = 17;
                    item.quality = 1;
                } else if (item.id == "raw_24_1") {
                    item.industryId = 24;
                    item.quality = 1;
                }

                html += `
                    <li title="${item.name}" class="${expirationClass}"
                        data-industry-id="${item.industryId}" data-quality="${item.quality}">
                        <img class="item-icon" src="${getCorrectIcon(item)}" alt="${item.name}">
                        <span class="item-amount">${displayText}</span>
                    </li>
                `;
            });
            html += '</ul>';
        };

        // Add items by category
        const categories = [
            ['Currencies', inventoryItems.currencies.items, 'currencies', () => true],
            ['Active Enhancements', inventoryItems.activeEnhancements.items, 'activeEnhancements', item => item.active],
            ['Boosters', inventoryItems.finalProducts.items, 'boosters', item => item.isBooster === 1 && !item.active],
            ['Final Products', inventoryItems.finalProducts.items, 'finalProducts', item => item.isBooster !== 1],
            ['Raw Materials', inventoryItems.rawMaterials.items, 'rawMaterials', () => true],
            ['Blueprints', inventoryItems.blueprints.items, 'blueprints', () => true],
            ['In Production', inventoryItems.inProduction.items, 'inProduction', () => true]
        ];

        categories.forEach(([category, items, configKey, filter]) => {
            addItems(category, items, configKey, filter);
        });

        html += '</div>';
        inventoryOverview.innerHTML = html;
    };

    const displayOffersData = (data) => {
        const offers = data;
        let html = '<ul>';
        let totalSale = 0;
        let totalSaleNet = 0;
        offers.forEach((offer) => {
            totalSale += offer.amount * offer.price;
            totalSaleNet += offer.amount * offer.netPrice;
            html += `
                <li class="offer" data-id="${offer.id}">
                    <div class="offer-images">
                        <img class="item-icon" src="${offer.icon}">
                        <img class="offer-country"
                            src="https://static.erepublik.tools/assets/img/erepublik/country/${offer.countryId}.gif" />
                    </div>
                    <div class="offer-details">
                        <span class="offer-amount">Qty: ${offer.amount}</span>
                        <div style="flex-direction:column;">
                        <span class="offer-price">${formatNumber(offer.price) + ' ' + erepublik.citizen.currency + ' (' + formatNumber(offer.netPrice.toFixed(2)) + ' ' + erepublik.citizen.currency + ')'}</span>
                        <span class="offer-total">Total: ${formatNumber(offer.amount * offer.price) + ' ' + erepublik.citizen.currency + ' (' + formatNumber((offer.amount * offer.netPrice)) + ' ' + erepublik.citizen.currency + ')'} </span>
                        </div>
                    </div>
                    <div class="offer-buttons">
                        <span class="offer-link"><a
                                href="https://www.erepublik.com/en/economy/marketplace/offer/${offer.id}">🔗</a></span>
                        <span class="offer-remove">🗑️</span>
                    </div>
                </li>
                `;
        });
        html += `
            <li class="offer" data-id="total">
                <div class="offer-totals">
                    <span class="offer-total">Total: ${formatNumber(totalSale) + ' ' + erepublik.citizen.currency + ' (' + formatNumber((totalSaleNet)) + ' ' + erepublik.citizen.currency + ')'} </span>
                </div>
            </li>
            `;
        html += '</ul>';
        document.getElementById('offers-modal-content').innerHTML = html;
        document.querySelectorAll('.offer-remove').forEach(button => {
            button.addEventListener('click', (event) => {
                const li = event.target.closest('li'); // Find the parent <li>
                const id = li.getAttribute('data-id'); // Get the associated ID
                handleOfferDelete(id); // Trigger the handler with the ID
            });
        });
    };

    // Update inventory function
    const updateInventoryOverview = async () => {
        const cachedInfo = cache.load();

        if (cache.isValid(cachedInfo)) {
            displayInventoryData(cachedInfo.data);
            return;
        }

        try {
            const response = await fetch('https://www.erepublik.com/en/economy/inventory-json');
            const data = await response.json();
            const processedData = processInventoryData(data);
            cache.save(processedData);
            displayInventoryData(processedData);
        } catch (error) {
            console.error('Error fetching inventory data:', error);
            showToast('Failed to update inventory', 'error');
        }
    };

    // Update offers function
    const updateOffersOverview = async () => {
        try {
            const response = await fetch('https://www.erepublik.com/en/economy/myMarketOffers');
            const data = await response.json();
            displayOffersData(data);
        } catch (error) {
            console.error('Error fetching offers data:', error);
            showToast('Failed to update offers', 'error');
        }
    };

    // Event Handlers
    const handleItemClick = (event) => {
        const item = event.target.closest('li');
        if (!item) return;

        const industryId = parseInt(item.dataset.industryId, 10);
        const quality = parseInt(item.dataset.quality, 10);

        if (!SELLABLE_RULES[industryId]) return;

        const rule = SELLABLE_RULES[industryId];
        if (quality < rule.minQuality || quality > rule.maxQuality) return;

        const itemAmount = item.querySelector('.item-amount').textContent.trim();
        const itemIconSrc = item.querySelector('.item-icon').src;

        // Populate sale modal
        document.getElementById('sale-item-image').src = itemIconSrc;
        document.getElementById('sale-quantity').value = itemAmount;
        document.getElementById('sale-price').value = '';
        document.getElementById('ereptools-link').href =
            `https://erepublik.tools/en/marketplace/items/0/${industryId}/${quality}/offers`;

        saleModal.dataset.industryId = industryId;
        saleModal.dataset.quality = quality;

        showSaleModal(config.anchor);
    };

    const handleSaleSubmit = async () => {
        const { industryId, quality } = saleModal.dataset;
        const price = document.getElementById('sale-price').value;
        const quantity = document.getElementById('sale-quantity').value;

        if (!price || !quantity || price <= 0 || quantity <= 0) {
            showToast('Please enter valid price and quantity.', 'error');
            return;
        }

        const payload = new URLSearchParams({
            sellAction: 'postOffer',
            _token: csrfToken,
            countryId: erepublik.citizen.citizenshipCountryId,
            industryId,
            quality,
            amount: quantity,
            price
        });

        try {
            const response = await fetch('https://www.erepublik.com/en/economy/marketplaceActions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: payload
            });

            const data = await response.json();
            if (!data.error) {
                hideSaleModal();
                updateInventoryOverview();
                updateOffersOverview();
                showToast('Item listed successfully', 'success');
            } else {
                showToast('Failed to list item: ' + (data.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error while listing item for sale.', 'error');
        }
    };

    async function handleOfferDelete(offerId) {
        const payload = new URLSearchParams({
            sellAction: 'deleteOffer',
            _token: csrfToken,
            offerId: offerId
        });

        try {
            const response = await fetch('https://www.erepublik.com/en/economy/marketplaceActions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: payload
            });

            const data = await response.json();
            if (!data.error) {
                updateOffersOverview();
                showToast('Offer deleted successfully', 'success');
            } else {
                showToast('Failed to delete offer: ' + (data.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error while deleting the offer.', 'error');
        }
    }

    // Create DOM elements
    const createElements = () => {
        // Create inventory toggle button
        toggleButton = document.createElement('div');
        toggleButton.id = 'inventory-toggle';
        toggleButton.textContent = 'Toggle Inventory';
        toggleButton.className = 'btn-secondary';
        document.body.appendChild(toggleButton);

        // Create config toggle button
        configToggle = document.createElement('div');
        configToggle.id = 'config-toggle';
        configToggle.textContent = 'Configure';
        configToggle.className = 'btn-secondary';
        document.body.appendChild(configToggle);

        // Create inventory overview container
        inventoryOverview = document.createElement('div');
        inventoryOverview.id = 'inventory-overview';
        document.body.appendChild(inventoryOverview);

        // Create configuration modal
        configModal = document.createElement('div');
        configModal.id = 'config-modal';
        configModal.style.display = "none";
        configModal.innerHTML = `
            <div class="modal-header">
                <h3>Configure Inventory Display</h3>
            </div>
            <div class="modal-body">
            <label><input type="checkbox" id="config-currencies" checked> Currencies</label>
            <label><input type="checkbox" id="config-active-enhancements" checked> Active Enhancements</label>
            <label><input type="checkbox" id="config-boosters" checked> Boosters</label>
            <label><input type="checkbox" id="config-final-products" checked> Final Products</label>
            <label><input type="checkbox" id="config-raw-materials" checked> Raw Materials</label>
            <label><input type="checkbox" id="config-blueprints" checked> Blueprints</label>
            <label><input type="checkbox" id="config-in-production" checked> In Production</label>
            <label>
                Width: <span id="width-value">330</span>px
                <input type="range" id="width-slider" min="200" max="500" step="10" value="330">
            </label>
            <label>
                Total Storage:
                <input type="number" id="config-total-storage" min="1000" step="1000" value="1000000" style="width: 100px;">
            </label>
            
            <div>
                Position:
                <label><input type="radio" name="anchor" id="config-anchor-left" value="left"> Left</label>
                <label><input type="radio" name="anchor" id="config-anchor-right" value="right"> Right</label>
            </div>
            <button id="config-save" class="btn-primary" style="margin-top: 15px; width: 100%;">Save Configuration</button>
            </div>
        `;
        document.body.appendChild(configModal);

        // Create sale modal
        saleModal = document.createElement('div');
        saleModal.id = 'sale-modal';
        saleModal.innerHTML = `
            <div class="modal-header">
                <h3>Add offer for Item</h3>
            </div>
            <div class="modal-body">
            <div style="display: flex; justify-content: center; align-items: center;">
                <img id="sale-item-image" src="" alt="Item Image"
                     style="width: 50px; height: 50px; margin: 10px; border-radius: 8px; background-color: rgba(255,255,255,0.1);">
                <a id="ereptools-link" href="" target="_blank" rel="noopener noreferrer">
                    <img src="https://curlybear.eu/erep/ereptools.png"
                         style="width: 50px; height: 50px; margin: 10px; border-radius: 8px; background-color: rgba(255,255,255,0.1);">
                </a>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
                <label style="display: flex; justify-content: space-between; align-items: center;">
                    Price:
                    <input type="number" id="sale-price"
                           placeholder="Enter price"
                           style="flex: 1; margin-left: 10px;">
                </label>
                <label style="display: flex; justify-content: space-between; align-items: center;">
                    Quantity:
                    <input type="number" id="sale-quantity"
                           min="1" placeholder="Enter quantity"
                           style="flex: 1; margin-left: 10px;">
                </label>
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: space-around;">
                <button id="sale-submit" class="btn-primary">Add offer</button>
                <button id="sale-cancel" class="btn-secondary">Cancel</button>
            </div>
            </div>
        `;
        document.body.appendChild(saleModal);

        // Create offers toggle
        offersToggle = document.createElement('div');
        offersToggle.id = 'offers-toggle';
        offersToggle.textContent = 'Show market offers';
        offersToggle.className = 'btn-secondary isClosed';

        document.body.appendChild(offersToggle);

        // Create offers modal
        offersModal = document.createElement('div');
        offersModal.id = 'offers-modal';
        offersModal.innerHTML = `
            <div class="modal-header">
                <h3>Market Offers</h3>
            </div>
            <div class="modal-body">
                <div id='offers-modal-content' style="display: flex; flex-direction: column; gap: 10px; text-align: left;"></div>
            </div>
        `;
        document.body.appendChild(offersModal);
    };

    // Initialize the script
    const init = () => {
        createStyles();
        createElements();

        // Load configuration and visibility state
        config = configManager.load();
        const isVisible = localStorage.getItem('erepublikInventoryVisible') === 'true';
        inventoryOverview.style.display = isVisible ? 'block' : 'none';

        // Initialize configuration inputs with saved values
        Object.entries({
            'currencies': 'config-currencies',
            'activeEnhancements': 'config-active-enhancements',
            'boosters': 'config-boosters',
            'finalProducts': 'config-final-products',
            'rawMaterials': 'config-raw-materials',
            'blueprints': 'config-blueprints',
            'inProduction': 'config-in-production'
        }).forEach(([configKey, elementId]) => {
            const element = document.getElementById(elementId);
            if (element) element.checked = config[configKey];
        });

        // Initialize width
        const widthSlider = document.getElementById('width-slider');
        const widthValue = document.getElementById('width-value');
        widthSlider.value = config.width;
        widthValue.textContent = config.width;
        inventoryOverview.style.width = `${config.width}px`;

        // Initialize storage input
        const storageInput = document.getElementById('config-total-storage');
        if (storageInput) {
            storageInput.value = config.totalStorage || 1000000;
        }

        // Initialize theme


        // Initialize anchor position
        document.getElementById(`config-anchor-${config.anchor}`).checked = true;

        // Set up event listeners
        inventoryOverview.addEventListener('click', handleItemClick);
        document.getElementById('sale-submit').addEventListener('click', handleSaleSubmit);
        document.getElementById('sale-cancel').addEventListener('click', () => hideSaleModal());

        // Toggle and config button listeners
        toggleButton.addEventListener('click', () => {
            const newState = inventoryOverview.style.display === 'none';
            inventoryOverview.style.display = newState ? 'block' : 'none';
            localStorage.setItem('erepublikInventoryVisible', newState);
        });

        configToggle.addEventListener('click', () => {
            configModal.style.display = configModal.style.display == 'none' ? 'block' : 'none';
        });

        offersToggle.addEventListener('click', () => {
            if (offersToggle.classList.contains('isClosed')) {
                updateOffersOverview();
                offersToggle.classList.add('isOpen');
                offersToggle.classList.remove('isClosed');
                showOffersModal(config.anchor);
                offersToggle.textContent = "Hide market offers";
            } else {
                offersToggle.classList.add('isClosed');
                offersToggle.classList.remove('isOpen');
                hideOffersModal();
                offersToggle.textContent = "Show market offers";
            }
        });

        // Width slider event
        widthSlider.addEventListener('input', () => {
            const newWidth = widthSlider.value;
            widthValue.textContent = newWidth;
            inventoryOverview.style.width = `${newWidth}px`;
        });

        // Config save button
        document.getElementById('config-save').addEventListener('click', () => {
            config = {
                ...config,
                currencies: document.getElementById('config-currencies').checked,
                activeEnhancements: document.getElementById('config-active-enhancements').checked,
                boosters: document.getElementById('config-boosters').checked,
                finalProducts: document.getElementById('config-final-products').checked,
                rawMaterials: document.getElementById('config-raw-materials').checked,
                blueprints: document.getElementById('config-blueprints').checked,
                inProduction: document.getElementById('config-in-production').checked,
                width: parseInt(widthSlider.value),

                anchor: document.querySelector('input[name="anchor"]:checked').value,
                totalStorage: parseInt(document.getElementById('config-total-storage').value) || 1000000
            };

            configManager.save(config);
            configModal.style.display = 'none';

            setAnchor(config.anchor);
            inventoryOverview.style.width = `${config.width}px`;

            // Apply theme to toggle buttons


            updateInventoryOverview();
        });

        // Set initial state

        setAnchor(config.anchor);
        updateInventoryOverview();

        // Start periodic updates
        setInterval(updateInventoryOverview, 5 * 60 * 1000);
    };
    // Start the script
    init();
})();