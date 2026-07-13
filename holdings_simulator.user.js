// ==UserScript==
// @name         eRepublik Holdings Simulator
// @version      0.3
// @description  Plan and simulate holding configurations. Computes daily production using real regional productivity from the external API. No game actions are performed.
// @author       Curlybear
// @match        https://www.erepublik.com/*
// @grant        GM_xmlhttpRequest
// @connect      productivityapi.curlybear.eu
// @updateURL    https://curlybear.eu/erep/holdings_simulator.user.js
// @downloadURL  https://curlybear.eu/erep/holdings_simulator.user.js
// ==/UserScript==

(function () {
    'use strict';

    const SIM_URL = '/en/economy/holdings-simulator';

    function injectNavigationLink() {
        if (window.location.pathname.startsWith(SIM_URL)) return;
        const menu = document.querySelector('#menu2 > ul');
        if (!menu) return;
        if (menu.querySelector(`a[href="${SIM_URL}"]`)) return;
        const companiesLink = menu.querySelector('a[href="/en/economy/myCompanies"]');
        if (companiesLink && companiesLink.parentElement) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${SIM_URL}">Holdings Simulator</a>`;
            companiesLink.parentElement.insertAdjacentElement('afterend', li);
        }
    }

    injectNavigationLink();
    if (!window.location.pathname.startsWith(SIM_URL)) return;

    // ==========================================
    // 1. CONSTANTS & COMPANY DEFINITIONS
    // ==========================================
    const LS_KEY = 'erep_holdings_sim_v1';
    const CACHE_TTL = 3600000; // 1 hour
    const RAW_NAMES = { food: 'FRM', weapon: 'WRM', house: 'HRM', aircraft: 'ARM' };
    const PROD_NAMES = { food: 'Food', weapon: 'Weapons', house: 'Houses', aircraft: 'Aircraft' };
    const INDUSTRY_IDS = { food: 1, weapon: 2, house: 4, aircraft: 23, food_raw: 7, weapon_raw: 12, house_raw: 17, aircraft_raw: 24 };
    const RAW_IDS = { FRM: 7, WRM: 12, HRM: 17, ARM: 24 };
    const RAW_INDUSTRY = { FRM: 'food_raw', WRM: 'weapon_raw', HRM: 'house_raw', ARM: 'aircraft_raw' };
    // Maps internal industry key → marketpicture API key; raw materials sell as a single commodity (q1 only)
    const MARKET_KEY = { food: 'food', weapon: 'weapons', house: 'houses', aircraft: 'aircraft', food_raw: 'frm', weapon_raw: 'wrm', house_raw: 'hrm', aircraft_raw: 'arm' };
    // Keyed by building_img filename — the only reliable type identifier the game exposes (same approach as CCM).
    const BUILDING_DEFS = {
        'grain.png':              { industry: 'food_raw',     quality: 1 },
        'fruits.png':             { industry: 'food_raw',     quality: 2 },
        'fish.png':               { industry: 'food_raw',     quality: 3 },
        'cattle.png':             { industry: 'food_raw',     quality: 4 },
        'deer.png':               { industry: 'food_raw',     quality: 5 },
        'iron.png':               { industry: 'weapon_raw',   quality: 1 },
        'oil.png':                { industry: 'weapon_raw',   quality: 2 },
        'aluminum.png':           { industry: 'weapon_raw',   quality: 3 },
        'saltpeter.png':          { industry: 'weapon_raw',   quality: 4 },
        'rubber.png':             { industry: 'weapon_raw',   quality: 5 },
        'sand.png':               { industry: 'house_raw',    quality: 1 },
        'clay.png':               { industry: 'house_raw',    quality: 2 },
        'wood.png':               { industry: 'house_raw',    quality: 3 },
        'limestone.png':          { industry: 'house_raw',    quality: 4 },
        'granite.png':            { industry: 'house_raw',    quality: 5 },
        'magnesium.png':          { industry: 'aircraft_raw', quality: 1 },
        'titanium.png':           { industry: 'aircraft_raw', quality: 2 },
        'walfram.png':            { industry: 'aircraft_raw', quality: 3 },
        'cobalt.png':             { industry: 'aircraft_raw', quality: 4 },
        'neodymium.png':          { industry: 'aircraft_raw', quality: 5 },
        'food_q1.png':            { industry: 'food',         quality: 1 },
        'food_q2.png':            { industry: 'food',         quality: 2 },
        'food_q3.png':            { industry: 'food',         quality: 3 },
        'food_q4.png':            { industry: 'food',         quality: 4 },
        'food_q5.png':            { industry: 'food',         quality: 5 },
        'food_q6.png':            { industry: 'food',         quality: 6 },
        'food_q7.png':            { industry: 'food',         quality: 7 },
        'weapons_q1.png':         { industry: 'weapon',       quality: 1 },
        'weapons_q2.png':         { industry: 'weapon',       quality: 2 },
        'weapons_q3.png':         { industry: 'weapon',       quality: 3 },
        'weapons_q4.png':         { industry: 'weapon',       quality: 4 },
        'weapons_q5.png':         { industry: 'weapon',       quality: 5 },
        'weapons_q6.png':         { industry: 'weapon',       quality: 6 },
        'weapons_q7.png':         { industry: 'weapon',       quality: 7 },
        'aircraft_weapons_q1.png':{ industry: 'aircraft',     quality: 1 },
        'aircraft_weapons_q2.png':{ industry: 'aircraft',     quality: 2 },
        'aircraft_weapons_q3.png':{ industry: 'aircraft',     quality: 3 },
        'aircraft_weapons_q4.png':{ industry: 'aircraft',     quality: 4 },
        'aircraft_weapons_q5.png':{ industry: 'aircraft',     quality: 5 },
        'aircraft_weapons_q6.png':{ industry: 'aircraft',     quality: 6 },
        'aircraft_weapons_q7.png':{ industry: 'aircraft',     quality: 7 },
        'house_q1.png':           { industry: 'house',        quality: 1 },
        'house_q2.png':           { industry: 'house',        quality: 2 },
        'house_q3.png':           { industry: 'house',        quality: 3 },
        'house_q4.png':           { industry: 'house',        quality: 4 },
        'house_q5.png':           { industry: 'house',        quality: 5 },
        'house_q6.png':           { industry: 'house',        quality: 6 },
        'house_q7.png':           { industry: 'house',        quality: 7 },
    };
    const MARKET_CACHE_TTL = 3600000; // 1 hour
    let marketPriceCache = { timestamp: 0, prices: null }; // session-only, not persisted

    function industryImg(id, size = 28, quality = null) {
        const file = quality ? `q${quality}_128x128.png` : `default_128x128.png`;
        return `<img src="https://www.erepublik.net/images/icons/industry/${id}/${file}" style="width:${size}px;height:${size}px;object-fit:contain;vertical-align:middle;" loading="lazy">`;
    }

    // key: `${industry}_${quality}` — e.g. "food_raw_3", "food_7", "weapon_5"
    const DEFS = {
        food_raw_1: { baseProduction: 0.35, empSlots: 0, goldCost: 0, ccCost: 1500 },
        food_raw_2: { baseProduction: 0.70, empSlots: 0, goldCost: 0, ccCost: 3000 },
        food_raw_3: { baseProduction: 1.25, empSlots: 1, goldCost: 10 },
        food_raw_4: { baseProduction: 1.75, empSlots: 1, goldCost: 0, ccCost: 8500 },
        food_raw_5: { baseProduction: 2.50, empSlots: 4, goldCost: 35 },
        weapon_raw_1: { baseProduction: 0.35, empSlots: 0, goldCost: 0, ccCost: 1500 },
        weapon_raw_2: { baseProduction: 0.70, empSlots: 0, goldCost: 0, ccCost: 3000 },
        weapon_raw_3: { baseProduction: 1.25, empSlots: 1, goldCost: 10 },
        weapon_raw_4: { baseProduction: 1.75, empSlots: 1, goldCost: 0, ccCost: 8500 },
        weapon_raw_5: { baseProduction: 2.50, empSlots: 4, goldCost: 35 },
        house_raw_1: { baseProduction: 0.35, empSlots: 1, goldCost: 0, ccCost: 1500 },
        house_raw_2: { baseProduction: 0.70, empSlots: 2, goldCost: 0, ccCost: 3000 },
        house_raw_3: { baseProduction: 1.25, empSlots: 3, goldCost: 10 },
        house_raw_4: { baseProduction: 1.75, empSlots: 4, goldCost: 0, ccCost: 8500 },
        house_raw_5: { baseProduction: 2.50, empSlots: 5, goldCost: 35 },
        aircraft_raw_1: { baseProduction: 0.35, empSlots: 1, goldCost: 0, ccCost: 1500 },
        aircraft_raw_2: { baseProduction: 0.70, empSlots: 2, goldCost: 0, ccCost: 3000 },
        aircraft_raw_3: { baseProduction: 1.25, empSlots: 3, goldCost: 10 },
        aircraft_raw_4: { baseProduction: 1.75, empSlots: 4, goldCost: 0, ccCost: 8500 },
        aircraft_raw_5: { baseProduction: 2.50, empSlots: 5, goldCost: 35 },
        food_1: { baseProduction: 100, rawCost: 0.01, empSlots: 1, goldCost: 10 },
        food_2: { baseProduction: 100, rawCost: 0.02, empSlots: 2, goldCost: 20 },
        food_3: { baseProduction: 100, rawCost: 0.03, empSlots: 3, goldCost: 45 },
        food_4: { baseProduction: 100, rawCost: 0.04, empSlots: 5, goldCost: 95 },
        food_5: { baseProduction: 100, rawCost: 0.05, empSlots: 10, goldCost: 195 },
        food_6: { baseProduction: 100, rawCost: 0.06, empSlots: 10, goldCost: 395 },
        food_7: { baseProduction: 100, rawCost: 0.20, empSlots: 10, goldCost: 620 },
        weapon_1: { baseProduction: 10, rawCost: 0.1, empSlots: 1, goldCost: 10 },
        weapon_2: { baseProduction: 10, rawCost: 0.2, empSlots: 2, goldCost: 20 },
        weapon_3: { baseProduction: 10, rawCost: 0.3, empSlots: 3, goldCost: 45 },
        weapon_4: { baseProduction: 10, rawCost: 0.4, empSlots: 5, goldCost: 95 },
        weapon_5: { baseProduction: 10, rawCost: 0.5, empSlots: 10, goldCost: 195 },
        weapon_6: { baseProduction: 10, rawCost: 0.6, empSlots: 10, goldCost: 395 },
        weapon_7: { baseProduction: 10, rawCost: 2.0, empSlots: 10, goldCost: 620 },
        aircraft_1: { baseProduction: 5, rawCost: 0.2, empSlots: 1, goldCost: 10 },
        aircraft_2: { baseProduction: 5, rawCost: 0.4, empSlots: 2, goldCost: 20 },
        aircraft_3: { baseProduction: 5, rawCost: 0.6, empSlots: 3, goldCost: 45 },
        aircraft_4: { baseProduction: 5, rawCost: 0.8, empSlots: 5, goldCost: 95 },
        aircraft_5: { baseProduction: 5, rawCost: 1.0, empSlots: 10, goldCost: 195 },
        aircraft_6: { baseProduction: 5, rawCost: 1.0, empSlots: 0, goldCost: 0 },
        aircraft_7: { baseProduction: 5, rawCost: 1.0, empSlots: 0, goldCost: 0 },
        house_1: { baseProduction: 0.20, rawCost: 10, empSlots: 1, goldCost: 10 },
        house_2: { baseProduction: 0.10, rawCost: 20, empSlots: 2, goldCost: 20 },
        house_3: { baseProduction: 0.05, rawCost: 40, empSlots: 3, goldCost: 45 },
        house_4: { baseProduction: 0.025, rawCost: 80, empSlots: 5, goldCost: 95 },
        house_5: { baseProduction: 0.0166666666666667, rawCost: 120, empSlots: 10, goldCost: 195 },
        house_6: { baseProduction: 0.0083333333333333, rawCost: 120, empSlots: 0, goldCost: 0 },
        house_7: { baseProduction: 0.0041666666666667, rawCost: 120, empSlots: 0, goldCost: 0 },
    };

    // ==========================================
    // 2. REGION MAP  (id → { name, permalink })
    // ==========================================
    const REGION_MAP = {
        3: { name: "Dobrogea", permalink: "Dobrogea" },
        5: { name: "Muntenia", permalink: "Muntenia" },
        9: { name: "Oltenia", permalink: "Oltenia" },
        11: { name: "Banat", permalink: "Banat" },
        35: { name: "Transilvania", permalink: "Transilvania" },
        36: { name: "Crisana", permalink: "Crisana" },
        37: { name: "Moldova", permalink: "Moldova" },
        38: { name: "Maramures", permalink: "Maramures" },
        39: { name: "Bucovina", permalink: "Bucovina" },
        40: { name: "Alabama", permalink: "Alabama" },
        41: { name: "Alaska", permalink: "Alaska" },
        42: { name: "Arizona", permalink: "Arizona" },
        43: { name: "Arkansas", permalink: "Arkansas" },
        44: { name: "California", permalink: "California" },
        45: { name: "Colorado", permalink: "Colorado" },
        46: { name: "Connecticut", permalink: "Connecticut" },
        47: { name: "Delaware", permalink: "Delaware" },
        48: { name: "Florida", permalink: "Florida" },
        49: { name: "Georgia", permalink: "Georgia" },
        50: { name: "Hawaii", permalink: "Hawaii" },
        51: { name: "Idaho", permalink: "Idaho" },
        52: { name: "Illinois", permalink: "Illinois" },
        53: { name: "Indiana", permalink: "Indiana" },
        54: { name: "Iowa", permalink: "Iowa" },
        55: { name: "Kansas", permalink: "Kansas" },
        56: { name: "Kentucky", permalink: "Kentucky" },
        57: { name: "Louisiana", permalink: "Louisiana" },
        58: { name: "Maine", permalink: "Maine" },
        59: { name: "Maryland", permalink: "Maryland" },
        60: { name: "Massachusetts", permalink: "Massachusetts" },
        61: { name: "Michigan", permalink: "Michigan" },
        62: { name: "Minnesota", permalink: "Minnesota" },
        63: { name: "Mississippi", permalink: "Mississippi" },
        64: { name: "Missouri", permalink: "Missouri" },
        65: { name: "Montana", permalink: "Montana" },
        66: { name: "Nebraska", permalink: "Nebraska" },
        67: { name: "Nevada", permalink: "Nevada" },
        68: { name: "New Hampshire", permalink: "New-Hampshire" },
        69: { name: "New Jersey", permalink: "New-Jersey" },
        70: { name: "New Mexico", permalink: "New-Mexico" },
        71: { name: "New York", permalink: "New-York" },
        72: { name: "North Carolina", permalink: "North-Carolina" },
        73: { name: "North Dakota", permalink: "North-Dakota" },
        74: { name: "Ohio", permalink: "Ohio" },
        75: { name: "Oklahoma", permalink: "Oklahoma" },
        76: { name: "Oregon", permalink: "Oregon" },
        77: { name: "Pennsylvania", permalink: "Pennsylvania" },
        78: { name: "Rhode Island", permalink: "Rhode-Island" },
        79: { name: "South Carolina", permalink: "South-Carolina" },
        80: { name: "South Dakota", permalink: "South-Dakota" },
        81: { name: "Tennessee", permalink: "Tennessee" },
        82: { name: "Texas", permalink: "Texas" },
        83: { name: "Utah", permalink: "Utah" },
        84: { name: "Vermont", permalink: "Vermont" },
        85: { name: "Virginia", permalink: "Virginia" },
        86: { name: "Washington", permalink: "Washington" },
        87: { name: "West Virginia", permalink: "West-Virginia" },
        88: { name: "Wisconsin", permalink: "Wisconsin" },
        89: { name: "Wyoming", permalink: "Wyoming" },
        90: { name: "District of Columbia", permalink: "District-of-Columbia" },
        91: { name: "Northern Basarabia", permalink: "Northern-Basarabia" },
        92: { name: "Chisinau", permalink: "Chisinau" },
        93: { name: "Southern Basarabia", permalink: "Southern-Basarabia" },
        94: { name: "Transnistria", permalink: "Transnistria" },
        95: { name: "Ontario", permalink: "Ontario" },
        96: { name: "Prince Edward Island", permalink: "Prince-Edward-Island" },
        97: { name: "Alberta", permalink: "Alberta" },
        98: { name: "New Brunswick", permalink: "New-Brunswick" },
        99: { name: "Nova Scotia", permalink: "Nova-Scotia" },
        100: { name: "Quebec", permalink: "Quebec" },
        101: { name: "Saskatchewan", permalink: "Saskatchewan" },
        102: { name: "Newfoundland and Labrador", permalink: "Newfoundland" },
        103: { name: "British Columbia", permalink: "British-Columbia" },
        104: { name: "Yukon", permalink: "Yukon" },
        105: { name: "Manitoba", permalink: "Manitoba" },
        106: { name: "Northwest Territories", permalink: "Northwest-Territories" },
        107: { name: "Nunavut", permalink: "Nunavut" },
        108: { name: "Western Transdanubia", permalink: "Western-Transdanubia" },
        109: { name: "Southern Transdanubia", permalink: "Southern-Transdanubia" },
        110: { name: "Central Transdanubia", permalink: "Central-Transdanubia" },
        111: { name: "Central Hungary", permalink: "Central-Hungary" },
        112: { name: "Northern Hungary", permalink: "Northern-Hungary" },
        113: { name: "Northern Great Plain", permalink: "Northern-Great-Plain" },
        114: { name: "Southern Great Plain", permalink: "Southern-Great-Plain" },
        115: { name: "Valley of Mexico", permalink: "Valley-of-Mexico" },
        116: { name: "Baja", permalink: "Baja" },
        117: { name: "Northwest of Mexico", permalink: "Northwest-of-Mexico" },
        118: { name: "Pacific Coast of Mexico", permalink: "Pacific-Coast-of-Mexico" },
        119: { name: "Oaxaca", permalink: "Oaxaca" },
        120: { name: "Gulf of Mexico", permalink: "Gulf-of-Mexico" },
        121: { name: "Southeast of Mexico", permalink: "Southeast-of-Mexico" },
        122: { name: "Northeast of Mexico", permalink: "Northeast-of-Mexico" },
        123: { name: "Venezuelan Andean", permalink: "Venezuelan-Andean" },
        124: { name: "Venezuelan Capital", permalink: "Venezuelan-Capital" },
        125: { name: "Central Venezuela", permalink: "Central-Venezuela" },
        126: { name: "Central Western Venezuela", permalink: "Central-Western-Venezuela" },
        127: { name: "Guayana", permalink: "Guayana" },
        129: { name: "Llanos", permalink: "Llanos" },
        130: { name: "North Eastern Venezuela", permalink: "North-Eastern-Venezuela" },
        131: { name: "Zulian", permalink: "Zulian" },
        132: { name: "Subcarpathia", permalink: "Subcarpathia" },
        133: { name: "Galicia and Lodomeria", permalink: "Galicia-and-Lodomeria" },
        134: { name: "Volhynia", permalink: "Volhynia" },
        135: { name: "Polisia", permalink: "Polisia" },
        136: { name: "Podolia", permalink: "Podolia" },
        137: { name: "Bukovyna", permalink: "Bukovyna" },
        138: { name: "Dnipro", permalink: "Dnipro" },
        139: { name: "Siveria", permalink: "Siveria" },
        140: { name: "Bassarabia", permalink: "Bassarabia" },
        141: { name: "Zaporozhia", permalink: "Zaporozhia" },
        142: { name: "Sloboda", permalink: "Sloboda" },
        143: { name: "Donbas", permalink: "Donbas" },
        144: { name: "Taurida", permalink: "Taurida" },
        146: { name: "Center West of Brazil", permalink: "Center-West-of-Brazil" },
        147: { name: "North of Brazil", permalink: "North-of-Brazil" },
        148: { name: "Northeast of Brazil", permalink: "Northeast-of-Brazil" },
        149: { name: "Southeast of Brazil", permalink: "Southeast-of-Brazil" },
        150: { name: "Parana and Santa Catarina", permalink: "Parana-and-Santa-Catarina" },
        151: { name: "Pampas", permalink: "Pampas" },
        152: { name: "Argentine Northwest", permalink: "Argentine-Northwest" },
        153: { name: "South East Chaco", permalink: "South-East-Chaco" },
        154: { name: "Mesopotamia", permalink: "Mesopotamia" },
        155: { name: "Cuyo", permalink: "Cuyo" },
        156: { name: "Patagonia", permalink: "Patagonia" },
        157: { name: "Lisboa", permalink: "Lisboa" },
        158: { name: "Norte", permalink: "Norte" },
        159: { name: "Centro", permalink: "Centro" },
        160: { name: "Alentejo", permalink: "Alentejo" },
        161: { name: "Algarve", permalink: "Algarve" },
        162: { name: "Azores", permalink: "Azores" },
        163: { name: "Madeira", permalink: "Madeira" },
        166: { name: "Madrid", permalink: "Madrid" },
        167: { name: "Andalucia", permalink: "Andalucia" },
        168: { name: "Aragon", permalink: "Aragon" },
        169: { name: "Asturias", permalink: "Asturias" },
        170: { name: "Basque Country", permalink: "Basque-Country" },
        171: { name: "Cantabria", permalink: "Cantabria" },
        173: { name: "Castilla y Leon", permalink: "Castilla-Leon" },
        174: { name: "Catalonia", permalink: "Catalonia" },
        175: { name: "Extremadura", permalink: "Extremadura" },
        176: { name: "Galicia", permalink: "Galicia-Spain" },
        177: { name: "Murcia", permalink: "Murcia" },
        178: { name: "Navarra", permalink: "Navarra" },
        179: { name: "La Rioja", permalink: "La-Rioja" },
        180: { name: "Valencian Community", permalink: "Valencian" },
        181: { name: "Castilla La Mancha", permalink: "Castilla-La-Mancha" },
        183: { name: "Canary Islands", permalink: "Canary-Islands" },
        184: { name: "Balearic Islands", permalink: "Balearic-Islands" },
        185: { name: "Alsace", permalink: "Alsace" },
        186: { name: "Aquitaine", permalink: "Aquitaine" },
        187: { name: "Auvergne", permalink: "Auvergne" },
        188: { name: "Brittany", permalink: "Brittany" },
        189: { name: "Burgundy", permalink: "Burgundy" },
        190: { name: "Loire Valley", permalink: "Loire-Valley" },
        191: { name: "Champagne Ardenne", permalink: "Champagne-Ardenne" },
        192: { name: "Corsica", permalink: "Corsica" },
        193: { name: "Franche-comte", permalink: "Franche-comte" },
        194: { name: "Languedoc Roussillon", permalink: "Languedoc-Roussillon" },
        195: { name: "Limousin", permalink: "Limousin" },
        196: { name: "Lorraine", permalink: "Lorraine" },
        197: { name: "Lower Normandy", permalink: "Lower-Normandy" },
        198: { name: "Midi-Pyrenees", permalink: "Midi-Pyrenees" },
        199: { name: "Paris Isle of France", permalink: "Paris-Isle-of-France" },
        200: { name: "Pays de la Loire", permalink: "Pays-de-la-Loire" },
        201: { name: "Picardy", permalink: "Picardy" },
        202: { name: "Poitou Charentes", permalink: "Poitou-Charentes" },
        203: { name: "Provence Alpes Azur", permalink: "Provence-Alpes-Azur" },
        204: { name: "Rhone Alps", permalink: "Rhone-Alps" },
        205: { name: "Upper Normandy", permalink: "Upper-Normandy" },
        207: { name: "North Calais", permalink: "North-Calais" },
        208: { name: "Dublin", permalink: "Dublin" },
        209: { name: "Cork", permalink: "Cork" },
        210: { name: "Shannon", permalink: "Shannon" },
        212: { name: "Mayo", permalink: "Mayo" },
        213: { name: "Wexford", permalink: "Wexford" },
        215: { name: "Louth", permalink: "Louth" },
        216: { name: "London", permalink: "London" },
        217: { name: "Scotland", permalink: "Scotland" },
        218: { name: "Wales", permalink: "Wales" },
        219: { name: "Northern Ireland", permalink: "Northern-Ireland" },
        220: { name: "South East of England", permalink: "South-East-of-England" },
        221: { name: "South West of England", permalink: "South-West-of-England" },
        222: { name: "East Midlands", permalink: "East-Midlands" },
        223: { name: "West Midlands", permalink: "West-Midlands" },
        224: { name: "East of England", permalink: "East-of-England" },
        225: { name: "Yorkshire & Humberside", permalink: "Yorkshire-Humberside" },
        226: { name: "North East of England", permalink: "North-East-of-England" },
        227: { name: "North West of England", permalink: "North-West-of-England" },
        228: { name: "Brussels", permalink: "Brussels" },
        229: { name: "Flanders", permalink: "Flanders" },
        230: { name: "Wallonia", permalink: "Wallonia" },
        231: { name: "Hovedstaden", permalink: "Hovedstaden" },
        232: { name: "Midtjylland", permalink: "Midtjylland" },
        233: { name: "Nordjylland", permalink: "Nordjylland" },
        235: { name: "Sjaelland", permalink: "Sjaelland" },
        236: { name: "Syddanmark", permalink: "Syddanmark" },
        237: { name: "Southern Finland", permalink: "Southern-Finland" },
        238: { name: "Western Finland", permalink: "Western-Finland" },
        239: { name: "Eastern Finland", permalink: "Eastern-Finland" },
        240: { name: "Oulu", permalink: "Oulu" },
        241: { name: "Lapland", permalink: "Lapland" },
        242: { name: "Aland", permalink: "Aland" },
        243: { name: "Baden-Wurttemberg", permalink: "Baden-Wurttemberg" },
        244: { name: "Bavaria", permalink: "Bavaria" },
        246: { name: "Brandenburg and Berlin", permalink: "Brandenburg-and-Berlin" },
        249: { name: "Hesse", permalink: "Hesse" },
        250: { name: "Mecklenburg-Western Pomerania", permalink: "Mecklenburg" },
        251: { name: "Lower Saxony and Bremen", permalink: "Lower-Saxony-and-Bremen" },
        252: { name: "North Rhine-Westphalia", permalink: "North-Rhine-Westphalia" },
        253: { name: "Rhineland-Palatinate", permalink: "Rhineland-Palatinate" },
        254: { name: "Saarland", permalink: "Saarland" },
        255: { name: "Saxony", permalink: "Saxony" },
        256: { name: "Saxony-Anhalt", permalink: "Saxony-Anhalt" },
        257: { name: "Schleswig-Holstein and Hamburg", permalink: "Schleswig-Holstein-and-Hamburg" },
        258: { name: "Thuringia", permalink: "Thuringia" },
        259: { name: "Abruzzo", permalink: "Abruzzo" },
        260: { name: "Aosta Valley", permalink: "Aosta-Valley" },
        261: { name: "Apulia", permalink: "Apulia" },
        262: { name: "Basilicata", permalink: "Basilicata" },
        263: { name: "Calabria", permalink: "Calabria" },
        264: { name: "Campania", permalink: "Campania" },
        265: { name: "Emilia-Romagna", permalink: "Emilia-Romagna" },
        266: { name: "Friuli-Venezia Giulia", permalink: "Friuli-Venezia-Giulia" },
        267: { name: "Lazio", permalink: "Lazio" },
        268: { name: "Liguria", permalink: "Liguria" },
        269: { name: "Lombardy", permalink: "Lombardy" },
        270: { name: "Marche", permalink: "Marche" },
        271: { name: "Molise", permalink: "Molise" },
        272: { name: "Piedmont", permalink: "Piedmont" },
        273: { name: "Sardinia", permalink: "Sardinia" },
        274: { name: "Sicily", permalink: "Sicily" },
        275: { name: "Trentino-South Tyrol", permalink: "Trentino-South-Tyrol" },
        276: { name: "Tuscany", permalink: "Tuscany" },
        277: { name: "Umbria", permalink: "Umbria" },
        278: { name: "Veneto", permalink: "Veneto" },
        291: { name: "Nord-Norge", permalink: "Nord-Norge" },
        292: { name: "Sorlandet", permalink: "Sorlandet" },
        293: { name: "Trondelag", permalink: "Trondelag" },
        294: { name: "Vestlandet", permalink: "Vestlandet" },
        295: { name: "Ostlandet", permalink: "Ostlandet" },
        306: { name: "Pomerania", permalink: "Pomerania" },
        307: { name: "Silesia", permalink: "Silesia" },
        312: { name: "Bratislava", permalink: "Bratislava" },
        315: { name: "Western Slovakia", permalink: "Western-Slovakia" },
        316: { name: "Central Slovakia", permalink: "Central-Slovakia" },
        319: { name: "Eastern Slovakia", permalink: "Eastern-Slovakia" },
        320: { name: "Svealand", permalink: "Svealand" },
        321: { name: "Norrland and Sameland", permalink: "Norrland-Sameland" },
        322: { name: "Jamtland Harjedalen", permalink: "Jamtland-Harjedalen" },
        323: { name: "Bohus", permalink: "Bohus" },
        324: { name: "Scania", permalink: "Scania" },
        325: { name: "Gotaland", permalink: "Gotaland" },
        326: { name: "Smaland", permalink: "Smaland" },
        328: { name: "New South Wales", permalink: "New-South-Wales" },
        329: { name: "Queensland", permalink: "Queensland" },
        330: { name: "South Australia", permalink: "South-Australia" },
        331: { name: "Tasmania", permalink: "Tasmania" },
        332: { name: "Victoria", permalink: "Victoria" },
        333: { name: "Western Australia", permalink: "Western-Australia" },
        334: { name: "Northern Territory", permalink: "Northern-Territory" },
        336: { name: "Deutschschweiz", permalink: "Deutschschweiz" },
        337: { name: "Romandie", permalink: "Romandie" },
        338: { name: "Svizzera italiana", permalink: "Svizzera-italiana" },
        339: { name: "Graubunden", permalink: "Graubunden" },
        340: { name: "Burgenland", permalink: "Burgenland" },
        341: { name: "Carinthia", permalink: "Carinthia" },
        342: { name: "Lower Austria", permalink: "Lower-Austria" },
        343: { name: "Upper Austria", permalink: "Upper-Austria" },
        344: { name: "Salzburg", permalink: "Salzburg" },
        345: { name: "Styria", permalink: "Styria" },
        346: { name: "Tyrol", permalink: "Tyrol" },
        347: { name: "Vorarlberg", permalink: "Vorarlberg" },
        349: { name: "Burgas", permalink: "Burgas" },
        352: { name: "Vidin", permalink: "Vidin" },
        353: { name: "Plovdiv", permalink: "Plovdiv" },
        355: { name: "Sofia", permalink: "Sofia" },
        356: { name: "Varna", permalink: "Varna" },
        358: { name: "Ruse", permalink: "Ruse" },
        361: { name: "Anhui", permalink: "Anhui" },
        362: { name: "Fujian", permalink: "Fujian" },
        363: { name: "Gansu", permalink: "Gansu" },
        364: { name: "Guangdong", permalink: "Guangdong" },
        368: { name: "Heilongjiang", permalink: "Heilongjiang" },
        370: { name: "Hubei", permalink: "Hubei" },
        371: { name: "Hunan", permalink: "Hunan" },
        372: { name: "Jiangsu", permalink: "Jiangsu" },
        373: { name: "Jiangxi", permalink: "Jiangxi" },
        375: { name: "Liaoning", permalink: "Liaoning" },
        377: { name: "Shaanxi", permalink: "Shaanxi" },
        378: { name: "Shandong", permalink: "Shandong" },
        379: { name: "Shanxi", permalink: "Shanxi" },
        380: { name: "Sichuan", permalink: "Sichuan" },
        381: { name: "Yunnan", permalink: "Yunnan" },
        382: { name: "Zhejiang", permalink: "Zhejiang" },
        384: { name: "Guizhou", permalink: "Guizhou" },
        385: { name: "Hainan", permalink: "Hainan" },
        386: { name: "Henan", permalink: "Henan" },
        387: { name: "Jilin", permalink: "Jilin" },
        389: { name: "Qinghai", permalink: "Qinghai" },
        390: { name: "Guangxi", permalink: "Guangxi" },
        391: { name: "Inner Mongolia", permalink: "Inner-Mongolia" },
        392: { name: "Ningxia", permalink: "Ningxia" },
        393: { name: "Xinjiang", permalink: "Xinjiang" },
        394: { name: "Tibet", permalink: "Tibet" },
        395: { name: "Beijing", permalink: "Beijing" },
        396: { name: "Chongqing", permalink: "Chongqing" },
        397: { name: "Shanghai", permalink: "Shanghai" },
        413: { name: "Thrace", permalink: "Thrace" },
        414: { name: "Macedonia", permalink: "Macedonia" },
        415: { name: "Thessaly", permalink: "Thessaly" },
        416: { name: "Epirus", permalink: "Epirus" },
        417: { name: "Central Greece", permalink: "Central-Greece" },
        418: { name: "Attica", permalink: "Attica" },
        419: { name: "Peloponnese", permalink: "Peloponnese" },
        420: { name: "Aegean Islands", permalink: "Aegean-Islands" },
        421: { name: "Ionian Islands", permalink: "Ionian-Islands" },
        422: { name: "Crete", permalink: "Crete" },
        423: { name: "Mazuria", permalink: "Mazuria" },
        424: { name: "Mazovia", permalink: "Mazovia" },
        425: { name: "Little Poland", permalink: "Little-Poland" },
        426: { name: "Greater Poland", permalink: "Greater-Poland" },
        427: { name: "Pomerelia", permalink: "Pomerelia" },
        428: { name: "Upper Silesia", permalink: "Upper-Silesia" },
        429: { name: "Subcarpathia (Poland)", permalink: "Subcarpathia-Poland" },
        430: { name: "Warmia and Mazury", permalink: "Warmia-Mazury" },
        431: { name: "Brest", permalink: "Brest" },
        432: { name: "Gomel", permalink: "Gomel" },
        433: { name: "Grodno", permalink: "Grodno" },
        434: { name: "Minsk", permalink: "Minsk" },
        435: { name: "Mogilev", permalink: "Mogilev" },
        436: { name: "Vitebsk", permalink: "Vitebsk" },
        437: { name: "Bohemia", permalink: "Bohemia" },
        438: { name: "Moravia", permalink: "Moravia" },
        439: { name: "Silesian Czech", permalink: "Silesian-Czech" },
        440: { name: "Northern Japan", permalink: "Northern-Japan" },
        441: { name: "Kanto", permalink: "Kanto" },
        442: { name: "Kansai", permalink: "Kansai" },
        443: { name: "Kyushu", permalink: "Kyushu" },
        444: { name: "Shikoku", permalink: "Shikoku" },
        445: { name: "Tohoku", permalink: "Tohoku" },
        446: { name: "Chubu", permalink: "Chubu" },
        447: { name: "Chugoku", permalink: "Chugoku" },
        448: { name: "Okinawa", permalink: "Okinawa" },
        449: { name: "Andhra Pradesh", permalink: "Andhra-Pradesh" },
        450: { name: "Arunachal Pradesh", permalink: "Arunachal-Pradesh" },
        451: { name: "Assam", permalink: "Assam" },
        452: { name: "Bihar", permalink: "Bihar" },
        453: { name: "Chhattisgarh", permalink: "Chhattisgarh" },
        454: { name: "Goa", permalink: "Goa" },
        455: { name: "Gujarat", permalink: "Gujarat" },
        456: { name: "Haryana", permalink: "Haryana" },
        457: { name: "Himachal Pradesh", permalink: "Himachal-Pradesh" },
        458: { name: "Jharkhand", permalink: "Jharkhand" },
        459: { name: "Karnataka", permalink: "Karnataka" },
        460: { name: "Kerala", permalink: "Kerala" },
        461: { name: "Madhya Pradesh", permalink: "Madhya-Pradesh" },
        462: { name: "Maharashtra", permalink: "Maharashtra" },
        463: { name: "Manipur", permalink: "Manipur" },
        464: { name: "Meghalaya", permalink: "Meghalaya" },
        465: { name: "Mizoram", permalink: "Mizoram" },
        466: { name: "Nagaland", permalink: "Nagaland" },
        467: { name: "Orissa", permalink: "Orissa" },
        468: { name: "Punjab", permalink: "Punjab" },
        469: { name: "Rajasthan", permalink: "Rajasthan" },
        470: { name: "Sikkim", permalink: "Sikkim" },
        471: { name: "Tamil Nadu", permalink: "Tamil-Nadu" },
        472: { name: "Tripura", permalink: "Tripura" },
        473: { name: "Uttar Pradesh", permalink: "Uttar-Pradesh" },
        474: { name: "Uttarakhand", permalink: "Uttarakhand" },
        475: { name: "West Bengal", permalink: "West-Bengal" },
        476: { name: "Andaman and Nicobar Islands", permalink: "Andaman-Nicobar" },
        477: { name: "North Sumatra", permalink: "North-Sumatra" },
        478: { name: "West Sumatra", permalink: "West-Sumatra" },
        479: { name: "South Sumatra", permalink: "South-Sumatra" },
        480: { name: "Borneo", permalink: "Borneo" },
        481: { name: "West Java", permalink: "West-Java" },
        482: { name: "Central Java", permalink: "Central-Java" },
        483: { name: "East Java", permalink: "East-Java" },
        484: { name: "Papua", permalink: "Papua" },
        485: { name: "Sulawesi", permalink: "Sulawesi" },
        486: { name: "Nusa Tenggara", permalink: "Nusa-Tenggara" },
        487: { name: "North Iran", permalink: "North-Iran" },
        488: { name: "West Iran", permalink: "West-Iran" },
        489: { name: "East Iran", permalink: "East-Iran" },
        490: { name: "Central Iran", permalink: "Central-Iran" },
        491: { name: "South Iran", permalink: "South-Iran" },
        492: { name: "North East Iran", permalink: "North-East-Iran" },
        493: { name: "North Pakistan", permalink: "North-Pakistan" },
        494: { name: "South Pakistan", permalink: "South-Pakistan" },
        495: { name: "North Caucasian Georgia", permalink: "North-Caucasian-Georgia" },
        496: { name: "South Caucasian Georgia", permalink: "South-Caucasian-Georgia" },
        497: { name: "Yerevan", permalink: "Yerevan" },
        498: { name: "Nagorno-Karabakh", permalink: "Nagorno-Karabakh" },
        499: { name: "East Azerbaijan", permalink: "East-Azerbaijan" },
        500: { name: "North Azerbaijan", permalink: "North-Azerbaijan" },
        501: { name: "South Azerbaijan", permalink: "South-Azerbaijan" },
        502: { name: "Central Iraq", permalink: "Central-Iraq" },
        503: { name: "Northern Iraq", permalink: "Northern-Iraq" },
        504: { name: "Southern Iraq", permalink: "Southern-Iraq" },
        505: { name: "Northern Lebanon", permalink: "Northern-Lebanon" },
        506: { name: "Southern Lebanon", permalink: "Southern-Lebanon" },
        507: { name: "Northern Syria", permalink: "Northern-Syria" },
        508: { name: "Southern Syria", permalink: "Southern-Syria" },
        509: { name: "Northern Jordan", permalink: "Northern-Jordan" },
        510: { name: "Southern Jordan", permalink: "Southern-Jordan" },
        511: { name: "Northern Israel", permalink: "Northern-Israel" },
        512: { name: "Southern Israel", permalink: "Southern-Israel" },
        513: { name: "Marmara", permalink: "Marmara" },
        514: { name: "Aegean Turkey", permalink: "Aegean-Turkey" },
        515: { name: "Black Sea Coast", permalink: "Black-Sea-Coast" },
        516: { name: "Central Anatolia", permalink: "Central-Anatolia" },
        517: { name: "Mediterranean Coast of Turkey", permalink: "Mediterranean-Coast-of-Turkey" },
        518: { name: "Southeastern Anatolia", permalink: "Southeastern-Anatolia" },
        519: { name: "Gyeonggi-do", permalink: "Gyeonggi" },
        520: { name: "Gangwon-do", permalink: "Gangwon" },
        521: { name: "Chungcheongbuk-do", permalink: "Chungcheongbuk" },
        522: { name: "Chungcheongnam-do", permalink: "Chungcheongnam" },
        523: { name: "Jeollabuk-do", permalink: "Jeollabuk" },
        524: { name: "Jeollanam-do", permalink: "Jeollanam" },
        525: { name: "Gyeongsangbuk-do", permalink: "Gyeongsangbuk" },
        526: { name: "Gyeongsangnam-do", permalink: "Gyeongsangnam" },
        527: { name: "Jeju", permalink: "Jeju" },
        528: { name: "Western Netherlands", permalink: "Western-Netherlands" },
        529: { name: "Southern Netherlands", permalink: "Southern-Netherlands" },
        530: { name: "Eastern Netherlands", permalink: "Eastern-Netherlands" },
        531: { name: "Northern Netherlands", permalink: "Northern-Netherlands" },
        532: { name: "Moscow and Central Russia", permalink: "Moscow-and-Central-Russia" },
        533: { name: "Central Black Earth", permalink: "Central-Black-Earth" },
        534: { name: "Eastern Siberia", permalink: "Eastern-Siberia" },
        535: { name: "Far Eastern Russia", permalink: "Far-Eastern-Russia" },
        536: { name: "Northern Russia", permalink: "Northern-Russia" },
        537: { name: "North Caucasus", permalink: "North-Caucasus" },
        538: { name: "Leningrad Oblast", permalink: "Leningrad-Oblast" },
        540: { name: "Urals", permalink: "Urals" },
        541: { name: "Volga Vyatka", permalink: "Volga-Vyatka" },
        542: { name: "Western Siberia", permalink: "Western-Siberia" },
        543: { name: "Kaliningrad", permalink: "Kaliningrad" },
        544: { name: "Volga", permalink: "Volga" },
        549: { name: "Gotland", permalink: "Gotland" },
        561: { name: "Jammu and Kashmir", permalink: "Jammu-Kashmir" },
        562: { name: "Svalbard & Jan Mayen", permalink: "Svalbard-Jan-Mayen" },
        571: { name: "Slovenian Littoral", permalink: "Slovenian-Littoral" },
        581: { name: "Inner Carniola", permalink: "Inner-Carniola" },
        591: { name: "Upper Carniola", permalink: "Upper-Carniola" },
        601: { name: "Styria and Carinthia", permalink: "Styria-Carinthia" },
        611: { name: "Lower Carniola", permalink: "Lower-Carniola" },
        621: { name: "Prekmurje", permalink: "Prekmurje" },
        622: { name: "Slavonia", permalink: "Slavonia" },
        623: { name: "Central Croatia", permalink: "Central-Croatia" },
        624: { name: "Northwest Croatia", permalink: "Northwest-Croatia" },
        625: { name: "Lika and Gorski Kotar", permalink: "Lika-Gorski-Kotar" },
        626: { name: "Istria and Kvarner", permalink: "Istria-Kvarner" },
        627: { name: "North Dalmatia", permalink: "North-Dalmatia" },
        628: { name: "South Dalmatia", permalink: "South-Dalmatia" },
        629: { name: "Norte Grande", permalink: "Norte-Grande" },
        630: { name: "Norte Chico", permalink: "Norte-Chico" },
        631: { name: "Zona Central", permalink: "Zona-Central" },
        632: { name: "Zona Sur", permalink: "Zona-Sur" },
        633: { name: "Zona Austral", permalink: "Zona-Austral" },
        634: { name: "Vojvodina", permalink: "Vojvodina" },
        635: { name: "Belgrade", permalink: "Belgrade" },
        636: { name: "Sumadija", permalink: "Sumadija" },
        637: { name: "Eastern Serbia", permalink: "Eastern-Serbia" },
        638: { name: "Western Serbia", permalink: "Western-Serbia" },
        639: { name: "Raska", permalink: "Raska" },
        640: { name: "Southern Serbia", permalink: "Southern-Serbia" },
        641: { name: "Sabah", permalink: "Sabah" },
        642: { name: "Sarawak", permalink: "Sarawak" },
        643: { name: "Peninsular Malaysia", permalink: "Peninsular-Malaysia" },
        644: { name: "Luzon", permalink: "Luzon" },
        645: { name: "Visayas", permalink: "Visayas" },
        646: { name: "Mindanao", permalink: "Mindanao" },
        647: { name: "Palawan", permalink: "Palawan" },
        648: { name: "Singapore City", permalink: "Singapore-City" },
        649: { name: "West Srpska Republic", permalink: "West-Srpska-Republic" },
        650: { name: "East Srpska Republic", permalink: "East-Srpska-Republic" },
        651: { name: "Brcko District", permalink: "Brcko-District" },
        652: { name: "Federation of BiH", permalink: "Federation-of-BiH" },
        653: { name: "Rio Grande do Sul", permalink: "Rio-Grande-do-Sul" },
        654: { name: "Pohja-Eesti", permalink: "Pohja-Eesti" },
        655: { name: "Kirde-Eesti", permalink: "Kirde-Eesti" },
        656: { name: "Kesk-Eesti", permalink: "Kesk-Eesti" },
        657: { name: "Laane-Eesti", permalink: "Laane-Eesti" },
        658: { name: "Louna-Eesti", permalink: "Louna-Eesti" },
        659: { name: "Vidzeme", permalink: "Vidzeme" },
        660: { name: "Latgale", permalink: "Latgale" },
        661: { name: "Zemgale", permalink: "Zemgale" },
        662: { name: "Kurzeme", permalink: "Kurzeme" },
        663: { name: "Lithuania Minor", permalink: "Lithuania-Minor" },
        664: { name: "Samogitia", permalink: "Samogitia" },
        665: { name: "Lithuanian Highland", permalink: "Lithuanian-Highland" },
        666: { name: "Dainava", permalink: "Dainava" },
        667: { name: "Sudovia", permalink: "Sudovia" },
        668: { name: "Chagang", permalink: "Chagang" },
        669: { name: "Pyongan", permalink: "Pyongan" },
        670: { name: "Hwangae", permalink: "Hwangae" },
        671: { name: "Kangwon", permalink: "Kangwon" },
        672: { name: "Hamgyong", permalink: "Hamgyong" },
        673: { name: "Ryanggang", permalink: "Ryanggang" },
        674: { name: "Charrua", permalink: "Charrua" },
        675: { name: "Paranena", permalink: "Paranena" },
        676: { name: "Central East Chaco", permalink: "Central-East-Chaco" },
        677: { name: "Chuquisaca and Tarija", permalink: "Chuquisaca-and-Tarija" },
        678: { name: "Beni and Cochabamba", permalink: "Beni-and-Cochabamba" },
        679: { name: "Santa Cruz", permalink: "Santa-Cruz" },
        680: { name: "Bolivian Altiplano", permalink: "Bolivian-Altiplano" },
        681: { name: "Pando", permalink: "Pando" },
        682: { name: "Great Andes", permalink: "Great-Andes" },
        683: { name: "Mid Andes", permalink: "Mid-Andes" },
        684: { name: "Low Andes", permalink: "Low-Andes" },
        685: { name: "Chimor", permalink: "Chimor" },
        686: { name: "Northern Low Amazon", permalink: "Northern-Low-Amazon" },
        687: { name: "Southern Low Amazon", permalink: "Southern-Low-Amazon" },
        688: { name: "Lima", permalink: "Lima" },
        689: { name: "Amazonica", permalink: "Amazonica" },
        690: { name: "Andina", permalink: "Andina" },
        691: { name: "Caribe e Insular", permalink: "Caribe-e-Insular" },
        692: { name: "Orinoquia", permalink: "Orinoquia" },
        693: { name: "Pacifica", permalink: "Pacifica" },
        694: { name: "Cundiboyacense", permalink: "Cundiboyacense" },
        695: { name: "Povardarie", permalink: "Povardarie" },
        696: { name: "Western Macedonia", permalink: "Western-Macedonia" },
        697: { name: "Eastern Macedonia", permalink: "Eastern-Macedonia" },
        698: { name: "North Montenegrin Mountains", permalink: "North-Montenegrin-Mountains" },
        699: { name: "Central Montenegro", permalink: "Central-Montenegro" },
        700: { name: "Montenegrin Coast", permalink: "Montenegrin-Coast" },
        701: { name: "Northern Taiwan", permalink: "Northern-Taiwan" },
        702: { name: "Central Taiwan", permalink: "Central-Taiwan" },
        703: { name: "Eastern Taiwan", permalink: "Eastern-Taiwan" },
        704: { name: "Southern Taiwan", permalink: "Southern-Taiwan" },
        705: { name: "Southern Cyprus", permalink: "Southern-Cyprus" },
        706: { name: "Northern Cyprus", permalink: "Northern-Cyprus" },
        707: { name: "Brestskaya", permalink: "Brestskaya" },
        708: { name: "Homelskaya", permalink: "Homelskaya" },
        709: { name: "Hrodzienskaya", permalink: "Hrodzienskaya" },
        710: { name: "Minskaya", permalink: "Minskaya" },
        711: { name: "Mahilyowskaya", permalink: "Mahilyowskaya" },
        712: { name: "Vitsebskaya", permalink: "Vitsebskaya" },
        713: { name: "Auckland", permalink: "Auckland" },
        714: { name: "Wellington", permalink: "Wellington" },
        715: { name: "Canterbury", permalink: "Canterbury" },
        716: { name: "Otago", permalink: "Otago" },
        717: { name: "Al Riyadh", permalink: "Al-Riyadh" },
        718: { name: "Al Bahah", permalink: "Al-Bahah" },
        719: { name: "Northern Borders", permalink: "Northern-Borders" },
        720: { name: "Al Jawf", permalink: "Al-Jawf" },
        721: { name: "Al Madinah", permalink: "Al-Madinah" },
        722: { name: "Al Qasim", permalink: "Al-Qasim" },
        723: { name: "Ha'il", permalink: "Ha-il" },
        724: { name: "Asir", permalink: "Asir" },
        725: { name: "Eastern Province", permalink: "Eastern-Province" },
        726: { name: "Tabuk", permalink: "Tabuk" },
        727: { name: "Najran", permalink: "Najran" },
        728: { name: "Makkah", permalink: "Makkah" },
        729: { name: "Jizan", permalink: "Jizan" },
        730: { name: "Sinai", permalink: "Sinai" },
        731: { name: "Lower Egypt", permalink: "Lower-Egypt" },
        732: { name: "Western Desert", permalink: "Western-Desert" },
        733: { name: "Middle Egypt", permalink: "Middle-Egypt" },
        734: { name: "Upper Egypt", permalink: "Upper-Egypt" },
        735: { name: "Red Sea Coast", permalink: "Red-Sea-Coast" },
        736: { name: "Abu Dhabi", permalink: "Abu-Dhabi" },
        737: { name: "Dubai", permalink: "Dubai" },
        738: { name: "Sharjah", permalink: "Sharjah" },
        739: { name: "Ajman", permalink: "Ajman" },
        740: { name: "Ras al-Khaimah", permalink: "Ras-al-Khaimah" },
        741: { name: "Umm al Quwain", permalink: "Umm-al-Quwain" },
        742: { name: "Fujairah", permalink: "Fujairah" },
        743: { name: "Kosovo", permalink: "Kosovo" },
        744: { name: "Tirana", permalink: "Tirana" },
        745: { name: "Albanian Coast", permalink: "Albanian-Coast" },
        746: { name: "Southeastern Albania", permalink: "Southeastern-Albania" },
        747: { name: "Abkhazia", permalink: "Abkhazia" },
        748: { name: "West Georgia", permalink: "West-Georgia" },
        749: { name: "Lower Kartli", permalink: "Lower-Kartli" },
        750: { name: "Inner Kartli", permalink: "Inner-Kartli" },
        751: { name: "Kakheti", permalink: "Kakheti" },
        752: { name: "Northern Armenia", permalink: "Northern-Armenia" },
        753: { name: "Central Armenia", permalink: "Central-Armenia" },
        754: { name: "Syunik", permalink: "Syunik" },
        755: { name: "Gegharkunik", permalink: "Gegharkunik" },
        756: { name: "North West States", permalink: "North-West-States" },
        757: { name: "North East States", permalink: "North-East-States" },
        758: { name: "North Central States", permalink: "North-Central-States" },
        759: { name: "South West States", permalink: "South-West-States" },
        760: { name: "South South States", permalink: "South-South-States" },
        761: { name: "South East States", permalink: "South-East-States" },
        762: { name: "Western Cuba", permalink: "Western-Cuba" },
        763: { name: "Las Villas", permalink: "Las-Villas" },
        764: { name: "Oriente", permalink: "Oriente" },
    };

    const REGION_LIST = Object.values(REGION_MAP).sort((a, b) => a.name.localeCompare(b.name));
    const REGION_BY_NAME = new Map(REGION_LIST.map(r => [r.name.toLowerCase(), r]));
    const REGION_BY_PERMALINK = new Map(REGION_LIST.map(r => [r.permalink.toLowerCase(), r]));

    // ==========================================
    // 3. STATE
    // ==========================================
    function defaultState() {
        return { holdings: [], tycoonBonus: 0, productivityCache: {}, citizenCountry: '', salary: 0, priceOverrides: {} };
    }
    // Session-only country economy cache: { [countryPermalink]: { timestamp, avgSalary, workTax: {industryId: rate} } }
    let countryEconCache = {};
    let pricesSidebarOpen = localStorage.getItem('erep_sim_prices_open') !== '0';

    let State = (() => {
        try {
            const s = JSON.parse(localStorage.getItem(LS_KEY)) || defaultState();
            if (!s.priceOverrides) s.priceOverrides = {};
            return s;
        }
        catch { return defaultState(); }
    })();

    function saveState() {
        localStorage.setItem(LS_KEY, JSON.stringify(State));
    }

    function newId() { return Math.random().toString(36).slice(2, 9); }

    // ==========================================
    // 4. API
    // ==========================================
    async function fetchProductivityFromApi(permalinks) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://productivityapi.curlybear.eu/productivity/query',
                data: JSON.stringify({ permalinks }),
                headers: { 'Content-Type': 'application/json' },
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        try { resolve(JSON.parse(r.responseText)); }
                        catch { reject('Invalid response'); }
                    } else {
                        reject('HTTP ' + r.status);
                    }
                },
                onerror: () => reject('Network error')
            });
        });
    }

    async function refreshAllProductivity() {
        const permalinks = [...new Set(
            State.holdings
                .filter(h => h.regionPermalink)
                .map(h => h.regionPermalink)
        )];
        if (!permalinks.length) {
            showToast('No regions configured on any holding.', 'info');
            return;
        }

        const btn = document.getElementById('btn-fetch');
        btn.disabled = true;
        btn.textContent = 'Fetching…';

        try {
            const data = await fetchProductivityFromApi(permalinks);
            const now = Date.now();
            data.forEach(entry => {
                if (entry.permalink) {
                    State.productivityCache[entry.permalink] = { timestamp: now, data: entry };
                    if (entry.country) {
                        State.holdings.forEach(h => {
                            if (h.regionPermalink === entry.permalink) h.countryPermalink = entry.country;
                        });
                    }
                }
            });
            saveState();
            renderSidebar();
            renderResults();
            showToast(`Productivity updated for ${data.length} region(s).`, 'success');
        } catch (err) {
            showToast('Fetch failed: ' + err, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Fetch All Productivity';
        }
    }

    function parseMarketPrices(raw) {
        const result = {};
        for (const countryData of Object.values(raw)) {
            for (const [industry, qualities] of Object.entries(countryData)) {
                if (!qualities || typeof qualities !== 'object' || Array.isArray(qualities)) continue;
                for (const [quality, offers] of Object.entries(qualities)) {
                    if (!Array.isArray(offers) || !offers.length) continue;
                    const key = `${industry}_${quality}`;
                    for (const o of offers) {
                        if (o.gross > 0 && (result[key] === undefined || o.gross < result[key]))
                            result[key] = o.gross;
                    }
                }
            }
        }
        return result;
    }

    function getMarketPrice(industry, quality) {
        const mKey = MARKET_KEY[industry];
        if (!mKey) return null;
        const q = industry.endsWith('_raw') ? 'q1' : `q${quality}`;
        const key = `${mKey}_${q}`;
        if (State.priceOverrides && State.priceOverrides[key] !== undefined) return State.priceOverrides[key];
        if (!marketPriceCache.prices) return null;
        return marketPriceCache.prices[key] ?? null;
    }

    async function fetchMarketPricesFromApi() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://www.erepublik.com/en/economy/marketpicture',
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        try { resolve(JSON.parse(r.responseText)); }
                        catch { reject('Invalid JSON'); }
                    } else {
                        reject('HTTP ' + r.status);
                    }
                },
                onerror: () => reject('Network error')
            });
        });
    }

    async function refreshMarketPrices() {
        const btn = document.getElementById('btn-market');
        if (btn) { btn.disabled = true; btn.textContent = 'Fetching…'; }
        try {
            const raw = await fetchMarketPricesFromApi();
            marketPriceCache = { timestamp: Date.now(), prices: parseMarketPrices(raw) };
            renderResults();
            renderPricesSidebar();
            showToast('Market prices updated.', 'success');
        } catch (err) {
            showToast('Market fetch failed: ' + err, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Fetch Market Prices'; }
        }
    }

    async function importFromGame() {
        const btn = document.getElementById('btn-import-game');
        if (btn) { btn.disabled = true; btn.textContent = 'Importing…'; }
        try {
            const resp = await fetch('https://www.erepublik.com/en/economy/myCompanies', { credentials: 'include' });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const html = await resp.text();

            const companiesMatch = html.match(/var companies\s*=\s*(\{.*\});/);
            if (!companiesMatch) throw new Error('companies data not found in page');
            const companies = JSON.parse(companiesMatch[1]);

            const holdingsMatch = html.match(/var holdingCompanies\s*=\s*(\{.*\});/);
            if (!holdingsMatch) throw new Error('holdingCompanies data not found in page');
            const holdingCompanies = JSON.parse(holdingsMatch[1]);

            // Build holding stubs keyed by game holding ID
            const holdingMap = {};
            for (const [hid, h] of Object.entries(holdingCompanies)) {
                const region = REGION_MAP[h.region_id];
                holdingMap[hid] = {
                    id: newId(), name: h.name,
                    regionName: region ? region.name : '',
                    regionPermalink: region ? region.permalink : '',
                    countryPermalink: '', companies: [], salary: 0, expanded: false,
                };
            }

            // Group companies by holding + building type (filename is the authoritative type identifier).
            const groupMap = {};
            for (const comp of Object.values(companies)) {
                if (!comp.is_assigned_to_holding || !comp.holding_company_id) continue;
                const hid = String(comp.holding_company_id);
                if (!holdingMap[hid]) continue;
                const fname = comp.building_img ? comp.building_img.split('/').pop() : '';
                const def = BUILDING_DEFS[fname];
                if (!def) continue;
                const key = `${hid}_${fname}`;
                if (!groupMap[key]) groupMap[key] = { hid, industry: def.industry, quality: def.quality, wam: 0, employees: 0 };
                groupMap[key].wam += comp.wam_enabled ? 1 : 0;
                if (WAM_UNABLE.has(def.industry)) groupMap[key].employees += parseInt(comp.employee_limit) || 0;
            }
            for (const { hid, industry, quality, wam, employees } of Object.values(groupMap)) {
                holdingMap[hid].companies.push({ id: newId(), industry, quality, wam, employees });
            }

            // Auto-populate countryPermalink from productivity cache if available
            for (const h of Object.values(holdingMap)) {
                if (h.regionPermalink) {
                    const cached = State.productivityCache[h.regionPermalink];
                    if (cached?.data?.country) h.countryPermalink = cached.data.country;
                }
            }

            State.holdings = Object.values(holdingMap);
            saveState();
            renderSidebar();
            renderResults();
            showToast(`Imported ${State.holdings.length} holding(s) from game.`, 'success');
        } catch (err) {
            showToast('Game import failed: ' + err.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Import from Game'; }
        }
    }

    function parseCountryEconomy(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // Average salary — second .citizens table, row containing "Average"
        let avgSalary = 0;
        for (const table of doc.querySelectorAll('table.citizens')) {
            for (const row of table.querySelectorAll('tr')) {
                if (row.textContent.includes('Average')) {
                    const val = row.querySelector('span.special');
                    if (val) avgSalary = parseFloat(val.textContent.replace(/,/g, '')) || 0;
                }
            }
        }
        // Work tax by industry ID — table.citizens.largepadded rows with industry icon in src
        const workTax = {};
        const taxTable = doc.querySelector('table.citizens.largepadded');
        if (taxTable) {
            for (const row of taxTable.querySelectorAll('tr')) {
                const img = row.querySelector('img[src*="/industry/"]');
                const specials = row.querySelectorAll('span.special');
                if (img && specials.length > 0) {
                    const m = img.src.match(/\/industry\/(\d+)\//);
                    if (m) workTax[parseInt(m[1])] = parseFloat(specials[0].textContent) / 100;
                }
            }
        }
        return { avgSalary, workTax };
    }

    async function fetchCountryEcon(countryPermalink) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://www.erepublik.com/en/country/economy/${encodeURIComponent(countryPermalink)}`,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                onload: r => {
                    if (r.status >= 200 && r.status < 300) resolve(r.responseText);
                    else reject('HTTP ' + r.status);
                },
                onerror: () => reject('Network error')
            });
        });
    }

    async function ensureCountryData(permalink) {
        if (!permalink) return null;
        const cached = countryEconCache[permalink];
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) return cached;
        try {
            const html = await fetchCountryEcon(permalink);
            const data = { timestamp: Date.now(), ...parseCountryEconomy(html) };
            countryEconCache[permalink] = data;
            return data;
        } catch { return null; }
    }

    function getWamTaxPerAction(industryId, holdingData, citizenData) {
        const hRate = holdingData ? (holdingData.workTax[industryId] || 0) * holdingData.avgSalary : 0;
        const cRate = citizenData ? (citizenData.workTax[industryId] || 0) * citizenData.avgSalary : 0;
        return 0.8 * hRate + 0.2 * cRate;
    }

    // ==========================================
    // 5. PRODUCTION ENGINE
    // ==========================================
    function getRegionProductivity(permalink, industry, quality) {
        const tycoonAdd = State.tycoonBonus || 0;
        const cached = permalink ? State.productivityCache[permalink] : null;
        if (!cached) return { value: 100 + tycoonAdd, hasData: false, fresh: false };

        const d = cached.data;
        const isRaw = industry.endsWith('_raw');
        let apiVal;

        if (isRaw) {
            const shorthand = { food: 'frm', weapon: 'wrm', house: 'hrm', aircraft: 'arm' };
            const baseInd = industry.replace('_raw', '');
            apiVal = d[`${shorthand[baseInd]}_productivity`] || 1;
        } else {
            apiVal = d[`${industry}_${quality}_productivity`] || 1;
        }

        const fresh = (Date.now() - cached.timestamp) < CACHE_TTL;
        return { value: (apiVal * 100) + tycoonAdd, hasData: true, fresh };
    }

    const WAM_UNABLE = new Set(['house', 'house_raw', 'aircraft', 'aircraft_raw']);

    function computeHolding(holding, holdingCountryData, citizenCountryData) {
        const rawBalance = { FRM: 0, WRM: 0, HRM: 0, ARM: 0 };
        const groups = [];
        let totalGoldCost = 0;
        let totalCcCost = 0;
        let totalMinCo = 0;
        let dailyWamTax = 0;

        for (const comp of holding.companies) {
            const { industry, quality } = comp;
            const count = (comp.wam || 0) + (comp.employees || 0);
            if (count <= 0) continue;
            const def = DEFS[`${industry}_${quality}`];
            if (!def) continue;

            const { value: prod, hasData, fresh } = getRegionProductivity(holding.regionPermalink, industry, quality);
            const dailyOutput = def.baseProduction * prod / 100 * count;
            const isRaw = industry.endsWith('_raw');
            const baseInd = isRaw ? industry.replace('_raw', '') : industry;
            const rawType = RAW_NAMES[baseInd];

            if (isRaw) {
                rawBalance[rawType] += dailyOutput;
            } else if (def.rawCost) {
                rawBalance[rawType] -= dailyOutput * def.rawCost;
            }

            const canWam = !WAM_UNABLE.has(industry);
            const empSlots = def.empSlots || 0;
            const empCo = empSlots > 0 ? Math.ceil((comp.employees || 0) / empSlots) : 0;
            const minCo = Math.max(canWam ? (comp.wam || 0) : 0, empCo);
            totalGoldCost += minCo * (def.goldCost || 0);
            totalCcCost += minCo * (def.ccCost || 0);
            totalMinCo += minCo;

            const unitPrice = getMarketPrice(industry, quality);
            const dailyRevenue = unitPrice !== null ? dailyOutput * unitPrice : null;

            const industryId = INDUSTRY_IDS[industry] || 0;
            const wamTaxPerAction = getWamTaxPerAction(industryId, holdingCountryData, citizenCountryData);
            const groupWamTax = (comp.wam || 0) * wamTaxPerAction;
            dailyWamTax += groupWamTax;

            groups.push({ ...comp, def, prod, dailyOutput, isRaw, rawType, hasData, fresh, count, canWam, minCo, unitPrice, dailyRevenue, wamTaxPerAction, groupWamTax });
        }

        const totalEmployees = groups.reduce((s, g) => s + (g.employees || 0), 0);
        const dailySalaryCost = (State.salary || 0) * totalEmployees;

        return { groups, rawBalance, totalGoldCost, totalCcCost, totalMinCo, totalEmployees, dailySalaryCost, dailyWamTax };
    }

    // ==========================================
    // 6. HELPERS
    // ==========================================
    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function fmt(n, dec = 0) {
        return Number(n.toFixed(dec)).toLocaleString();
    }

    function industryLabel(industry) {
        return {
            food_raw: 'Food Raw', weapon_raw: 'Weapon Raw', house_raw: 'House Raw',
            aircraft_raw: 'Aircraft Raw', food: 'Food', weapon: 'Weapons',
            house: 'Houses', aircraft: 'Aircraft'
        }[industry] || industry;
    }

    function exportHoldings() {
        const json = JSON.stringify(State.holdings, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'holdings-sim.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importHoldings(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                if (!Array.isArray(data)) throw new Error('expected array of holdings');
                State.holdings = data;
                saveState();
                renderSidebar();
                renderResults();
                showToast(`Imported ${data.length} holding(s).`, 'success');
            } catch (err) {
                showToast('Import failed: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    function lookupRegion(input) {
        const q = input.trim().toLowerCase();
        if (!q) return null;
        return REGION_BY_NAME.get(q) || REGION_BY_PERMALINK.get(q) || null;
    }

    function showToast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = msg;
        container.appendChild(el);
        setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 350); }, 3000);
    }

    // ==========================================
    // 7. CSS
    // ==========================================
    function buildCSS() {
        return `<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; }
:root {
    --bg: #090c12; --bg2: #0f1420; --bg3: #141926;
    --surface: #1a2133; --surface2: #202840;
    --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.12);
    --accent: #ff9800; --accent-dim: rgba(255,152,0,0.10);
    --text: #e8eaf0; --muted: #8896b0; --dim: #a8b2c8;
    --green: #4caf7d; --red: #e05757; --gold: #f0c040;
}
html, body { height: 100%; margin: 0 !important; padding: 0 !important; background: var(--bg) !important; overflow: hidden; }
body { font-family: 'Space Grotesk', sans-serif; color: var(--text); font-size: 13px; }
#sim-root { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); position: relative; }
#sim-root::before {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: linear-gradient(rgba(255,152,0,0.012) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,152,0,0.012) 1px, transparent 1px);
    background-size: 60px 60px;
}
#sim-root > * { position: relative; z-index: 1; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--surface2); border-radius: 4px; }

/* Topbar */
#sim-topbar {
    height: 52px; flex-shrink: 0; display: flex; align-items: center;
    justify-content: space-between; padding: 0 24px;
    background: rgba(9,12,18,0.9); backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
}
.sim-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
.topbar-left { display: flex; align-items: center; gap: 12px; }
.topbar-right { display: flex; align-items: center; gap: 16px; }
.bar-sep { width: 1px; height: 16px; background: var(--border); }
.item-label { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--muted); }

/* Body */
#sim-body { flex: 1; display: flex; overflow: hidden; background: var(--bg); }

/* Sidebar */
#sim-sidebar {
    width: 20%; flex-shrink: 0; border-right: 1px solid var(--border);
    padding: 14px; background: rgba(15,20,32,0.6);
    display: flex; flex-direction: column; min-height: 0;
}
#holdings-list {
    flex: 1; overflow-y: auto; min-height: 0;
    padding: 0 0 8px 0;
}
#sidebar-footer { padding-top: 10px; border-top: 1px solid var(--border); flex-shrink: 0; }
.sec-title {
    font-size: 11px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase;
    letter-spacing: 0.12em; color: var(--accent); font-weight: 600; margin-bottom: 12px;
}
.field-label {
    font-size: 10px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted); margin-bottom: 5px;
}

/* Form controls */
.inp, .sel {
    background: var(--bg2); border: 1px solid var(--border2); border-radius: 6px;
    color: var(--text); padding: 7px 9px; font-size: 12px;
    font-family: 'Space Grotesk', sans-serif; outline: none; transition: border-color 0.2s;
}
.inp { width: 100%; }
.sel { appearance: none; cursor: pointer; }
.inp:focus, .sel:focus { border-color: var(--accent); }

/* Buttons */
.btn {
    padding: 7px 14px; border-radius: 7px; border: none; cursor: pointer;
    font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 12px;
    transition: all 0.18s; display: inline-flex; align-items: center; gap: 6px;
    background: var(--accent); color: #090c12;
}
.btn:hover:not(:disabled) { opacity: 0.88; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-sec { background: var(--surface2); color: var(--dim); border: 1px solid var(--border2); }
.btn-sm { padding: 5px 10px; font-size: 11px; }

/* Holding cards */
.holding-card {
    background: var(--surface); border-radius: 8px; border: 1px solid var(--border);
    margin-bottom: 8px; overflow: hidden;
}
.holding-header {
    display: flex; align-items: center; gap: 8px; padding: 10px 12px;
    cursor: pointer; user-select: none; transition: background 0.15s;
}
.holding-header:hover { background: rgba(255,152,0,0.04); }
.h-chevron { font-size: 10px; color: var(--muted); transition: transform 0.18s; flex-shrink: 0; }
.holding-card.expanded .h-chevron { transform: rotate(90deg); }
.h-name { flex: 1; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.h-meta { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: var(--muted); flex-shrink: 0; }
.btn-del-h {
    background: transparent; border: none; color: var(--muted); cursor: pointer;
    font-size: 16px; line-height: 1; padding: 0 2px; opacity: 0.5;
    transition: opacity 0.15s, color 0.15s; flex-shrink: 0;
}
.btn-del-h:hover { opacity: 1; color: var(--red); }
.holding-body { padding: 12px; border-top: 1px solid var(--border); }
.h-field { margin-bottom: 10px; }

/* Company group rows */
.comp-header {
    display: grid; grid-template-columns: minmax(0, 1fr) 46px 44px 44px 20px;
    gap: 4px; margin-bottom: 3px;
}
.comp-header span {
    font-size: 9px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--muted); text-align: center;
}
.comp-row {
    display: grid; grid-template-columns: minmax(0, 1fr) 46px 44px 44px 20px;
    gap: 4px; align-items: center; margin-bottom: 4px;
}
.btn-del-c {
    background: transparent; border: none; color: var(--muted); cursor: pointer;
    font-size: 15px; line-height: 1; padding: 0; text-align: center;
    transition: color 0.15s;
}
.btn-del-c:hover { color: var(--red); }

/* Status badges */
.badge {
    font-size: 10px; font-family: 'JetBrains Mono', monospace;
    border-radius: 100px; padding: 1px 7px; margin-left: 5px; display: inline-block;
}
.badge-fresh { color: var(--green); background: rgba(76,175,125,0.1); border: 1px solid rgba(76,175,125,0.2); }
.badge-stale { color: var(--red); background: rgba(224,87,87,0.1); border: 1px solid rgba(224,87,87,0.2); }
.badge-nodata { color: var(--muted); background: rgba(255,255,255,0.05); border: 1px solid var(--border2); }

/* Main results area */
#sim-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
#sim-scroll { flex: 1; overflow-y: auto; padding: 16px 20px; }
#sim-footer {
    flex-shrink: 0; border-top: 1px solid var(--border);
    background: rgba(15,20,32,0.85); backdrop-filter: blur(8px);
    padding: 12px 24px;
}
#sim-footer .summary-card { margin-bottom: 0; border-radius: 6px; }
.results-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 60%; color: var(--muted); font-size: 13px; text-align: center; gap: 12px;
}
.results-empty .empty-icon { font-size: 40px; opacity: 0.25; }

/* Result cards */
.result-card { background: var(--surface); border-radius: 8px; border: 1px solid var(--border); margin-bottom: 12px; overflow: hidden; }
.rc-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 14px; background: var(--bg3); border-bottom: 1px solid var(--border);
}
.rc-title { font-weight: 600; font-size: 13px; letter-spacing: -0.01em; }
.rc-region { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--muted); margin-left: 8px; }
.rc-count { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--muted); }
.result-table { width: 100%; border-collapse: collapse; }
.result-table th {
    padding: 6px 12px; font-size: 10px; font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted);
    text-align: left; border-bottom: 1px solid var(--border); background: var(--bg2);
}
.result-table th.r { text-align: right; }
.result-table td { padding: 6px 12px; font-size: 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.result-table td.mono { font-family: 'JetBrains Mono', monospace; }
.result-table td.r { text-align: right; }
.result-table tr:last-child td { border-bottom: none; }
.result-table tr:hover td { background: rgba(255,152,0,0.03); }
.holding-summary {
    display: flex; align-items: center; gap: 12px; padding: 8px 12px;
    background: var(--bg2); border-top: 1px solid var(--border); flex-wrap: wrap;
}
.hs-prod { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.hs-item { font-size: 11px; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 5px; }
.hs-gold {
    display: flex; flex-direction: column; align-items: flex-end; gap: 3px;
    border-left: 1px solid var(--border);
    font-family: 'JetBrains Mono', monospace; white-space: nowrap;
    background: rgba(255,255,255,0.015); border-radius: 0 0 8px 0; padding: 8px 12px;
}

/* Summary card */
.summary-card { background: var(--surface2); border-radius: 8px; border: 1px solid var(--border); padding: 16px 20px; margin-bottom: 20px; }
.summary-card h3 {
    font-size: 11px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase;
    letter-spacing: 0.12em; color: var(--accent); margin: 0 0 14px 0; font-weight: 600;
}
.summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.summary-item { background: var(--bg2); border-radius: 6px; padding: 10px 12px; border: 1px solid var(--border); }
.si-label { font-size: 10px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 4px; }
.si-value { font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

/* Toasts */
#toast-container { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 10000; }
.toast {
    background: rgba(9,12,18,0.95); backdrop-filter: blur(8px); color: var(--text);
    padding: 12px 20px; border-radius: 8px; border-left: 4px solid var(--accent);
    box-shadow: 0 4px 15px rgba(0,0,0,0.5); font-size: 13px; min-width: 240px;
    animation: toast-in 0.3s ease-out;
}
.toast.error { border-left-color: var(--red); }
.toast.success { border-left-color: var(--green); }
.toast.fade-out { opacity: 0; transform: translateX(100%); transition: opacity 0.3s, transform 0.3s; }
@keyframes toast-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

/* Prices sidebar */
#sim-prices-sidebar {
    flex-shrink: 0; width: 260px; border-left: 1px solid var(--border);
    background: rgba(15,20,32,0.6); display: flex; flex-direction: column;
    transition: width 0.2s ease; overflow: hidden;
}
#sim-prices-sidebar.collapsed { width: 28px; cursor: pointer; }
#prices-toggle-btn {
    background: transparent; border: none; color: var(--muted); cursor: pointer;
    font-size: 14px; padding: 2px 4px; transition: color 0.15s; line-height: 1;
}
#prices-toggle-btn:hover { color: var(--text); }
#prices-collapsed-tab {
    display: flex; align-items: center; justify-content: center;
    height: 100%; padding: 16px 0;
}
#prices-collapsed-tab span {
    writing-mode: vertical-rl; transform: rotate(180deg);
    font-size: 10px; font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted);
    user-select: none;
}
#prices-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; flex-shrink: 0; border-bottom: 1px solid var(--border);
    white-space: nowrap;
}
#prices-body { flex: 1; overflow-y: auto; padding: 8px 6px; }
.price-group { margin-bottom: 10px; }
.price-group-title {
    font-size: 10px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--accent); padding: 0 4px; margin-bottom: 3px;
}
.price-row {
    display: grid; grid-template-columns: 20px 18px 1fr 100px;
    gap: 4px; align-items: center; padding: 3px 4px; border-radius: 4px;
}
.price-row:hover { background: rgba(255,255,255,0.03); }
.price-q { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: var(--muted); }
.price-val {
    font-size: 11px; font-family: 'JetBrains Mono', monospace;
    color: var(--dim); text-align: right; white-space: nowrap;
}
.price-override-inp {
    background: var(--bg2); border: 1px solid var(--border); border-radius: 4px;
    color: var(--text); padding: 2px 5px; font-size: 11px;
    font-family: 'JetBrains Mono', monospace; text-align: right; width: 100%; outline: none;
}
.price-override-inp:focus { border-color: var(--accent); }
.price-override-inp.has-override { border-color: rgba(255,152,0,0.5); color: var(--accent); }
</style>`;
    }

    // ==========================================
    // 8. HTML SHELL
    // ==========================================
    function buildShell() {
        return `<div id="sim-root">
    <div id="toast-container"></div>
    <header id="sim-topbar">
        <div class="topbar-left">
            <span class="sim-dot"></span>
            <span style="font-size:15px;font-weight:600;letter-spacing:-0.02em;">Holdings Simulator</span>
        </div>
        <div class="topbar-right">
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="item-label">Citizenship</span>
                <input id="citizen-country-input" type="text" style="background:var(--bg2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;font-family:'JetBrains Mono',monospace;outline:none;width:120px;" placeholder="Country…" value="${esc(State.citizenCountry || '')}">
            </div>
            <div class="bar-sep"></div>
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="item-label">Avg Salary</span>
                <input id="salary-input" type="number" min="0" step="0.01" style="background:var(--bg2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;font-family:'JetBrains Mono',monospace;outline:none;width:80px;" placeholder="0" value="${State.salary || 0}">
            </div>
            <div class="bar-sep"></div>
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="item-label">Tycoon Bonus</span>
                <select id="tycoon-input" style="background:var(--bg2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;font-family:'JetBrains Mono',monospace;outline:none;cursor:pointer;">
                    <option value="0"${State.tycoonBonus === 0 ? ' selected' : ''}>0%</option>
                    <option value="20"${State.tycoonBonus === 20 ? ' selected' : ''}>20%</option>
                    <option value="26"${State.tycoonBonus === 26 ? ' selected' : ''}>26%</option>
                </select>
            </div>
            <div class="bar-sep"></div>
            <button id="btn-import-game" class="btn btn-sec">Import from Game</button>
            <div class="bar-sep"></div>
            <button id="btn-market" class="btn btn-sec">Fetch Market Prices</button>
            <div class="bar-sep"></div>
            <button id="btn-fetch" class="btn">Fetch All Productivity</button>
        </div>
    </header>
    <div id="sim-body">
        <aside id="sim-sidebar"></aside>
        <main id="sim-main"></main>
        <aside id="sim-prices-sidebar"></aside>
    </div>
</div>`;
    }

    // ==========================================
    // 9. SIDEBAR RENDER
    // ==========================================
    function industryOpts(selected) {
        const opts = [
            ['food_raw', 'Food Raw'], ['weapon_raw', 'Weapon Raw'],
            ['house_raw', 'House Raw'], ['aircraft_raw', 'Aircraft Raw'],
            ['food', 'Food'], ['weapon', 'Weapons'],
            ['aircraft', 'Aircraft'], ['house', 'Houses'],
        ];
        return opts.map(([v, l]) => `<option value="${v}"${v === selected ? ' selected' : ''}>${l}</option>`).join('');
    }

    function qualityOpts(industry, selected) {
        const max = industry.endsWith('_raw') ? 5 : 7;
        let html = '';
        for (let q = 1; q <= max; q++) {
            const def = DEFS[`${industry}_${q}`];
            const lbl = `Q${q}`;
            html += `<option value="${q}"${q === selected ? ' selected' : ''}>${lbl}</option>`;
        }
        return html;
    }

    function renderSidebar() {
        const el = document.getElementById('sim-sidebar');
        if (!el) return;

        const datalist = `<datalist id="rgn-list">${REGION_LIST.map(r => `<option value="${esc(r.name)}">`).join('')
            }</datalist>`;

        let html = datalist;
        html += `<div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;margin-bottom:2px;border-bottom:1px solid var(--border);">`;
        html += `<span class="sec-title" style="margin-bottom:0;">${State.holdings.length ? State.holdings.length + ' Holdings' : 'Holdings'}</span>`;
        html += `<span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--muted);">${State.holdings.reduce((s,h)=>s+h.companies.length,0)} groups</span>`;
        html += `</div>`;
        html += `<div id="holdings-list">`;

        if (!State.holdings.length) {
            html += `<p style="font-size:11px;color:var(--muted);margin:0 0 8px 0;line-height:1.6;">No holdings yet. Create one to start planning.</p>`;
        }

        for (const h of State.holdings) {
            const cached = h.regionPermalink ? State.productivityCache[h.regionPermalink] : null;
            const freshStatus = cached
                ? ((Date.now() - cached.timestamp) < CACHE_TTL ? 'fresh' : 'stale')
                : 'nodata';

            html += `<div class="holding-card${h.expanded ? ' expanded' : ''}" data-hid="${h.id}">`;
            html += `<div class="holding-header" data-action="toggle" data-hid="${h.id}">`;
            html += `<span class="h-chevron">▶</span>`;
            html += `<span class="h-name">${esc(h.name || 'Unnamed Holding')}</span>`;
            if (!h.expanded) {
                html += `<span class="h-meta">${h.companies.length} co.</span>`;
            }
            html += `<button class="btn-del-h" data-action="delete-holding" data-hid="${h.id}" title="Delete">×</button>`;
            html += `</div>`;

            if (h.expanded) {
                html += `<div class="holding-body">`;

                // Name
                html += `<div class="h-field">`;
                html += `<div class="field-label">Name</div>`;
                html += `<input class="inp" type="text" data-field="name" data-hid="${h.id}" value="${esc(h.name || '')}" placeholder="Holding name…">`;
                html += `</div>`;

                // Region
                html += `<div class="h-field">`;
                html += `<div class="field-label">Region</div>`;
                html += `<input class="inp" type="text" list="rgn-list" data-field="region" data-hid="${h.id}" value="${esc(h.regionName || '')}" placeholder="Type region name…">`;
                if (h.regionPermalink) {
                    const cls = freshStatus === 'fresh' ? 'badge-fresh' : freshStatus === 'stale' ? 'badge-stale' : 'badge-nodata';
                    const lbl = freshStatus === 'fresh' ? 'fresh' : freshStatus === 'stale' ? 'stale' : 'no data';
                    html += `<span class="badge ${cls}">${lbl}</span>`;
                }
                if (h.countryPermalink) {
                    html += `<div style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--muted);margin-top:4px;">Country: <span style="color:var(--dim);">${esc(h.countryPermalink)}</span></div>`;
                }
                html += `</div>`;

                // Company groups
                html += `<div class="field-label" style="margin-bottom:6px;">Company Groups</div>`;
                if (!h.companies.length) {
                    html += `<p style="font-size:11px;color:var(--muted);margin:0 0 8px 0;">No companies added yet.</p>`;
                } else {
                    html += `<div class="comp-header"><span></span><span></span><span>WAM</span><span>Emp</span><span></span></div>`;
                }
                for (const c of h.companies) {
                    const canWam = !['house', 'house_raw', 'aircraft', 'aircraft_raw'].includes(c.industry);
                    const wamStyle = `padding:5px 4px;font-size:11px;font-family:'JetBrains Mono',monospace;text-align:right;${canWam ? '' : 'opacity:0.3;'}`;
                    html += `<div class="comp-row" data-cid="${c.id}" data-hid="${h.id}">`;
                    html += `<select class="sel" style="font-size:11px;padding:5px 6px;" data-field="industry" data-cid="${c.id}" data-hid="${h.id}">${industryOpts(c.industry)}</select>`;
                    html += `<select class="sel" style="font-size:11px;padding:5px 6px;" data-field="quality" data-cid="${c.id}" data-hid="${h.id}">${qualityOpts(c.industry, c.quality)}</select>`;
                    html += `<input class="inp" type="number" style="${wamStyle}" data-field="wam" data-cid="${c.id}" data-hid="${h.id}" value="${c.wam || 0}" min="0" max="9999"${canWam ? '' : ' disabled tabindex="-1"'}>`;
                    html += `<input class="inp" type="number" style="padding:5px 4px;font-size:11px;font-family:'JetBrains Mono',monospace;text-align:right;" data-field="employees" data-cid="${c.id}" data-hid="${h.id}" value="${c.employees || 0}" min="0" max="9999">`;
                    html += `<button class="btn-del-c" data-action="delete-company" data-cid="${c.id}" data-hid="${h.id}" title="Remove">×</button>`;
                    html += `</div>`;
                }
                html += `<button class="btn btn-sec btn-sm" data-action="add-company" data-hid="${h.id}" style="width:100%;justify-content:center;margin-top:4px;">+ Add Company Group</button>`;
                html += `</div>`;
            }

            html += `</div>`;
        }

        html += `</div>`; // #holdings-list
        html += `<div id="sidebar-footer">`;
        html += `<button class="btn btn-sec" data-action="add-holding" style="width:100%;justify-content:center;margin-bottom:6px;">+ New Holding</button>`;
        html += `<div style="display:flex;gap:6px;">`;
        html += `<button class="btn btn-sec btn-sm" data-action="export-holdings" style="flex:1;justify-content:center;">Export</button>`;
        html += `<button class="btn btn-sec btn-sm" data-action="import-holdings" style="flex:1;justify-content:center;">Import</button>`;
        html += `</div>`;
        html += `<input type="file" id="import-file-input" accept=".json" style="display:none;">`;
        html += `</div>`;
        el.innerHTML = html;
    }

    // ==========================================
    // 10. RESULTS RENDER
    // ==========================================
    async function renderResults() {
        const el = document.getElementById('sim-main');
        if (!el) return;

        const configured = State.holdings.filter(h => h.companies.length > 0);

        if (!State.holdings.length) {
            el.innerHTML = `<div id="sim-scroll"><div class="results-empty"><span class="empty-icon">⚙</span><span>Add a holding in the sidebar to begin.</span></div></div><div id="sim-footer"></div>`;
            return;
        }
        if (!configured.length) {
            el.innerHTML = `<div id="sim-scroll"><div class="results-empty"><span class="empty-icon">📦</span><span>Add company groups to your holdings to see production results.</span></div></div><div id="sim-footer"></div>`;
            return;
        }

        // Pre-fetch country economy data for all unique countries
        const citizenData = await ensureCountryData(State.citizenCountry || '');
        const holdingCountryMap = {};
        await Promise.all([...new Set(configured.map(h => h.countryPermalink).filter(Boolean))].map(async p => {
            holdingCountryMap[p] = await ensureCountryData(p);
        }));

        const totals = { FRM: 0, WRM: 0, HRM: 0, ARM: 0, produced: {}, gold: 0, cc: 0, minCo: 0, revenue: 0, hasRevenue: false, salary: 0, wamTax: 0 };
        let html = '';

        for (const h of configured) {
            const holdingData = holdingCountryMap[h.countryPermalink] || null;
            const { groups, rawBalance, totalGoldCost, totalCcCost, totalMinCo, totalEmployees, dailySalaryCost, dailyWamTax } = computeHolding(h, holdingData, citizenData);
            if (!groups.length) continue;

            // Accumulate grand totals
            Object.keys(rawBalance).forEach(k => { totals[k] += rawBalance[k]; });
            totals.gold += totalGoldCost;
            totals.cc += totalCcCost;
            totals.minCo += totalMinCo;
            totals.salary += dailySalaryCost;
            totals.wamTax += dailyWamTax;
            totals.revenue -= dailySalaryCost + dailyWamTax;
            if (dailySalaryCost > 0 || dailyWamTax > 0) totals.hasRevenue = true;
            groups.forEach(g => {
                if (!g.isRaw) {
                    const key = `Q${g.quality} ${PROD_NAMES[g.industry] || g.industry}`;
                    if (!totals.produced[key]) totals.produced[key] = { value: 0, revenue: 0, industry: g.industry, quality: g.quality };
                    totals.produced[key].value += g.dailyOutput;
                    if (g.dailyRevenue !== null) { totals.produced[key].revenue += g.dailyRevenue; totals.hasRevenue = true; totals.revenue += g.dailyRevenue; }
                }
            });
            Object.entries(rawBalance).forEach(([type, net]) => {
                if (Math.abs(net) < 0.0001) return;
                const price = getMarketPrice(RAW_INDUSTRY[type], 1);
                if (price !== null) { totals.revenue += net * price; totals.hasRevenue = true; }
            });

            const cached = h.regionPermalink ? State.productivityCache[h.regionPermalink] : null;
            const freshStatus = cached ? ((Date.now() - cached.timestamp) < CACHE_TTL ? 'fresh' : 'stale') : 'nodata';
            const totalCount = groups.reduce((s, g) => s + g.count, 0);

            html += `<div class="result-card">`;
            html += `<div class="rc-header">`;
            html += `<div style="display:flex;align-items:baseline;flex-wrap:wrap;gap:4px;">`;
            html += `<span class="rc-title">${esc(h.name || 'Unnamed Holding')}</span>`;
            if (h.regionName) {
                html += `<span class="rc-region">${esc(h.regionName)}</span>`;
                const bc = freshStatus === 'fresh' ? 'badge-fresh' : freshStatus === 'stale' ? 'badge-stale' : 'badge-nodata';
                const bl = freshStatus === 'fresh' ? 'fresh' : freshStatus === 'stale' ? 'stale' : 'no prod. data';
                html += `<span class="badge ${bc}">${bl}</span>`;
            } else {
                html += `<span class="badge badge-nodata">no region set</span>`;
            }
            html += `</div>`;
            html += `<span class="rc-count">${totalCount} companies</span>`;
            html += `</div>`;

            html += `<table class="result-table">`;
            html += `<thead><tr>`;
            html += `<th>Type <span title="Minimum number of company instances needed to cover your WAM + employee assignments" style="cursor:help;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:10px;border:1px solid var(--border2);border-radius:3px;padding:0 3px;">?</span></th><th style="text-align:center;">WAM + Emp</th><th class="r">Prod %</th><th class="r">Output / day</th><th class="r">Raw consumed</th><th class="r">Revenue / day</th>`;
            html += `</tr></thead><tbody>`;

            for (const g of groups) {
                const typeLabel = `Q${g.quality} ${industryLabel(g.industry)}`;
                const prodColor = g.prod >= 200 ? 'var(--green)' : g.prod >= 150 ? 'var(--accent)' : 'var(--dim)';
                const estLabel = !g.hasData ? ' <span class="badge badge-nodata" style="margin-left:0;">est.</span>' : '';

                let outputStr, rawConsStr;
                if (g.isRaw) {
                    outputStr = `${fmt(g.dailyOutput, 2)} ${g.rawType}`;
                    rawConsStr = '—';
                } else {
                    outputStr = `${fmt(g.dailyOutput, 0)} ${PROD_NAMES[g.industry] || ''} Q${g.quality}`;
                    rawConsStr = g.def.rawCost
                        ? `${fmt(g.dailyOutput * g.def.rawCost, 2)} ${g.rawType}`
                        : '—';
                }

                html += `<tr>`;
                html += `<td>${typeLabel} <span class="mono" style="color:var(--muted);font-size:10px;">×${g.minCo}</span></td>`;
                const wamVal = g.wam || 0;
                const empVal = g.employees || 0;
                const wamPart = g.canWam && wamVal > 0 ? `<span style="color:var(--accent);">${wamVal}W</span>` : '';
                const empPart = empVal > 0 ? `<span style="color:var(--dim);">${empVal}E</span>` : '';
                const sep = wamPart && empPart ? ' + ' : '';
                const countCell = (wamPart || empPart) ? `${wamPart}${sep}${empPart}` : '<span style="color:var(--muted);">—</span>';
                html += `<td class="mono" style="text-align:center;font-size:11px;">${countCell}</td>`;
                html += `<td class="mono r" style="color:${prodColor};">${fmt(g.prod, 1)}%${estLabel}</td>`;
                html += `<td class="mono r">${outputStr}</td>`;
                html += `<td class="mono r" style="color:var(--muted);">${rawConsStr}</td>`;
                const revStr = g.dailyRevenue !== null
                    ? `<span style="color:var(--green);">${fmt(g.dailyRevenue, 0)} CC</span>`
                    : `<span style="color:var(--muted);font-size:10px;">—</span>`;
                html += `<td class="mono r">${revStr}</td>`;
                html += `</tr>`;
            }
            html += `</tbody></table>`;

            // Holding summary — finished goods revenue, raw surplus adds revenue, raw deficit deducts cost
            let totalRevenue = 0;
            let hasRevenue = false;
            groups.forEach(g => {
                if (!g.isRaw && g.dailyRevenue !== null) { totalRevenue += g.dailyRevenue; hasRevenue = true; }
            });
            Object.entries(rawBalance).forEach(([type, net]) => {
                if (Math.abs(net) < 0.0001) return;
                const price = getMarketPrice(RAW_INDUSTRY[type], 1);
                if (price !== null) { totalRevenue += net * price; hasRevenue = true; }
            });
            totalRevenue -= dailySalaryCost + dailyWamTax;
            if (dailySalaryCost > 0 || dailyWamTax > 0) hasRevenue = true;
            html += `<div class="holding-summary">`;
            html += `<div class="hs-prod">`;
            // Finished goods output
            const prodAgg = {};
            groups.forEach(g => {
                if (!g.isRaw) {
                    const key = `Q${g.quality} ${PROD_NAMES[g.industry] || g.industry}`;
                    if (!prodAgg[key]) prodAgg[key] = { value: 0, revenue: 0, industry: g.industry, quality: g.quality };
                    prodAgg[key].value += g.dailyOutput;
                    if (g.dailyRevenue !== null) prodAgg[key].revenue += g.dailyRevenue;
                }
            });
            Object.entries(prodAgg).forEach(([label, { value, revenue, industry, quality }]) => {
                const revPart = hasRevenue ? ` <span style="color:var(--green);font-size:10px;">${fmt(revenue, 0)} CC</span>` : '';
                html += `<span class="hs-item">${industryImg(INDUSTRY_IDS[industry] || 0, 22, quality)} <span style="color:var(--muted);">${esc(label)}: </span><span style="color:var(--text);">${fmt(value, 0)}/d</span>${revPart}</span>`;
            });
            // Raw balance
            Object.entries(rawBalance).forEach(([type, val]) => {
                if (Math.abs(val) < 0.0001) return;
                const col = val >= 0 ? 'var(--green)' : 'var(--red)';
                const sign = val >= 0 ? '+' : '';
                let rawRevPart = '';
                const rawPrice = getMarketPrice(RAW_INDUSTRY[type], 1);
                if (rawPrice !== null) {
                    const cc = val * rawPrice;
                    const ccCol = cc >= 0 ? 'var(--green)' : 'var(--red)';
                    const ccSign = cc >= 0 ? '' : '−';
                    rawRevPart = ` <span style="color:${ccCol};font-size:10px;">${ccSign}${fmt(Math.abs(cc), 0)} CC</span>`;
                }
                html += `<span class="hs-item">${industryImg(RAW_IDS[type], 22)} <span style="color:var(--muted);">${type}: </span><span style="color:${col};">${sign}${fmt(val, 2)}/d</span>${rawRevPart}</span>`;
            });
            html += `</div>`;
            // Costs + totals block
            html += `<div class="hs-gold">`;
            if (hasRevenue) {
                const revCol = totalRevenue >= 0 ? 'var(--green)' : 'var(--red)';
                html += `<span style="color:${revCol};font-size:16px;font-weight:700;letter-spacing:-0.02em;">${fmt(totalRevenue, 0)} <span style="font-size:10px;font-weight:400;opacity:0.7;">CC/d</span></span>`;
            }
            if (dailySalaryCost > 0 || dailyWamTax > 0) {
                html += `<div style="display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--border);padding-top:6px;margin-top:2px;">`;
                if (dailySalaryCost > 0) html += `<span style="color:var(--red);font-size:10px;font-family:'JetBrains Mono',monospace;">−${fmt(dailySalaryCost, 0)} salaries</span>`;
                if (dailyWamTax > 0) html += `<span style="color:var(--red);font-size:10px;font-family:'JetBrains Mono',monospace;">−${fmt(dailyWamTax, 0)} WAM tax</span>`;
                html += `</div>`;
            }
            html += `<div style="display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--border);padding-top:6px;margin-top:2px;">`;
            if (totalGoldCost > 0) html += `<span style="color:var(--gold);font-size:13px;font-weight:600;">${fmt(totalGoldCost, 0)} <span style="font-size:10px;font-weight:400;color:var(--muted);">gold</span></span>`;
            if (totalCcCost > 0) html += `<span style="color:var(--dim);font-size:13px;font-weight:600;">${fmt(totalCcCost, 0)} <span style="font-size:10px;font-weight:400;color:var(--muted);">CC</span></span>`;
            html += `<span style="color:var(--muted);font-size:10px;font-family:'JetBrains Mono',monospace;">${totalMinCo} co. min.</span>`;
            html += `</div>`;
            html += `</div>`;
            html += `</div>`;

            html += `</div>`;
        }

        // Grand total footer
        const hasRaw = Object.values({ FRM: totals.FRM, WRM: totals.WRM, HRM: totals.HRM, ARM: totals.ARM }).some(v => Math.abs(v) > 0.0001);
        const hasProd = Object.keys(totals.produced).length > 0;
        let footerHtml = '';
        if (hasRaw || hasProd) {
            footerHtml += `<div class="summary-card">`;
            footerHtml += `<h3>Grand Total — All Holdings</h3>`;
            footerHtml += `<div class="summary-grid">`;
            ['FRM', 'WRM', 'HRM', 'ARM'].forEach(type => {
                const val = totals[type];
                if (Math.abs(val) < 0.0001) return;
                const col = val >= 0 ? 'var(--green)' : 'var(--red)';
                const sign = val >= 0 ? '+' : '';
                footerHtml += `<div class="summary-item"><div style="margin-bottom:6px;">${industryImg(RAW_IDS[type], 32)}</div><div class="si-label">${type} Net /d</div><div class="si-value" style="color:${col};">${sign}${fmt(val, 1)}</div></div>`;
            });
            Object.entries(totals.produced).forEach(([label, { value, revenue, industry, quality }]) => {
                const revLine = totals.hasRevenue ? `<div style="font-size:10px;color:var(--green);margin-top:2px;">${fmt(revenue, 0)} CC/d</div>` : '';
                footerHtml += `<div class="summary-item"><div style="margin-bottom:6px;">${industryImg(INDUSTRY_IDS[industry] || 0, 32, quality)}</div><div class="si-label">${esc(label)} /d</div><div class="si-value" style="color:var(--text);">${fmt(value, 0)}</div>${revLine}</div>`;
            });
            if (totals.salary > 0) {
                footerHtml += `<div class="summary-item" style="border-left:3px solid var(--red);"><div class="si-label">Salaries /d</div><div class="si-value" style="color:var(--red);">−${fmt(totals.salary, 0)} <span style="font-size:12px;font-weight:400;">CC</span></div></div>`;
            }
            if (totals.wamTax > 0) {
                footerHtml += `<div class="summary-item" style="border-left:3px solid var(--red);"><div class="si-label">WAM Tax /d</div><div class="si-value" style="color:var(--red);">−${fmt(totals.wamTax, 0)} <span style="font-size:12px;font-weight:400;">CC</span></div></div>`;
            }
            if (totals.hasRevenue) {
                const netCol = totals.revenue >= 0 ? 'var(--green)' : 'var(--red)';
                const netBorder = totals.revenue >= 0 ? 'var(--green)' : 'var(--red)';
                footerHtml += `<div class="summary-item" style="border-left:3px solid ${netBorder};"><div class="si-label">Net Revenue /d</div><div class="si-value" style="color:${netCol};">${fmt(totals.revenue, 0)} <span style="font-size:12px;font-weight:400;">CC</span></div></div>`;
            }
            if (totals.gold > 0 || totals.cc > 0) {
                footerHtml += `<div class="summary-item" style="border-left:3px solid var(--gold);">`;
                footerHtml += `<div class="si-label">Investment</div>`;
                if (totals.gold > 0) footerHtml += `<div class="si-value" style="color:var(--gold);">${fmt(totals.gold, 0)} <span style="font-size:12px;font-weight:400;">gold</span></div>`;
                if (totals.cc > 0) footerHtml += `<div class="si-value" style="color:var(--dim);font-size:15px;margin-top:2px;">${fmt(totals.cc, 0)} <span style="font-size:12px;font-weight:400;">CC</span></div>`;
                footerHtml += `<div style="font-size:10px;color:var(--muted);margin-top:4px;">${totals.minCo} companies</div>`;
                footerHtml += `</div>`;
            }
            footerHtml += `</div></div>`;
        }

        el.innerHTML = `<div id="sim-scroll">${html}</div><div id="sim-footer">${footerHtml}</div>`;
    }

    // ==========================================
    // 11. PRICES SIDEBAR
    const PRICE_GROUPS = [
        { label: 'Food',         industry: 'food',         qualities: [1,2,3,4,5,6,7] },
        { label: 'Weapons',      industry: 'weapon',       qualities: [1,2,3,4,5,6,7] },
        { label: 'Aircraft',     industry: 'aircraft',     qualities: [1,2,3,4,5,6,7] },
        { label: 'Houses',       industry: 'house',        qualities: [1,2,3,4,5,6,7] },
        { label: 'Food Raw',     industry: 'food_raw',     qualities: [1] },
        { label: 'Weapon Raw',   industry: 'weapon_raw',   qualities: [1] },
        { label: 'House Raw',    industry: 'house_raw',    qualities: [1] },
        { label: 'Aircraft Raw', industry: 'aircraft_raw', qualities: [1] },
    ];

    function renderPricesSidebar() {
        const el = document.getElementById('sim-prices-sidebar');
        if (!el) return;
        el.className = pricesSidebarOpen ? '' : 'collapsed';

        if (!pricesSidebarOpen) {
            el.innerHTML = `<div id="prices-collapsed-tab"><span>Prices ▶</span></div>`;
            return;
        }

        if (!State.priceOverrides) State.priceOverrides = {};

        let html = `<div id="prices-header">`;
        html += `<span class="sec-title" style="margin-bottom:0;">Prices</span>`;
        html += `<button id="prices-toggle-btn" title="Collapse">◀</button>`;
        html += `</div>`;
        html += `<div id="prices-body">`;

        for (const group of PRICE_GROUPS) {
            const mKey = MARKET_KEY[group.industry];
            const isRaw = group.industry.endsWith('_raw');
            html += `<div class="price-group">`;
            html += `<div class="price-group-title">${group.label}</div>`;
            for (const q of group.qualities) {
                const qKey = isRaw ? 'q1' : `q${q}`;
                const key = `${mKey}_${qKey}`;
                const marketPrice = marketPriceCache.prices?.[key];
                const override = State.priceOverrides[key];
                const hasOverride = override !== undefined;
                const industryId = INDUSTRY_IDS[group.industry] || 0;
                const imgSize = 20;
                const imgQ = isRaw ? null : q;
                html += `<div class="price-row">`;
                html += industryImg(industryId, imgSize, imgQ);
                html += `<span class="price-q">${isRaw ? '' : `Q${q}`}</span>`;
                html += `<span class="price-val">${marketPrice !== undefined ? marketPrice.toFixed(2) : '—'}</span>`;
                html += `<input class="price-override-inp${hasOverride ? ' has-override' : ''}" type="number" min="0" step="0.01"
                    data-price-key="${key}"
                    placeholder="${marketPrice !== undefined ? marketPrice.toFixed(2) : ''}"
                    value="${hasOverride ? override : ''}">`;
                html += `</div>`;
            }
            html += `</div>`;
        }

        html += `</div>`;
        el.innerHTML = html;
    }

    // 12. EVENT HANDLERS
    // ==========================================
    function getHolding(hid) { return State.holdings.find(h => h.id === hid); }
    function getCompany(h, cid) { return h.companies.find(c => c.id === cid); }

    function attachEvents() {
        document.getElementById('btn-fetch').addEventListener('click', refreshAllProductivity);
        document.getElementById('btn-market').addEventListener('click', refreshMarketPrices);
        document.getElementById('btn-import-game').addEventListener('click', importFromGame);

        const pricesSidebar = document.getElementById('sim-prices-sidebar');
        pricesSidebar.addEventListener('click', e => {
            if (!pricesSidebarOpen) {
                pricesSidebarOpen = true;
                localStorage.setItem('erep_sim_prices_open', '1');
                renderPricesSidebar();
                return;
            }
            if (e.target.id === 'prices-toggle-btn') {
                pricesSidebarOpen = false;
                localStorage.setItem('erep_sim_prices_open', '0');
                renderPricesSidebar();
            }
        });
        pricesSidebar.addEventListener('input', e => {
            if (!e.target.classList.contains('price-override-inp')) return;
            const key = e.target.dataset.priceKey;
            const val = e.target.value.trim();
            if (!State.priceOverrides) State.priceOverrides = {};
            if (val === '' || isNaN(parseFloat(val))) {
                delete State.priceOverrides[key];
                e.target.classList.remove('has-override');
            } else {
                State.priceOverrides[key] = parseFloat(val);
                e.target.classList.add('has-override');
            }
            saveState();
            renderResults();
        });

        document.getElementById('citizen-country-input').addEventListener('input', e => {
            State.citizenCountry = e.target.value.trim();
            saveState();
            renderResults();
        });

        document.getElementById('salary-input').addEventListener('input', e => {
            State.salary = Math.max(0, parseFloat(e.target.value) || 0);
            saveState();
            renderResults();
        });

        document.getElementById('tycoon-input').addEventListener('change', e => {
            State.tycoonBonus = parseInt(e.target.value) || 0;
            saveState();
            renderResults();
        });

        const sidebar = document.getElementById('sim-sidebar');

        sidebar.addEventListener('click', e => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            const hid = target.dataset.hid;
            const cid = target.dataset.cid;

            if (action === 'export-holdings') {
                exportHoldings();
            } else if (action === 'import-holdings') {
                const fileInput = document.getElementById('import-file-input');
                if (fileInput) {
                    fileInput.value = '';
                    fileInput.onchange = e => { if (e.target.files[0]) importHoldings(e.target.files[0]); };
                    fileInput.click();
                }
            } else if (action === 'add-holding') {
                State.holdings.push({ id: newId(), name: 'New Holding', regionName: '', regionPermalink: '', countryPermalink: '', companies: [], expanded: true });
                saveState();
                renderSidebar();
                renderResults();
            } else if (action === 'toggle' && hid) {
                const h = getHolding(hid);
                if (h) { h.expanded = !h.expanded; saveState(); renderSidebar(); }
            } else if (action === 'delete-holding' && hid) {
                e.stopPropagation();
                State.holdings = State.holdings.filter(h => h.id !== hid);
                saveState();
                renderSidebar();
                renderResults();
            } else if (action === 'add-company' && hid) {
                const h = getHolding(hid);
                if (h) {
                    h.companies.push({ id: newId(), industry: 'food_raw', quality: 1, wam: 1, employees: 0 });
                    saveState();
                    renderSidebar();
                    renderResults();
                }
            } else if (action === 'delete-company' && hid && cid) {
                const h = getHolding(hid);
                if (h) {
                    h.companies = h.companies.filter(c => c.id !== cid);
                    saveState();
                    renderSidebar();
                    renderResults();
                }
            }
        });

        sidebar.addEventListener('input', e => {
            const field = e.target.dataset.field;
            const hid = e.target.dataset.hid;
            const cid = e.target.dataset.cid;
            if (!field || !hid) return;

            const h = getHolding(hid);
            if (!h) return;

            if (field === 'name') {
                h.name = e.target.value;
                saveState();
                // Update header label without full sidebar re-render to preserve focus
                const nameEl = e.target.closest('.holding-card')?.querySelector('.h-name');
                if (nameEl) nameEl.textContent = h.name || 'Unnamed Holding';
                renderResults();
            } else if (field === 'region') {
                h.regionName = e.target.value;
                const match = lookupRegion(e.target.value);
                h.regionPermalink = match ? match.permalink : '';
                if (h.regionPermalink) {
                    const cached = State.productivityCache[h.regionPermalink];
                    if (cached?.data?.country) h.countryPermalink = cached.data.country;
                }
                saveState();
                renderResults();
            } else if ((field === 'wam' || field === 'employees') && cid) {
                const c = getCompany(h, cid);
                if (c) {
                    c[field] = Math.max(0, parseInt(e.target.value) || 0);
                    saveState();
                    renderResults();
                }
            }
        });

        sidebar.addEventListener('change', e => {
            const field = e.target.dataset.field;
            const hid = e.target.dataset.hid;
            const cid = e.target.dataset.cid;
            if (!field || !hid) return;

            const h = getHolding(hid);
            if (!h) return;

            if ((field === 'industry' || field === 'quality') && cid) {
                const c = getCompany(h, cid);
                if (c) {
                    if (field === 'industry') {
                        c.industry = e.target.value;
                        if (c.industry.endsWith('_raw') && c.quality > 5) c.quality = 5;
                    } else {
                        c.quality = parseInt(e.target.value);
                    }
                    saveState();
                    // Rebuild sidebar (quality dropdown range may change) and results
                    renderSidebar();
                    renderResults();
                }
            }
        });
    }

    // ==========================================
    // 12. INIT
    // ==========================================
    function init() {
        document.body.innerHTML = '';
        document.head.innerHTML = buildCSS();
        document.body.innerHTML = buildShell();
        renderSidebar();
        renderResults();
        renderPricesSidebar();
        attachEvents();
        if (Date.now() - marketPriceCache.timestamp > MARKET_CACHE_TTL) refreshMarketPrices();
    }

    init();
})();
