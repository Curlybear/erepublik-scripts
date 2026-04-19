// ==UserScript==
// @name         eRepublik Custom Company Manager
// @version      0.7
// @description  Offline-first company dashboard with virtual-list rendering for 1000+ companies. Syncs infrastructure, workforce, inventory, and energy to IndexedDB. Mass WAM, employee assignment, overtime, and gold upgrades with pre-action simulation and confirmation. Tracks employee work pool across game days. Regional productivity from internal sync or external API with freshness warnings. Centralized production estimates with storage and raw material projections.
// @author       Curlybear
// @match        https://www.erepublik.com/en*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      erepublik.com
// @connect      productivityapi.curlybear.eu
// ==/UserScript==

(function () {
    'use strict';

    // ==========================================
    // 1. CONFIGURATION & CONSTANTS
    // ==========================================
    const DB_NAME = 'eRepCustomManagerDB';
    const DB_VERSION = 1;
    const CUSTOM_URL = '/en/economy/custom-manager';
    // The game does not allow WAM (Work as Manager) for house and aircraft industries — server rejects it.
    const NON_WAMMABLE_INDUSTRIES = new Set(['house', 'house_raw', 'aircraft', 'aircraft_raw']);
    const RAW_NAMES = { food: 'FRM', weapon: 'WRM', house: 'HRM', aircraft: 'ARM' };
    const PROD_NAMES = { food: 'Food', weapon: 'Weapons', house: 'Houses', aircraft: 'Aircraft' };
    const TYCOON_BUFFER_SECONDS = 60; // Safety margin: treat pack as expired this many seconds early

    const regionMap = {
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
        426: { name: "Great Poland", permalink: "Great-Poland" },
        437: { name: "Southern Bohemia", permalink: "Southern-Bohemia" },
        440: { name: "Moravia", permalink: "Moravia" },
        442: { name: "Northern Bohemia", permalink: "Northern-Bohemia" },
        443: { name: "Northern India", permalink: "Northern-India" },
        445: { name: "Uttar Pradesh", permalink: "Uttar-Pradesh" },
        446: { name: "Rajasthan", permalink: "Rajasthan" },
        447: { name: "Madhya Pradesh", permalink: "Madhya-Pradesh" },
        448: { name: "Gujarat", permalink: "Gujarat" },
        449: { name: "Maharashtra", permalink: "Maharashtra" },
        450: { name: "Andhra Pradesh", permalink: "Andhra-Pradesh" },
        451: { name: "Karnataka", permalink: "Karnataka" },
        452: { name: "Tamil Nadu", permalink: "Tamil-Nadu" },
        453: { name: "Kerala", permalink: "Kerala" },
        454: { name: "Orissa", permalink: "Orissa" },
        455: { name: "Chhattisgarh", permalink: "Chhattisgarh" },
        456: { name: "Jharkhand", permalink: "Jharkhand" },
        457: { name: "West Bengal", permalink: "West-Bengal" },
        458: { name: "Bihar", permalink: "Bihar" },
        459: { name: "North Eastern India", permalink: "North-Eastern-India" },
        460: { name: "Sumatra", permalink: "Sumatra" },
        461: { name: "Java", permalink: "Java" },
        462: { name: "Kalimantan", permalink: "Kalimantan" },
        463: { name: "Lesser Sunda Islands", permalink: "Lesser-Sunda-Islands" },
        464: { name: "Sulawesi", permalink: "Sulawesi" },
        465: { name: "Maluku islands", permalink: "Maluku-islands" },
        466: { name: "Papua", permalink: "Papua" },
        467: { name: "Jerusalem district", permalink: "Jerusalem-district" },
        468: { name: "Nazareth North District", permalink: "Nazareth-North-District" },
        469: { name: "Haifa district", permalink: "Haifa-district" },
        470: { name: "Tel Aviv Center District", permalink: "Tel-Aviv-Center-District" },
        471: { name: "Beersheba South District", permalink: "Beersheba-South-District" },
        472: { name: "Kerman Province", permalink: "Kerman-Province" },
        473: { name: "Sistan and Baluchistan", permalink: "Sistan-Baluchistan" },
        474: { name: "South Khorasan", permalink: "South-Khorasan" },
        475: { name: "Razavi Khorasan", permalink: "Razavi-Khorasan" },
        476: { name: "Yazd", permalink: "Yazd" },
        477: { name: "Semnan", permalink: "Semnan" },
        478: { name: "Esfahan", permalink: "Esfahan" },
        479: { name: "Fars", permalink: "Fars" },
        480: { name: "Hormozgan", permalink: "Hormozgan" },
        481: { name: "Southwestern Iran", permalink: "Southwestern-Iran" },
        482: { name: "Northwestern Iran", permalink: "Northwestern-Iran" },
        483: { name: "Mazandaran and Golistan", permalink: "Mazandaran-and-Golistan" },
        484: { name: "Hokkaido", permalink: "Hokkaido" },
        485: { name: "Tohoku", permalink: "Tohoku" },
        486: { name: "Kanto", permalink: "Kanto" },
        487: { name: "Chubu", permalink: "Chubu" },
        488: { name: "Kinki", permalink: "Kinki" },
        489: { name: "Chugoku", permalink: "Chugoku" },
        490: { name: "Shikoku", permalink: "Shikoku" },
        491: { name: "Kyushu", permalink: "Kyushu" },
        492: { name: "Balochistan", permalink: "Balochistan" },
        493: { name: "North-West Frontier Province", permalink: "North-West-Frontier" },
        494: { name: "Punjab", permalink: "Punjab" },
        495: { name: "Sindh", permalink: "Sindh" },
        497: { name: "Eastern Cape", permalink: "Eastern-Cape" },
        498: { name: "Free State", permalink: "Free-State" },
        499: { name: "Gauteng", permalink: "Gauteng" },
        500: { name: "KwaZulu Natal", permalink: "KwaZulu-Natal" },
        501: { name: "Limpopo", permalink: "Limpopo" },
        502: { name: "Mpumalanga", permalink: "Mpumalanga" },
        503: { name: "North West Province", permalink: "North-West-Province" },
        504: { name: "Northern Cape", permalink: "Northern-Cape" },
        505: { name: "Western Cape", permalink: "Western-Cape" },
        507: { name: "Central Thailand", permalink: "Central-Thailand" },
        508: { name: "Northern Thailand", permalink: "Northern-Thailand" },
        509: { name: "Eastern Thailand", permalink: "Eastern-Thailand" },
        510: { name: "Southern Thailand", permalink: "Southern-Thailand" },
        511: { name: "North-Eastern Thailand", permalink: "North-Eastern-Thailand" },
        512: { name: "Aegean Coast of Turkey", permalink: "Aegean-Coast-of-Turkey" },
        513: { name: "Black Sea Coast of Turkey", permalink: "Black-Sea-Coast-of-Turkey" },
        514: { name: "Central Anatolia", permalink: "Central-Anatolia" },
        515: { name: "Eastern Anatolia", permalink: "Eastern-Anatolia" },
        516: { name: "Marmara", permalink: "Marmara" },
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
        764: { name: "Oriente", permalink: "Oriente" }
    };

    // Keyed by the company's building image filename — the only reliable type identifier the game exposes.
    // There is no structured industry/quality field; the filename is reverse-engineered from the DOM.
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
            energy: { auto: true },
            intelligence: { auto: true }
        },
        syncMeta: {
            lastDay: 0,
            timestamps: {}
        },
        productivityCache: {},
        tycoonBonus: 0,
        tycoonUntil: 0,
        wamSelections: {},
        _wamEntries: [],
        _wamRegionIds: [],
        _assignEntries: [],
        _assignRegionIds: [],
        employeeWorkPool: null,          // running pool; null = no baseline (infra sync required)
        lastKnownWorksReceivedDay: null, // game day of last workforce sync
        lastKnownWorksReceived: 0,       // worksReceived seen on that day
        lastTycoonUntilForBonus: 0,      // tycoonUntil value for which +150 was deposited — prevents re-deposit on repeated data loads while the same pack is active
        tableSort: { col: null, dir: 1 },
        gold: null,
        cc: null
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

            // scroller is an empty div whose only job is to set the total scrollable height,
            // making the scrollbar behave as if all rows were in the DOM.
            this.scroller = document.createElement('div');
            this.container.appendChild(this.scroller);

            this.content = document.createElement('div');
            this.content.style.position = 'absolute';
            this.content.style.top = '0';
            this.content.style.left = '0';
            this.content.style.width = '100%';
            this.container.appendChild(this.content);

            this._lastFirst = -1;
            this._lastLast = -1;
            this.container.addEventListener('scroll', () => this.render());
        }

        setItems(items) {
            this.items = items;
            this._lastFirst = -1;
            this._lastLast = -1;
            this.scroller.style.height = (this.items.length * this.rowHeight) + 'px';
            this.container.scrollTop = 0;
            this.render();
        }

        render() {
            const scrollTop = this.container.scrollTop;
            const viewportHeight = this.container.clientHeight;

            const startIdx = Math.floor(scrollTop / this.rowHeight);
            const visibleNodesCount = Math.ceil(viewportHeight / this.rowHeight);

            // Render a few rows beyond the visible window to prevent blank flicker during fast scrolling.
            const buffer = 5;
            const firstNode = Math.max(0, startIdx - buffer);
            const lastNode = Math.min(this.items.length - 1, startIdx + visibleNodesCount + buffer);

            if (firstNode === this._lastFirst && lastNode === this._lastLast) return;
            this._lastFirst = firstNode;
            this._lastLast = lastNode;

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
    // GM_xmlhttpRequest is required for all cross-origin requests — userscript fetch() cannot reach
    // external domains (erepublik.com from a different origin, or the productivity API).
    // apiPost sends form-encoded bodies because the game's endpoints require that content type.
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

    async function apiPostJson(url, body) {
        console.log(`[API POST JSON Request] URL: ${url}`, body);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                data: JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' },
                onload: function (r) {
                    console.log(`[API POST JSON Response] URL: ${url} Status: ${r.status}`, r.responseText);
                    (r.status >= 200 && r.status < 300) ? resolve(r.responseText) : reject('Fail: ' + r.status);
                },
                onerror: function (err) {
                    console.error(`[API POST JSON Error] URL: ${url}`, err);
                    reject('Network error.');
                }
            });
        });
    }

    async function apiGet(url, headers = {}) {
        console.log(`[API GET Request] URL: ${url}`);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: headers,
                onload: function (r) {
                    console.log(`[API GET Response] URL: ${url} Status: ${r.status}`);
                    (r.status >= 200 && r.status < 300) ? resolve(r.responseText) : reject('Fail: ' + r.status);
                },
                onerror: function (err) {
                    console.error(`[API GET Error] URL: ${url}`, err);
                    reject('Network error.');
                }
            });
        });
    }

    const sleep = ms => new Promise(res => setTimeout(res, ms));

    // Shared by loadDataFromDb, syncInfrastructure, and syncStorage — all three need to write
    // raw stock levels and storage capacity from the inventory mainStorage entry into a pageDetails object.
    function applyInventoryStocks(mainStorage, pageDetails) {
        const rawMap = { 7: 'food_raw_stock', 12: 'weapon_raw_stock', 17: 'house_raw_stock', 24: 'airplane_raw_stock' };
        if (mainStorage.items) {
            mainStorage.items.forEach(item => {
                if (rawMap[item.industryId]) pageDetails[rawMap[item.industryId]] = item.amount;
            });
        }
        if (mainStorage.status) {
            pageDetails.storage_used = mainStorage.status.usedStorage || 0;
            pageDetails.storage_total = mainStorage.status.totalStorage || 0;
        }
    }

    // entries: Array of { def, quality, totalProd }
    // Returns { breakdown, rawProjected } for display and stock-delta logic.
    function computeProductionEstimate(entries) {
        const breakdown = {};
        const rawProjected = {
            FRM: { produced: 0, consumed: 0 },
            WRM: { produced: 0, consumed: 0 },
            HRM: { produced: 0, consumed: 0 },
            ARM: { produced: 0, consumed: 0 }
        };

        for (const { def, quality, totalProd } of entries) {
            if (!def || totalProd <= 0) continue;
            const industry = def.industry;
            const isRaw = industry.endsWith('_raw');

            if (isRaw) {
                const rawType = RAW_NAMES[industry.replace('_raw', '')];
                rawProjected[rawType].produced += totalProd;
                if (!breakdown[industry]) breakdown[industry] = { prod: 0, cons: 0, label: rawType, rawType };
                breakdown[industry].prod += totalProd;
            } else {
                const rawType = RAW_NAMES[industry];
                const key = `${industry}_q${quality}`;
                if (!breakdown[key]) breakdown[key] = { prod: 0, cons: 0, label: `Q${quality} ${PROD_NAMES[industry]}`, rawType };
                breakdown[key].prod += totalProd;
                if (def.rawCost) {
                    const cons = totalProd * def.rawCost;
                    breakdown[key].cons += cons;
                    rawProjected[rawType].consumed += cons;
                }
            }
        }

        return { breakdown, rawProjected };
    }

    // Returns Tycoon Pack status relative to now, applying TYCOON_BUFFER_SECONDS margin.
    function getTycoonStatus() {
        const now = Math.floor(Date.now() / 1000);
        const effectiveExpiry = AppState.tycoonUntil - TYCOON_BUFFER_SECONDS;
        const remaining = effectiveExpiry - now;
        return {
            isActive: remaining > 0,
            remainingSeconds: Math.max(0, remaining),
            isCritical: remaining > 0 && remaining < 43200 // < 12 hours
        };
    }

    // Formats a past timestamp (ms) as a relative "X ago" string.
    function formatTimeAgo(ts) {
        const diffMs = Date.now() - ts;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'just now';
        if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `${diffH} hour${diffH === 1 ? '' : 's'} ago`;
        const diffD = Math.floor(diffH / 24);
        return `${diffD} day${diffD === 1 ? '' : 's'} ago`;
    }

    // Formats a duration in seconds as "Xd Xh Xm Xs", dropping leading zero units.
    function formatCountdown(seconds) {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
    }

    // Renders the Tycoon Pack countdown into #tycoon-display.
    function updateTycoonDisplay() {
        const el = document.getElementById('tycoon-display');
        if (!el) return;
        if (!AppState.tycoonBonus) {
            el.textContent = 'Tycoon: Inactive';
            el.style.color = 'var(--on-surface-variant)';
            return;
        }
        const { isActive, remainingSeconds, isCritical } = getTycoonStatus();
        if (!isActive) {
            el.textContent = 'Tycoon: Inactive';
            el.style.color = 'var(--on-surface-variant)';
            return;
        }
        const countdown = formatCountdown(remainingSeconds);
        if (isCritical) {
            el.innerHTML = `⚠ Tycoon: +${AppState.tycoonBonus}% — ${countdown}`;
            el.style.color = '#ff4444';
        } else {
            el.textContent = `Tycoon: +${AppState.tycoonBonus}% — ${countdown}`;
            el.style.color = 'var(--secondary)';
        }
    }

    function updateWalletDisplay() {
        const el = document.getElementById('wallet-display');
        if (!el) return;
        const lines = [];
        if (AppState.gold !== null) lines.push(`<span style="color:var(--primary);font-size:13px;font-weight:bold;">${AppState.gold.toLocaleString()} Gold</span>`);
        if (AppState.cc !== null) {
            const ccName = AppState.employeeOverview.currency || 'CC';
            lines.push(`<span style="color:var(--secondary);font-size:11px;">${AppState.cc.toLocaleString()} ${ccName}</span>`);
        }
        el.innerHTML = lines.length > 0
            ? `<span style="display:flex;flex-direction:column;align-items:flex-end;line-height:1.3;">${lines.join('')}</span>`
            : '';
    }

    // Current raw stock levels from AppState — used by estimate renderers and delta logic.
    function getStockMap() {
        return {
            FRM: AppState.pageDetails.food_raw_stock || 0,
            WRM: AppState.pageDetails.weapon_raw_stock || 0,
            HRM: AppState.pageDetails.house_raw_stock || 0,
            ARM: AppState.pageDetails.airplane_raw_stock || 0
        };
    }

    // The game returns HTTP 200 even for captcha challenges — status code alone is not enough.
    // Callers must check this before treating a response as a success.
    function isCaptchaResponse(res) {
        return res && res.status === false && res.message === 'captcha';
    }

    // Returns { value, ready }. ready=false means no baseline yet (infra sync required).
    // All UI code must use this instead of reading pageDetails.total_works directly.
    function getEmployeeWorkPool() {
        if (AppState.employeeWorkPool === null) return { value: null, ready: false };
        return { value: AppState.employeeWorkPool, ready: true };
    }

    // Returns a small HTML line describing the productivity data source and freshness.
    // regionIds: array of region IDs relevant to the current context.
    // When infrastructure.auto=ON: shows internal sync age and stale warning.
    // When infrastructure.auto=OFF: shows external API age and next-refresh countdown.
    function renderProductivityStatusHtml(regionIds) {
        const useInternal = AppState.syncSettings.infrastructure.auto;
        const s = 'font-size:0.65rem;';

        if (useInternal) {
            const lastSync = AppState.syncMeta.timestamps.infrastructure;
            if (!lastSync) {
                return `<span style="${s}color:var(--on-surface-variant)">Productivity: no infrastructure sync yet</span><br>`;
            }
            const ageMin = Math.floor((Date.now() - lastSync) / 60000);
            if (ageMin > 10) {
                return `<span style="${s}color:var(--danger-text)">⚠ Productivity data ${ageMin} min old — refresh recommended before production</span><br>`;
            }
            return `<span style="${s}color:var(--on-surface-variant)">Productivity: internal · updated ${ageMin} min ago</span><br>`;
        }

        // External productivity API path (Companies & Holdings auto-sync is OFF)
        const intelligenceSyncTime = AppState.syncMeta.timestamps.intelligence;
        if (!intelligenceSyncTime) {
            return `<span style="${s}color:var(--on-surface-variant)">Productivity: no data — run Productivity sync</span><br>`;
        }
        const ageMin = Math.floor((Date.now() - intelligenceSyncTime) / 60000);
        const nextRefreshMin = Math.max(0, 60 - ageMin);
        const isStale = ageMin >= 60;
        const color = isStale ? 'var(--danger-text)' : 'var(--on-surface-variant)';
        const staleTag = isStale ? ' ⚠ stale' : '';
        return `<span style="${s}color:${color}">Productivity: External API · ${ageMin} min ago${staleTag} · refresh in ${nextRefreshMin} min</span><br>`;
    }

    // Returns { html, hasNegativeBalance } — negative balance spans get pulse animation class.
    function renderEstimateHtml(breakdown, rawProjected, stockMap) {
        let html = '';
        let hasNegativeBalance = false;
        Object.values(breakdown).forEach(t => {
            if (t.prod > 0) {
                const consLine = t.cons > 0 ? ` (Uses ${t.cons.toFixed(2)} ${t.rawType})` : '';
                html += `Est. ${t.label}: <strong>${t.prod.toFixed(2)}</strong>${consLine}<br>`;
            }
        });
        Object.entries(rawProjected).forEach(([type, stats]) => {
            const current = (stockMap && stockMap[type]) || 0;
            const final = current + stats.produced - stats.consumed;
            const isNeg = final < 0;
            if (isNeg) hasNegativeBalance = true;
            const color = isNeg ? 'var(--danger-text)' : 'var(--success-text)';
            const pulseClass = isNeg ? ' class="balance-neg-pulse"' : '';
            html += `<span style="font-size:0.65rem; color:var(--on-surface-variant)">${type} Balance: <strong${pulseClass} style="color:${color}">${Math.floor(final).toLocaleString()}</strong></span><br>`;
        });
        return { html, hasNegativeBalance };
    }

    // ==========================================
    // 5. CORE LOGIC & UI BUILDER
    // ==========================================
    async function initCustomManager() {
        if (!window.location.pathname.startsWith(CUSTOM_URL)) return;

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
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 14px; height: 14px; border-radius: 50%;
                    font-size: 0.5rem; font-weight: 700; line-height: 1;
                    margin-right: 4px; color: #121416;
                }
                .dot-worked { background: var(--success-text); box-shadow: 0 0 5px var(--success-text); }
                .dot-missed { background: var(--danger-container); box-shadow: 0 0 5px var(--danger-container); }
                .dot-pending { background: var(--outline); box-shadow: 0 0 5px var(--outline); }
                .dot-multi { background: #fabd00; box-shadow: 0 0 5px #fabd00; }

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
                @keyframes balance-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.35; }
                }
                .balance-neg-pulse {
                    animation: balance-pulse 1s ease-in-out infinite;
                }
                .toast.fade-out {
                    opacity: 0; transform: translateX(100%);
                    transition: opacity 0.3s, transform 0.3s;
                }

                .col-name { width: 40%; }
                .col-emp { width: 15%; }
                .col-hold { width: 25%; }
                .col-stat { width: 20%; }
                
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
                        <span id="tycoon-display" style="font-weight: bold; color: var(--secondary); font-size: 13px;"></span>
                        <span id="energy-display" style="font-weight: bold; color: var(--primary);">Energy: --</span>
                        <span id="wallet-display" style="font-size: 13px; font-weight: bold;"></span>
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
                                           style="width:60px; background:transparent; border:none; border-bottom:1px solid var(--outline); color:var(--primary); font-weight:bold; text-align:right; font-size:0.875rem; padding:0;" />
                                    <span style="color:var(--on-surface-variant); font-size:0.75rem;">%</span>
                                </div>
                            </label>
                            <input type="range" id="filter-prod" min="0" max="300" step="1" value="0" style="width:100%; accent-color:var(--primary); background:var(--surface-container-highest);">
                        </div>

                        <hr style="border-color: var(--border); margin: 20px 0;" />

                        <h3 style="margin-top:0">Mass Actions</h3>
                        <p class="summary" id="action-summary">Select a specific holding to enable Work as Manager.</p>
                        
                        <div id="wam-selector-container" style="display:none; margin-bottom:15px;">
                            <label style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                                <span style="font-size:0.75rem; color:var(--on-surface-variant);">Companies to WAM:</span>
                                <strong id="wam-selected-count" style="color:var(--primary);">0</strong>
                            </label>
                            <input type="range" id="wam-slider" min="0" max="0" value="0" style="width:100%; accent-color:var(--primary); background:var(--surface-container-highest);">
                            <button id="btn-select-by-energy" class="btn btn-secondary" style="width:100%; margin-top:10px; padding: 5px; font-size: 0.6875rem;">Select by Energy</button>
                        </div>

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
                        <div style="margin-bottom:8px; font-size:0.6875rem; text-transform:uppercase; letter-spacing:0.5px; color:var(--on-surface-variant); font-family:'Space Grotesk',sans-serif; font-weight:600;">Production Estimate</div>
                        <div id="resource-estimate" class="summary" style="margin-bottom:0;">—</div>

                        <hr style="border-color: var(--border); margin: 20px 0;" />
                        <h3 style="margin-top:0">Employee Assignment</h3>
                        <p class="summary" id="assign-summary">Filter above to find target companies.</p>
                        <div class="form-group">
                            <label>Employees to Assign</label>
                            <input type="number" id="emp-amount" class="form-control" value="0" min="0" />
                            <div style="display:flex; gap:10px; margin-top:8px;">
                                <button id="btn-use-max-emp" class="btn" style="flex:1;" disabled>Use Max</button>
                                <button id="btn-assign" class="btn" style="flex:2;" disabled>Assign & Work</button>
                            </div>
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
                            <div class="tab active" data-tab="companies">Companies</div>
                            <div class="tab" data-tab="employees">Employees</div>
                            <div class="tab" data-tab="settings">Settings</div>
                        </div>

                        <div id="tab-companies" style="display:flex; flex-direction:column; flex:1; min-height:0;">
                            <h3 style="margin-top:0">Holdings Summary (<span id="count-display">0</span> Companies)</h3>
                            <div class="header-row" id="company-header-row">
                                <div class="col-name" data-sort="industry" style="cursor:pointer;user-select:none;">Industry</div>
                                <div class="col-emp" data-sort="employees" style="cursor:pointer;user-select:none;">Employees</div>
                                <div class="col-hold" data-sort="holding" style="cursor:pointer;user-select:none;">Holding</div>
                                <div class="col-stat" data-sort="status" style="cursor:pointer;user-select:none;">Status</div>
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
                            <h3 style="margin-top:0">Employees (<span id="emp-count-display">0</span>)</h3>
                            <div class="header-row">
                                <div class="col-name">Employee</div>
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
        document.getElementById('filter-holding').addEventListener('change', e => { AppState.filters.holding = e.target.value; AppState.wamSelections = {}; applyFilters(); });
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

        document.getElementById('btn-select-by-energy').addEventListener('click', () => {
            const energyAvailable = AppState.energyData.energy || 0;
            const maxCompanies = Math.floor(energyAvailable / 10);
            const wamSlider = document.getElementById('wam-slider');
            if (wamSlider) {
                wamSlider.value = Math.min(maxCompanies, parseInt(wamSlider.max));
                wamSlider.dispatchEvent(new Event('input'));
            }
        });

        const wamSlider = document.getElementById('wam-slider');
        if (wamSlider) {
            wamSlider.addEventListener('input', e => {
                let totalToDistribute = parseInt(e.target.value);
                const items = AppState.virtualList.items;

                // Distribute greedily from top down
                items.forEach(group => {
                    const isWammable = !NON_WAMMABLE_INDUSTRIES.has(group.industry);
                    if (!isWammable || group.pending <= 0) {
                        group.wamCount = 0;
                        return;
                    }
                    const take = Math.min(totalToDistribute, group.pending);
                    group.wamCount = take;
                    totalToDistribute -= take;
                });

                AppState.virtualList.render();
                updateActionUI();
            });
        }

        // Global delegation for table inputs
        document.body.addEventListener('input', e => {
            if (e.target.classList.contains('wam-input')) {
                const key = e.target.dataset.key;
                const val = Math.max(0, parseInt(e.target.value) || 0);
                const items = AppState.virtualList.items;
                const group = items.find(g => g.key === key);
                if (group) {
                    group.wamCount = Math.min(val, group.pending);
                    e.target.value = group.wamCount; // Clamp UI
                }
                updateActionUI();
            }
        });

        document.getElementById('btn-assign').addEventListener('click', performEmployeeAssignment);
        document.getElementById('btn-use-max-emp').addEventListener('click', () => {
            const empAmount = document.getElementById('emp-amount');
            empAmount.value = empAmount.max || 0;
            empAmount.dispatchEvent(new Event('input'));
        });
        document.getElementById('emp-amount').addEventListener('input', updateActionUI);

        document.getElementById('upgrade-target-q').addEventListener('change', updateActionUI); document.getElementById('upgrade-amount').addEventListener('input', updateActionUI);

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

        // Column sort headers
        document.querySelectorAll('#company-header-row [data-sort]').forEach(el => {
            el.addEventListener('click', () => {
                const col = el.dataset.sort;
                if (AppState.tableSort.col === col) {
                    if (AppState.tableSort.dir === -1) {
                        AppState.tableSort.col = null;
                        AppState.tableSort.dir = 1;
                    } else {
                        AppState.tableSort.dir = -1;
                    }
                } else {
                    AppState.tableSort.col = col;
                    AppState.tableSort.dir = 1;
                }
                applyFilters();
            });
        });

        // 4. Initial Data Load & Auto-Sync
        await loadDataFromDb();

        const autoSync = async () => {
            if (AppState.syncSettings.csrf.auto) await syncCsrf(true);
            if (AppState.syncSettings.infrastructure.auto) await syncInfrastructure(true);
            if (AppState.syncSettings.storage.auto) await syncStorage(true);
            if (AppState.syncSettings.energy.auto) await syncEnergy(true);
            if (AppState.syncSettings.intelligence.auto) await syncIntelligence(false, true);
            if (AppState.syncSettings.workforce.auto) await syncWorkforce(true);
        };

        document.title = "Custom Company Manager";

        // Live countdown for Tycoon Pack. Stored on AppState for future teardown.
        AppState.tycoonInterval = setInterval(() => {
            const el = document.getElementById('tycoon-display');
            if (!el) return;
            if (AppState.tycoonBonus > 0 && !getTycoonStatus().isActive) {
                // Buffer window elapsed — treat as expired without waiting for next sync
                AppState.tycoonBonus = 0;
                AppState.tycoonUntil = 0;
                applyFilters();
            }
            updateTycoonDisplay();
            document.querySelectorAll('.sync-time').forEach(timeEl => {
                const id = timeEl.dataset.syncId;
                const lastSync = AppState.syncMeta.timestamps[id];
                timeEl.textContent = lastSync ? formatTimeAgo(lastSync) : 'Never';
            });
        }, 1000);

        autoSync();
    }

    // ==========================================
    // 6. DATA LOADING & FILTERING
    // ==========================================
    async function loadDataFromDb() {
        const previousTycoonUntil = AppState.tycoonUntil;
        const companies = await getDbValue('companies') || {};
        const holdings = await getDbValue('holdingCompanies') || {};
        const inventory = await getDbValue('inventory') || {};
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
            energy: { auto: true },
            intelligence: { auto: true }
        };
        // Ensure migration for existing users
        if (!AppState.syncSettings.energy) AppState.syncSettings.energy = { auto: true };
        if (!AppState.syncSettings.intelligence) AppState.syncSettings.intelligence = { auto: true };

        AppState.productivityCache = await getDbValue('productivityCache') || {};

        // Work Pool state
        const poolVal = await getDbValue('employeeWorkPool');
        AppState.employeeWorkPool = (poolVal !== undefined && poolVal !== null) ? poolVal : null;
        AppState.lastKnownWorksReceivedDay = (await getDbValue('lastKnownWorksReceivedDay')) ?? null;
        AppState.lastKnownWorksReceived = (await getDbValue('lastKnownWorksReceived')) || 0;
        AppState.lastTycoonUntilForBonus = (await getDbValue('lastTycoonUntilForBonus')) || 0;

        // 1. Unify Raw Material Stocks
        if (Array.isArray(inventory)) {
            const mainStorage = inventory.find(s => s.id === 'mainStorage');
            if (mainStorage) {
                applyInventoryStocks(mainStorage, AppState.pageDetails);
                if (mainStorage.items) {
                    const goldItem = mainStorage.items.find(i => i.id === 'gold');
                    const ccItem = mainStorage.items.find(i => i.id === 'currency');
                    AppState.gold = goldItem ? goldItem.amount : null;
                    AppState.cc = ccItem ? ccItem.amount : null;
                }
            }

            // 2. Detect Tycoon Pack Bonus
            const activeEnhancements = inventory.find(s => s.id === 'activeEnhancements');
            AppState.tycoonBonus = 0;
            AppState.tycoonUntil = 0;
            if (activeEnhancements && activeEnhancements.items) {
                const tycoon = activeEnhancements.items.find(i => i.id.includes('productivity_bonus'));
                if (tycoon) {
                    // Extract percentage
                    const match = tycoon.id.match(/productivity_bonus_(\d+)_active/);
                    if (match) AppState.tycoonBonus = parseInt(match[1]);
                    else if (tycoon.attributes && tycoon.attributes.productivity_bonus) {
                        AppState.tycoonBonus = parseInt(tycoon.attributes.productivity_bonus);
                    }
                    // Extract expiry
                    if (tycoon.attributes && tycoon.attributes.active) {
                        AppState.tycoonUntil = parseInt(tycoon.attributes.active.activeUntil) || 0;
                    }
                }
            }
        }

        // 3. Expiration Check — hard reset when fully expired (buffer not applied here)
        const nowSec = Math.floor(Date.now() / 1000);
        if (AppState.tycoonUntil > 0 && nowSec > AppState.tycoonUntil) {
            console.log('[Tycoon] Bonus expired. Resetting.');
            AppState.tycoonBonus = 0;
            AppState.tycoonUntil = 0;
        }

        // 4. Tycoon Activation — deposit +150 works once per new activation (between infra syncs)
        const wasInactive = previousTycoonUntil < nowSec || previousTycoonUntil === 0;
        const isNowActive = AppState.tycoonUntil > nowSec;
        const isNewActivation = wasInactive && isNowActive && AppState.lastTycoonUntilForBonus !== AppState.tycoonUntil;
        if (isNewActivation && AppState.employeeWorkPool !== null) {
            AppState.employeeWorkPool += 150;
            await setDbValue('employeeWorkPool', AppState.employeeWorkPool);
            AppState.lastTycoonUntilForBonus = AppState.tycoonUntil;
            await setDbValue('lastTycoonUntilForBonus', AppState.lastTycoonUntilForBonus);
            console.log(`[WorkPool] +150 Tycoon Pack bonus deposited. Pool: ${AppState.employeeWorkPool}`);
            showToast('Tycoon Pack activated: +150 works added to your pool.', 'success');
        }

        // Update Header UI (interval keeps this live; this is the initial render on data load)
        updateTycoonDisplay();
        updateWalletDisplay();

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
        const tycoonAdd = getTycoonStatus().isActive ? AppState.tycoonBonus : 0;

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

            // Productivity source: internal data takes priority when infrastructure auto-sync is ON.
            // External API (productivityCache) is only used when infrastructure auto-sync is OFF.
            // c.effective_bonus is mutated here so downstream renderers can read it without extra lookups.
            const hId = c.holding_company_id;
            const regionId = hId && AppState.holdingsMap[hId] ? AppState.holdingsMap[hId].region_id : null;
            const useExternalProductivity = !AppState.syncSettings.infrastructure.auto;
            const intel = (useExternalProductivity && regionId) ? AppState.productivityCache[regionId] : null;
            if (intel && intel.data) {
                const d = intel.data;
                let apiVal = 1; // Default
                const baseInd = calcInd.replace('_raw', '');

                if (calcInd.endsWith('_raw')) {
                    const rawShorthand = { food: 'frm', weapon: 'wrm', house: 'hrm', aircraft: 'arm' };
                    const field = `${rawShorthand[baseInd] || baseInd}_productivity`;
                    apiVal = d[field] || 1;
                } else {
                    const field = `${baseInd}_${calcQual}_productivity`; // weapon_7_productivity
                    apiVal = d[field] || 1;
                }

                c.effective_bonus = (apiVal * 100) + tycoonAdd;
            } else {
                // _rawBonus captures the game's base value once. Without it, repeated applyFilters
                // calls compound tycoonAdd onto an already-inflated c.effective_bonus.
                if (c._rawBonus === undefined) c._rawBonus = c.effective_bonus;
                c.effective_bonus = (c._rawBonus || 100) + tycoonAdd;
            }

            let passHolding = true;
            if (holding === 'unassigned') passHolding = (c.holding_company_id === false);
            else if (holding !== 'all') passHolding = (c.holding_company_id == holding); // loose == : select value is string, company field is number

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

        // Column sort override (click on header)
        const { col, dir } = AppState.tableSort;
        if (col) {
            const sortFns = {
                industry: (a, b) => a.industry.localeCompare(b.industry) || a.quality - b.quality,
                employees: (a, b) => b.empSlots - a.empSlots,
                holding: (a, b) => a.holding_name.localeCompare(b.holding_name),
                status: (a, b) => b.pending - a.pending,
            };
            if (sortFns[col]) aggregatedArr.sort((a, b) => sortFns[col](a, b) * dir);
        }

        // Restore WAM selections from state or initialize to max pending
        aggregatedArr.forEach(group => {
            const isWammable = !NON_WAMMABLE_INDUSTRIES.has(group.industry);
            if (isWammable) {
                // Use stored selection if it exists, otherwise default to all pending
                if (typeof AppState.wamSelections[group.key] !== 'undefined') {
                    group.wamCount = Math.min(AppState.wamSelections[group.key], group.pending);
                } else {
                    group.wamCount = group.pending;
                }
                AppState.wamSelections[group.key] = group.wamCount;
            } else {
                group.wamCount = 0;
            }
        });

        AppState.virtualList.setItems(aggregatedArr);
        updateSortIndicators();
        updateActionUI();
    }

    function updateSortIndicators() {
        const labels = { industry: 'Industry', employees: 'Employees', holding: 'Holding', status: 'Status' };
        document.querySelectorAll('#company-header-row [data-sort]').forEach(el => {
            const col = el.dataset.sort;
            const isActive = AppState.tableSort.col === col;
            el.style.color = isActive ? 'var(--primary)' : '';
            el.textContent = labels[col] + (isActive ? (AppState.tableSort.dir === 1 ? ' ▲' : ' ▼') : '');
        });
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
            { id: 'csrf', title: 'Token', desc: 'CSRF security token for game actions.' },
            { id: 'infrastructure', title: 'Companies & Holdings', desc: 'Holdings, factories, and resource bonuses.' },
            { id: 'workforce', title: 'Employees', desc: 'Employee records and work history.' },
            { id: 'storage', title: 'Storage', desc: 'Resource levels, items, and currencies.' },
            { id: 'energy', title: 'Energy', desc: 'Energy levels, pool limits, and recovery status.' },
            { id: 'intelligence', title: 'Productivity', desc: 'Regional productivity bonuses from external API. Used when Companies & Holdings auto-sync is OFF.' }
        ];

        container.innerHTML = modules.map(m => {
            const lastSync = AppState.syncMeta.timestamps[m.id];
            const timeStr = lastSync ? formatTimeAgo(lastSync) : 'Never';
            const auto = AppState.syncSettings[m.id].auto;

            return `
                <div class="settings-card">
                    <h4>${m.title}</h4>
                    <span class="meta">${m.desc}</span>
                    <div class="meta" style="margin-top:5px;">Last Sync: <strong class="sync-time" data-sync-id="${m.id}">${timeStr}</strong></div>
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
                else if (id === 'intelligence') await syncIntelligence(true);
                el.disabled = false;
                el.textContent = 'Sync Now';
            });
        });
    }

    function renderEmployeeRow(emp) {
        const history = emp.workHistory || [0, 0, 0, 0, 0, 0, 0];
        let presenceHtml = '<div style="display:flex; align-items:center;">';
        history.forEach(h => {
            const cls = h > 1 ? 'dot-multi' : h > 0 ? 'dot-worked' : h === 0 ? 'dot-pending' : 'dot-missed';
            const label = h > 0 ? h : '';
            const title = h === -1 ? 'Missed' : h === 0 ? 'Pending' : `${h} works`;
            presenceHtml += `<span class="presence-dot ${cls}" title="${title}">${label}</span>`;
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
        const isWammable = !NON_WAMMABLE_INDUSTRIES.has(comp.industry);

        if (comp.worked > 0) statusStr += `<span class="status-chip chip-success" style="margin-right:2px">${comp.worked} Worked</span>`;

        if (comp.pending > 0) {
            if (isWammable && AppState.filters.holding !== 'all' && AppState.filters.holding !== 'unassigned') {
                statusStr += `
                    <div style="display:inline-flex; align-items:center; gap:5px; margin-left:5px;">
                        <input type="number" class="wam-input" data-key="${comp.key}" value="${comp.wamCount || 0}" min="0" max="${comp.pending}" 
                               style="width:40px; background:var(--surface-container-highest); border:none; border-bottom:1px solid var(--primary); color:#fff; text-align:center; font-size:0.75rem; padding:2px 0; border-radius:2px;">
                        <span style="font-size:0.65rem; color:var(--on-surface-variant)">/ ${comp.pending}</span>
                    </div>`;
            } else if (isWammable) {
                statusStr += `<span class="status-chip chip-danger">${comp.pending} Pending</span>`;
            } else {
                statusStr += `<span class="status-chip" style="background:var(--surface-variant); color:var(--on-surface-variant)">Not WAM-able</span>`;
            }
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
                        <strong style="color:var(--text-main)">Q${comp.quality} ${formatIndustryName(comp.industry)}</strong>
                        <span style="color:var(--on-surface-variant)">x${comp.count}</span>
                    </div>
                    <span style="font-size:0.625rem; color:var(--secondary); font-weight:500;">Productivity: ${parseFloat(comp.productivity).toFixed(2)}%</span>
                </div>
            </td>
            <td class="col-emp">${empStr}</td>
            <td class="col-hold">${comp.holding_name}</td>
            <td class="col-stat">${statusStr}</td>
        </tr>`;
    }

    function updateWamUI() {
        const btnWam = document.getElementById('btn-wam');
        const summary = document.getElementById('action-summary');
        const wamContainer = document.getElementById('wam-selector-container');
        const wamSlider = document.getElementById('wam-slider');
        const wamCountLabel = document.getElementById('wam-selected-count');

        const { holding } = AppState.filters;
        if (holding === 'all' || holding === 'unassigned') {
            btnWam.disabled = true;
            summary.textContent = 'Select a specific holding to enable Work as Manager.';
            if (wamContainer) wamContainer.style.display = 'none';
            AppState._wamEntries = [];
            AppState._wamRegionIds = [];
            return;
        }

        if (wamContainer) wamContainer.style.display = 'block';

        const workableGroups = AppState.virtualList.items.filter(g =>
            !NON_WAMMABLE_INDUSTRIES.has(g.industry) && g.pending > 0
        );
        const totalWorkable = workableGroups.reduce((sum, g) => sum + g.pending, 0);
        const currentSelected = workableGroups.reduce((sum, g) => sum + (g.wamCount || 0), 0);

        if (wamSlider) {
            wamSlider.max = totalWorkable;
            if (parseInt(wamSlider.value) !== currentSelected) wamSlider.value = currentSelected;
        }
        if (wamCountLabel) wamCountLabel.textContent = currentSelected;

        const energyAffordable = Math.min(Math.floor(AppState.energyData.energy / 10), totalWorkable);
        const btnSelectByEnergy = document.getElementById('btn-select-by-energy');
        if (btnSelectByEnergy) btnSelectByEnergy.textContent = `Select by Energy (${energyAffordable})`;

        if (currentSelected === 0) {
            btnWam.disabled = true;
            summary.textContent = totalWorkable > 0
                ? 'Select companies using the slider or table inputs to work.'
                : 'No pending workable companies in this holding/filter combination.';
            AppState._wamEntries = [];
            AppState._wamRegionIds = [];
            return;
        }

        const energyRequired = currentSelected * 10;
        const hasEnergy = AppState.energyData.energy >= energyRequired;

        const wamEntries = workableGroups
            .filter(group => (group.wamCount || 0) > 0)
            .map(group => {
                const sample = AppState.filteredArr.find(c => {
                    const fname = c.building_img.split('/').pop();
                    const def = companyDefinitions[fname];
                    return def && def.industry === group.industry && def.quality === `q${group.quality}`;
                });
                if (!sample) return null;
                const def = companyDefinitions[sample.building_img.split('/').pop()];
                const amountPerWork = def.baseProduction * (parseFloat(sample.effective_bonus) || 100) / 100;
                return { def, quality: group.quality, totalProd: amountPerWork * (group.wamCount || 0) };
            })
            .filter(Boolean);
        const { breakdown, rawProjected } = computeProductionEstimate(wamEntries);
        const { hasNegativeBalance: wamNegBalance } = renderEstimateHtml(breakdown, rawProjected, getStockMap());

        AppState._wamEntries = wamEntries;
        AppState._wamRegionIds = AppState.holdingsMap[holding] ? [AppState.holdingsMap[holding].region_id] : [];

        summary.innerHTML = `Selection: <strong>${currentSelected}</strong> companies · Energy: <strong style="color:${hasEnergy ? 'var(--success-text)' : 'var(--danger-text)'}">${energyRequired}</strong>${!hasEnergy ? ' <span style="font-size:0.65rem;color:var(--on-surface-variant)">(bars needed)</span>' : ''}`;
        btnWam.disabled = !AppState.csrfToken || wamNegBalance;
        if (!AppState.csrfToken) summary.innerHTML += '<br><span style="color:var(--danger-text)">No CSRF Token. Please Sync.</span>';
        if (wamNegBalance) summary.innerHTML += '<br><span style="color:var(--danger-text);font-size:0.65rem;">Insufficient raw materials.</span>';
    }

    function updateAssignUI() {
        const btnAssign = document.getElementById('btn-assign');
        const assignSummary = document.getElementById('assign-summary');
        const empAmount = document.getElementById('emp-amount');

        let availableSlots = 0;
        let assignableCompanies = 0;
        // total_works in pageDetails is the raw infrastructure value. Use getEmployeeWorkPool() for current accurate pool.
        const { value: empAvailable, ready: poolReady } = getEmployeeWorkPool();
        const inputAmount = parseInt(empAmount.value) || 0;

        let remainingToSimulate = inputAmount;
        const simAssignments = {};
        const empEntries = [];

        AppState.filteredArr.forEach(c => {
            if (c.can_assign_employees) {
                const slots = parseInt(c.employee_limit || 0) - (parseInt(c.todays_works) || 0);
                if (slots > 0) {
                    availableSlots += slots;
                    assignableCompanies++;

                    const assignToThisComp = Math.min(remainingToSimulate, slots);
                    if (assignToThisComp > 0) {
                        simAssignments[c.id] = assignToThisComp;
                        const def = companyDefinitions[c.building_img.split('/').pop()];
                        if (def && def.baseProduction) {
                            const prodPerEmp = def.baseProduction * (parseFloat(c.effective_bonus) || 100) / 100;
                            empEntries.push({ def, quality: c.quality, totalProd: prodPerEmp * assignToThisComp });
                        }
                        remainingToSimulate -= assignToThisComp;
                    }
                }
            }
        });

        const { breakdown: empBreakdown, rawProjected: rawProjectedEmp } = computeProductionEstimate(empEntries);

        if (AppState.virtualList && AppState.virtualList.items) {
            AppState.virtualList.items.forEach(group => {
                group.empSim = 0;
                AppState.filteredArr.forEach(c => {
                    const hId = c.holding_company_id || 'unassigned';
                    const ind = c.calculated_industry || 'unknown';
                    const q = c.calculated_quality || '1';
                    const key = `${hId}_${ind}_${q}`;
                    if (key === group.key && simAssignments[c.id]) group.empSim += simAssignments[c.id];
                });
            });
            AppState.virtualList.render();
        }

        const { hasNegativeBalance: empNegBalance } = renderEstimateHtml(empBreakdown, rawProjectedEmp, getStockMap());

        AppState._assignEntries = empEntries;
        AppState._assignRegionIds = [...new Set(
            AppState.filteredArr
                .filter(c => c.can_assign_employees)
                .map(c => {
                    const hId = c.holding_company_id;
                    return (hId && AppState.holdingsMap[hId]) ? AppState.holdingsMap[hId].region_id : null;
                })
                .filter(Boolean)
        )];

        // Slot/action block — conditional
        const btnUseMax = document.getElementById('btn-use-max-emp');
        const empAvailableDisplay = poolReady ? (empAvailable || 0).toLocaleString() : '--';
        let slotHtml;
        if (availableSlots > 0) {
            btnAssign.disabled = !AppState.csrfToken || empNegBalance || !poolReady;
            btnUseMax.disabled = !AppState.csrfToken || !poolReady;
            empAmount.max = poolReady ? Math.min(availableSlots, empAvailable || 0) : 0;
            slotHtml = `<strong>${availableSlots}</strong> slots across <strong>${assignableCompanies}</strong> companies.`;
            if (empNegBalance) slotHtml += `<br><span style="color:var(--danger-text);font-size:0.65rem;">Insufficient raw materials.</span>`;
        } else {
            btnAssign.disabled = true;
            btnUseMax.disabled = true;
            slotHtml = `No available employee slots in this filter combination.`;
        }

        const poolNote = !poolReady ? ` <span style="color:var(--danger-text)">(infra sync required)</span>` : '';
        assignSummary.innerHTML = slotHtml
            + `<br><span style="font-size:0.65rem;color:var(--on-surface-variant)">Available works: <strong>${empAvailableDisplay}</strong>${poolNote}</span>`;
    }

    function updateUpgradeUI() {
        const btnUpgrade = document.getElementById('btn-mass-upgrade');
        const upgradeSummary = document.getElementById('upgrade-summary');

        const { holding, industry, quality } = AppState.filters;
        const isRaw = industry.endsWith('_raw');
        const upgradableIndustries = ['food', 'weapon', 'house', 'aircraft'];

        if (holding === 'all' || holding === 'unassigned') {
            btnUpgrade.disabled = true;
            upgradeSummary.textContent = 'Select a specific holding to enable mass upgrade.';
        } else if (industry === 'all') {
            btnUpgrade.disabled = true;
            upgradeSummary.textContent = 'Select a specific industry to enable mass upgrade.';
        } else if (isRaw || !upgradableIndustries.includes(industry)) {
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
                    const h = AppState.holdingsMap[holding];
                    const hName = h ? h.name : 'Unknown';
                    const rId = h ? h.region_id : null;
                    const regionData = regionMap[rId] || { name: `Region ${rId}`, permalink: '#' };

                    const amountToUpgrade = Math.min(parseInt(document.getElementById('upgrade-amount').value) || 1, upgradableSet.length);
                    const sampleComp = upgradableSet[0];
                    const totalCost = (sampleComp && sampleComp.upgrades && sampleComp.upgrades[targetQ])
                        ? parseInt(sampleComp.upgrades[targetQ].cost) * amountToUpgrade
                        : 0;

                    btnUpgrade.disabled = !AppState.csrfToken;
                    upgradeSummary.innerHTML = `
                        <div style="font-size:0.6875rem; color:var(--secondary); margin-top:5px; line-height:1.5;">
                            → Holding: <strong>${hName}</strong><br>
                            → Region: <strong>${regionData.name}</strong><br>
                            → Target: <strong>${amountToUpgrade} ${formatIndustryName(industry)} Q${currentQ} → Q${targetQ}</strong><br>
                            → Est. Total Cost: <strong style="color:var(--primary)">${totalCost.toLocaleString()} Gold</strong>
                        </div>
                    `;
                }
            }
        }
    }

    function updatePersonalWorkUI() {
        const btnEmp = document.getElementById('btn-work-emp');
        const btnOt = document.getElementById('btn-work-ot');
        const pwSummary = document.getElementById('personal-work-summary');

        if (!AppState.pageDetails || !AppState.pageDetails.employee) {
            pwSummary.textContent = 'Employee data missing. Please sync.';
            return;
        }

        const isEmployed = !!AppState.pageDetails.employee.employer;
        if (!isEmployed) {
            pwSummary.textContent = 'You are not currently employed.';
            return;
        }

        const alreadyWorked = AppState.pageDetails.employee.alreadyWorked;
        const now = Math.floor(Date.now() / 1000);
        const nextOt = AppState.pageDetails.next_overtime_work || 0;
        const otCost = now < nextOt ? 100 : 10;
        const otText = now < nextOt
            ? `<span class="status-chip chip-danger">Cooldown (100 energy)</span>`
            : '<span class="status-chip chip-success">Available (10 energy)</span>';

        const hasEmpEnergy = AppState.energyData.energy >= 10;
        const hasOtEnergy = AppState.energyData.energy >= otCost;
        const salaryText = `${AppState.pageDetails.employee.salary} ${AppState.pageDetails.employee.currency}`;

        pwSummary.innerHTML = `Salary: <strong style="color:var(--text-main)">${salaryText}</strong><br>Overtime: ${otText}`;
        btnEmp.disabled = alreadyWorked || !hasEmpEnergy || !AppState.csrfToken;
        btnEmp.textContent = alreadyWorked ? 'Already Worked' : 'Work';
        btnOt.disabled = !alreadyWorked || !hasOtEnergy || !AppState.csrfToken;
        btnOt.title = !hasOtEnergy ? `Insufficient energy (need ${otCost})` : '';
    }

    // storageDelta: net units added to storage by planned production (prod - cons across all industries).
    function renderStorageHtml(storageDelta = 0) {
        const used = AppState.pageDetails.storage_used || 0;
        const total = AppState.pageDetails.storage_total || 0;
        if (total === 0) return '';

        const hasDelta = storageDelta !== 0;
        const projected = Math.round(used + storageDelta);
        const displayUsed = hasDelta ? projected : used;
        const pct = Math.round(displayUsed / total * 100);
        const isOver = displayUsed > total;
        const isWarn = !isOver && pct >= 90;
        const color = (isOver || isWarn) ? 'var(--danger-text)' : 'var(--on-surface-variant)';

        const deltaStr = hasDelta
            ? ` <span style="font-size:0.6rem;color:var(--on-surface-variant)">(${used.toLocaleString()} + ${Math.round(storageDelta).toLocaleString()})</span>`
            : '';
        const overTag = isOver ? ' ⚠ over capacity' : '';
        const pulseStyle = isOver ? ' class="balance-neg-pulse"' : '';

        return `<span${pulseStyle} style="font-size:0.65rem;color:${color}">Storage: ${displayUsed.toLocaleString()} / ${total.toLocaleString()} (${pct}%)${overTag}</span>${deltaStr}<br>`;
    }

    function updateResourceEstimate() {
        const el = document.getElementById('resource-estimate');
        if (!el) return;

        const combined = [...(AppState._wamEntries || []), ...(AppState._assignEntries || [])];
        // An empty combined array still yields a zeroed rawProjected, which lets renderEstimateHtml
        // emit all four raw balance lines showing current stock even when nothing is selected.
        const { breakdown, rawProjected } = computeProductionEstimate(combined);
        const { html: estimatesHtml } = renderEstimateHtml(breakdown, rawProjected, getStockMap());

        const noProdHtml = combined.length === 0
            ? '<span style="font-size:0.65rem;color:var(--on-surface-variant)">No production planned.</span><br>'
            : '';

        // Raw units occupy 100 storage each; finished goods are 1:1.
        // breakdown keys ending in '_raw' are raw producers (cons=0); others are finished goods.
        const storageDelta = Object.entries(breakdown).reduce((sum, [key, t]) => {
            const isRaw = key.endsWith('_raw');
            return sum + (isRaw ? t.prod * 100 : t.prod - t.cons * 100);
        }, 0);

        const allRegionIds = [...new Set([...(AppState._wamRegionIds || []), ...(AppState._assignRegionIds || [])])];
        const prodStatusHtml = renderProductivityStatusHtml(allRegionIds);

        el.innerHTML = noProdHtml + estimatesHtml + renderStorageHtml(storageDelta) + prodStatusHtml;
    }

    function updateActionUI() {
        updateWamUI();
        updateAssignUI();
        updateResourceEstimate();
        updateUpgradeUI();
        updatePersonalWorkUI();
    }

    // ==========================================
    // 7. SYNCHRONIZATION SYSTEM
    // ==========================================

    // Shared boilerplate: log → try → fetch → process → catch (error toast) → return bool.
    // fetchFn: async () => rawText  (pass null if processFn handles its own fetches)
    // processFn: async (rawText) => true | falsy
    async function syncResource(name, fetchFn, processFn) {
        console.log(`[Sync] Fetching ${name}...`);
        try {
            const raw = fetchFn ? await fetchFn() : null;
            return (await processFn(raw)) === true;
        } catch (e) {
            console.error(`[Sync Error] ${name}:`, e);
            showToast(`${name} Sync failed.`, 'error');
            return false;
        }
    }

    async function syncCsrf(silent = false) {
        return syncResource('CSRF',
            () => apiGet('https://www.erepublik.com/en'),
            async data => {
                const csrfMatch = data.match(/var csrfToken\s*=\s*'([^']+)';/);
                if (!csrfMatch) return false;
                AppState.csrfToken = csrfMatch[1];
                console.log(`[Sync] CSRF Token parsed: ${AppState.csrfToken.substring(0, 8)}...`);
                await setDbValue('csrfToken', AppState.csrfToken);
                updateSyncMeta('csrf');
                if (!silent) showToast('CSRF Token updated.', 'success');
                return true;
            }
        );
    }

    async function syncInfrastructure(silent = false, skipReload = false) {
        return syncResource('Infrastructure',
            () => apiGet('https://www.erepublik.com/en/economy/myCompanies'),
            async data => {
                // The game embeds company data as JS variable assignments in the HTML page, not as a JSON API.
                // Regex extraction is the only available approach.
                const companiesMatch = data.match(/var companies\s*=\s*(\{.*\});/);
                if (!companiesMatch) return false;
                const companies = JSON.parse(companiesMatch[1]);
                const holdingsMatch = data.match(/var holdingCompanies\s*=\s*(\{.*\});/);
                const energyMatch = data.match(/var energyData\s*=\s*(\{.*\});/);
                const pageMatch = data.match(/var pageDetails\s*=\s*(\{.*\});/);
                const holdings = holdingsMatch ? JSON.parse(holdingsMatch[1]) : {};
                const energy = energyMatch ? JSON.parse(energyMatch[1]) : { energy: 0 };
                const pageDetails = pageMatch ? JSON.parse(pageMatch[1]) : {};

                console.log(`[Sync] Infrastructure Parsed: ${Object.keys(companies).length} companies, ${Object.keys(holdings).length} holdings.`);
                await setDbValue('companies', companies);
                await setDbValue('holdingCompanies', holdings);
                await setDbValue('energyData', energy);

                // Reconcile: If we have an existing inventory sync, its values are the "Truth"
                const inv = await getDbValue('inventory');
                if (Array.isArray(inv)) {
                    const main = inv.find(s => s.id === 'mainStorage');
                    if (main) applyInventoryStocks(main, pageDetails);
                }

                await setDbValue('pageDetails', pageDetails);

                // employeeWorkPool set absolutely here — only place pool is set non-relatively.
                // All other adjustments (workforce delta, assignment withdrawal) are relative.
                const authoritativePool = parseInt(pageDetails.total_works || 0);
                AppState.employeeWorkPool = authoritativePool;
                await setDbValue('employeeWorkPool', authoritativePool);

                // Preserve delta anchor if it's for the current game day.
                // total_works already includes today's worksReceived, so resetting the anchor
                // to 0 would cause the next workforce sync to double-count them.
                const storedWorksReceivedDay = await getDbValue('lastKnownWorksReceivedDay');
                const storedWorksReceived = await getDbValue('lastKnownWorksReceived') ?? 0;
                const currentDay = AppState.syncMeta.lastDay; // set by workforce sync; 0 if never synced
                if (currentDay > 0 && storedWorksReceivedDay === currentDay) {
                    console.log(`[WorkPool] Baseline set to ${authoritativePool}. Anchor preserved at ${storedWorksReceived} works for day ${currentDay}.`);
                } else {
                    AppState.lastKnownWorksReceivedDay = null;
                    AppState.lastKnownWorksReceived = 0;
                    await setDbValue('lastKnownWorksReceivedDay', null);
                    await setDbValue('lastKnownWorksReceived', 0);
                    console.log(`[WorkPool] Baseline set to ${authoritativePool}. Anchor reset (previous day).`);
                }

                updateSyncMeta('infrastructure');
                if (skipReload) {
                    // Update what downstream syncs (e.g. syncIntelligence) depend on from AppState.
                    AppState.companiesArr = Object.values(companies);
                    AppState.holdingsMap = holdings;
                } else {
                    await loadDataFromDb();
                }
                if (!silent) showToast(`Infrastructure synced: ${Object.keys(companies).length} companies.`, 'success');
                return true;
            }
        );
    }

    async function syncWorkforce(silent = false, skipReload = false) {
        return syncResource('Workforce',
            () => apiGet('https://www.erepublik.com/en/economy/manage-employees-json', { 'X-Requested-With': 'XMLHttpRequest' }),
            async data => {
                const employeeData = JSON.parse(data);
                console.log(`[Sync] Workforce Parsed: ${employeeData.employees ? employeeData.employees.length : 0} employees.`, employeeData);
                if (!employeeData.employees) return false;

                await setDbValue('employees', employeeData.employees);
                await setDbValue('employeeOverview', employeeData.overview || {});

                const currentDay = employeeData.settings ? employeeData.settings.dayNumbers[employeeData.settings.dayNumbers.length - 1] : 0;
                if (currentDay > AppState.syncMeta.lastDay && AppState.syncMeta.lastDay > 0) {
                    await handleDayChange(currentDay);
                } else if (currentDay > 0) {
                    AppState.syncMeta.lastDay = currentDay;
                    await setDbValue('syncMeta', AppState.syncMeta);
                }

                // Work Pool delta — only runs if a baseline exists from infrastructure sync
                const todayStats = employeeData.overview?.employeeStats?.dailyStats?.[currentDay];
                const newWorksReceived = todayStats?.worksReceived ?? 0;
                if (AppState.employeeWorkPool !== null) {
                    let delta = 0;
                    if (AppState.lastKnownWorksReceivedDay === currentDay) {
                        // Math.max guards against the game correcting a prior overcount on the same day.
                        delta = Math.max(0, newWorksReceived - AppState.lastKnownWorksReceived);
                    } else {
                        // New day — all of today's worksReceived are new deposits
                        delta = newWorksReceived;
                    }
                    if (delta > 0) {
                        AppState.employeeWorkPool += delta;
                        await setDbValue('employeeWorkPool', AppState.employeeWorkPool);
                        console.log(`[WorkPool] +${delta} works deposited. Pool: ${AppState.employeeWorkPool}`);
                    }
                }
                AppState.lastKnownWorksReceivedDay = currentDay;
                AppState.lastKnownWorksReceived = newWorksReceived;
                await setDbValue('lastKnownWorksReceivedDay', currentDay);
                await setDbValue('lastKnownWorksReceived', newWorksReceived);

                updateSyncMeta('workforce');
                if (!skipReload) await loadDataFromDb();
                if (!silent) showToast(`Employees synced: ${employeeData.employees.length} employees.`, 'success');
                return true;
            }
        );
    }

    async function syncStorage(silent = false) {
        return syncResource('Storage',
            () => apiGet('https://www.erepublik.com/en/economy/inventory-json', { 'X-Requested-With': 'XMLHttpRequest' }),
            async data => {
                const inventory = JSON.parse(data);
                console.log('[Sync] Storage Parsed:', inventory);
                await setDbValue('inventory', inventory);

                // pageDetails (from infrastructure sync) contains stale raw stock values.
                // Overwrite them with authoritative inventory data whenever storage is synced.
                if (Array.isArray(inventory)) {
                    const mainStorage = inventory.find(s => s.id === 'mainStorage');
                    if (mainStorage) {
                        const p = await getDbValue('pageDetails') || {};
                        applyInventoryStocks(mainStorage, p);
                        await setDbValue('pageDetails', p);
                        console.log('[Sync] pageDetails stocks synchronized from Inventory.');
                    }
                }

                updateSyncMeta('storage');
                if (!silent) showToast('Storage synced.', 'success');
                return true;
            }
        );
    }
    async function syncEnergy(silent = false) {
        return syncResource('Energy',
            () => apiPost('https://www.erepublik.com/en/economy/energyRefill-getInventory', `_token=${AppState.csrfToken}`),
            async data => {
                const res = JSON.parse(data);
                if (!res || typeof res.poolEnergy === 'undefined') return false;

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
                if (!silent) showToast('Energy synced.', 'success');
                return true;
            }
        );
    }

    async function syncIntelligence(force = false, silent = false, skipReload = false) {
        return syncResource('Intelligence', null, async () => {
            // Only query regions for holdings that actually contain companies.
            // Holdings without companies (job market access only) don't need productivity data.
            const holdingsWithCompanies = new Set(
                AppState.companiesArr
                    .filter(c => c.holding_company_id)
                    .map(c => String(c.holding_company_id))
            );
            const uniqueRegions = new Set();
            Object.values(AppState.holdingsMap)
                .filter(h => holdingsWithCompanies.has(String(h.id)))
                .forEach(h => uniqueRegions.add(h.region_id));

            const now = Date.now();
            let updateCount = 0;

            // Build permalink → regionId map for stale regions only.
            const permalinkToRegionId = {};
            for (const rId of uniqueRegions) {
                const regionData = regionMap[rId];
                if (!regionData || !regionData.permalink) continue;
                const cached = AppState.productivityCache[rId];
                if (!force && cached && (now - cached.timestamp < 3600000)) {
                    console.log(`[Sync] Region ${rId} (${regionData.name}) using cached data.`);
                    continue;
                }
                permalinkToRegionId[regionData.permalink] = rId;
            }

            const stalePermalinks = Object.keys(permalinkToRegionId);
            if (stalePermalinks.length > 0) {
                const apiRes = await apiPostJson('https://productivityapi.curlybear.eu/productivity/query', { permalinks: stalePermalinks });
                const dataArr = JSON.parse(apiRes);
                if (Array.isArray(dataArr)) {
                    for (const entry of dataArr) {
                        const rId = entry.permalink ? permalinkToRegionId[entry.permalink] : null;
                        if (!rId) continue;
                        AppState.productivityCache[rId] = { timestamp: now, data: entry };
                        updateCount++;
                    }
                }
            }

            if (updateCount > 0) {
                await setDbValue('productivityCache', AppState.productivityCache);
                if (!skipReload) await loadDataFromDb();
            }

            const totalHoldings = Object.keys(AppState.holdingsMap).length;
            const skipped = totalHoldings - holdingsWithCompanies.size;
            updateSyncMeta('intelligence');
            if (!silent) showToast(`Productivity updated: ${updateCount} regions refreshed (${uniqueRegions.size} queried, ${skipped} empty holdings skipped).`, 'success');
            return true;
        });
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
        // Productivity bonuses change as territories are conquered/lost — stale cache is misleading.
        AppState.productivityCache = {};
        await setDbValue('productivityCache', {});

        await loadDataFromDb();
    }

    async function performGoldenLoad() {
        console.log('[Sync] Initiating Full Sync...');
        showToast('Starting full sync...', 'info');

        const results = {
            csrf: await syncCsrf(true),
            infrastructure: await syncInfrastructure(true, true),
            storage: await syncStorage(true),
            energy: await syncEnergy(true),
            intelligence: await syncIntelligence(false, true, true),
            workforce: await syncWorkforce(true, true)
        };
        await loadDataFromDb();

        const failed = Object.entries(results).filter(([k, v]) => !v).map(([k]) => k);
        const successCount = Object.values(results).filter(v => v).length;

        console.log(`[Sync] Full Sync complete. Successes: ${successCount}/${Object.keys(results).length}. Failed: ${failed.join(', ') || 'None'}`);

        if (failed.length === 0) {
            showToast('Full sync complete.', 'success');
        } else if (successCount > 0) {
            showToast(`Full sync partial — failed: ${failed.join(', ')}`, 'info');
        } else {
            showToast('Full sync failed.', 'error');
        }
    }

    // ==========================================
    // 8. API ACTIONS (Travel, Mass WAM & Employee)
    // ==========================================
    async function performMassWam() {
        const holdingId = AppState.filters.holding;
        const selectedGroups = AppState.virtualList.items.filter(g => (g.wamCount || 0) > 0);
        const totalSelected = selectedGroups.reduce((sum, g) => sum + g.wamCount, 0);

        if (totalSelected === 0) return;

        const energyRequired = totalSelected * 10;
        let useEnergyBar = false;

        if (AppState.energyData.energy < energyRequired) {
            const useBar = await showConfirmModal(
                'Insufficient Energy',
                `<span style="color:#e74c3c">Current energy: <strong>${AppState.energyData.energy}</strong> / Required: <strong>${energyRequired}</strong></span><br><br>Use energy bars to complete work?`,
                'Use Energy Bars'
            );
            if (!useBar) return;
            useEnergyBar = true;
        }

        const holding = AppState.holdingsMap[holdingId];
        const hName = holding ? holding.name : 'Unknown';

        const confirmLines = [];
        const confirmEntries = [];
        selectedGroups.forEach(group => {
            const sample = AppState.filteredArr.find(c => {
                const fname = c.building_img.split('/').pop();
                const def = companyDefinitions[fname];
                return def && def.industry === group.industry && def.quality === `q${group.quality}`;
            });
            if (!sample) return;
            const def = companyDefinitions[sample.building_img.split('/').pop()];
            const productivity = parseFloat(sample.effective_bonus) || 100;
            const totalProd = def.baseProduction * productivity / 100 * group.wamCount;
            confirmEntries.push({ def, quality: group.quality, totalProd });
            const isRaw = group.industry.endsWith('_raw');
            const label = isRaw
                ? `Q${group.quality} ${formatIndustryName(group.industry)}`
                : `Q${group.quality} ${PROD_NAMES[group.industry] || formatIndustryName(group.industry)}`;
            let line = `${label} (${parseFloat(productivity).toFixed(2)}%) — Est. ${totalProd.toFixed(2)} units`;
            if (!isRaw && def.rawCost) line += ` (Uses ${(totalProd * def.rawCost).toFixed(2)} ${RAW_NAMES[group.industry]})`;
            confirmLines.push(line);
        });

        const { rawProjected: confRawProj } = computeProductionEstimate(confirmEntries);
        const confStockMap = getStockMap();
        const affectedRaws = Object.entries(confRawProj).filter(([, s]) => s.produced > 0 || s.consumed > 0);
        let balanceHtml = '';
        if (affectedRaws.length > 0) {
            balanceHtml = `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.75rem;">`;
            affectedRaws.forEach(([type, stats]) => {
                const current = confStockMap[type] || 0;
                const final = current + stats.produced - stats.consumed;
                const isNeg = final < 0;
                const color = isNeg ? 'var(--danger-text)' : 'var(--success-text)';
                balanceHtml += `<span style="color:var(--on-surface-variant)">${type}: ${current.toLocaleString()} → <strong style="color:${color}">${Math.floor(final).toLocaleString()}</strong></span><br>`;
            });
            balanceHtml += '</div>';
        }

        const wamLinesHtml = confirmLines.map(l =>
            `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.75rem;color:var(--on-surface-variant)">${l}</div>`
        ).join('');
        const wamBodyHtml =
            `<div style="margin-bottom:10px">Work as Manager in <strong>${totalSelected} companies</strong> in <strong>${hName}</strong></div>` +
            `<div style="margin-bottom:10px">${wamLinesHtml}</div>` +
            `<div>Energy required: <strong>${energyRequired}</strong></div>` +
            balanceHtml;
        if (!await showConfirmModal('Work as Manager', wamBodyHtml, 'Work')) return;

        const btnWam = document.getElementById('btn-wam');
        btnWam.disabled = true;

        const doTravel = document.getElementById('chk-travel-holding').checked;
        const doReturn = document.getElementById('chk-travel-home').checked;
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

            // Collect individual company IDs based on group selections
            const companyIds = [];
            const affectedCompanies = [];
            selectedGroups.forEach(group => {
                const companiesInGroup = AppState.filteredArr.filter(c => {
                    const hId = c.holding_company_id || 'unassigned';
                    const ind = c.calculated_industry || 'unknown';
                    const q = c.calculated_quality || '1';
                    const key = `${hId}_${ind}_${q}`;
                    return key === group.key && !c.already_worked;
                });

                const toTake = companiesInGroup.slice(0, group.wamCount);
                toTake.forEach(c => {
                    companyIds.push(c.id);
                    affectedCompanies.push(c);
                });
            });

            const urlEncodedIds = encodeURIComponent(JSON.stringify(companyIds));
            let payload = `own_work=${urlEncodedIds}&employee_works=%7B%7D&cntOwnWork=${companyIds.length}&cntEmployeeWork=0&cntSelected=${companyIds.length}&action_type=production&_token=${AppState.csrfToken}`;
            if (useEnergyBar) payload += '&useEnergyBar=yes';

            const responseTxt = await apiPost('https://www.erepublik.com/en/economy/work', payload);
            const res = JSON.parse(responseTxt);

            if (isCaptchaResponse(res)) {
                showToast('Captcha required. Open the game in your browser to solve it, then retry.', 'error');
                return;
            }

            if (res.status === true) {
                // Clear prediction entries before any await — prevents the estimate from seeing
                // both updated stocks AND stale entries during the await chain below.
                AppState._wamEntries = [];
                AppState._wamRegionIds = [];

                AppState.energyData.energy = Math.max(0, AppState.energyData.energy - energyRequired);
                affectedCompanies.forEach(c => c.already_worked = true);

                await setDbValue('energyData', AppState.energyData);

                // Recalculate projections for the EFFECTIVE selection to update raws accurately
                const typeMap = {}; // industry -> {p, c}
                affectedCompanies.forEach(c => {
                    const fname = c.building_img.split('/').pop();
                    const def = companyDefinitions[fname];
                    if (def && def.baseProduction) {
                        const amount = def.baseProduction * (parseFloat(c.effective_bonus) || 100) / 100;
                        const ind = def.industry;
                        if (!typeMap[ind]) typeMap[ind] = { p: 0, c: 0 };
                        typeMap[ind].p += amount;
                        if (!ind.endsWith('_raw') && def.rawCost) typeMap[ind].c += (amount * def.rawCost);
                    }
                });

                const p = AppState.pageDetails;
                const typeToId = { 'FRM': 7, 'WRM': 12, 'HRM': 17, 'ARM': 24 };
                const deltas = {};

                Object.entries(typeMap).forEach(([ind, stats]) => {
                    const rName = RAW_NAMES[ind.replace('_raw', '')];
                    // Raw companies produce raw (delta = +produced). Finished goods companies
                    // consume raw (delta = -consumed). stats.p for finished goods is in finished
                    // goods units, not raw units — mixing them was the bug.
                    const delta = ind.endsWith('_raw') ? stats.p : -stats.c;
                    if (delta !== 0) {
                        deltas[rName] = (deltas[rName] || 0) + delta;
                        if (rName === 'FRM') p.food_raw_stock = (p.food_raw_stock || 0) + delta;
                        if (rName === 'WRM') p.weapon_raw_stock = (p.weapon_raw_stock || 0) + delta;
                        if (rName === 'HRM') p.house_raw_stock = (p.house_raw_stock || 0) + delta;
                        if (rName === 'ARM') p.airplane_raw_stock = (p.airplane_raw_stock || 0) + delta;
                    }
                });
                await setDbValue('pageDetails', p);

                const inv = await getDbValue('inventory');
                if (Array.isArray(inv)) {
                    const main = inv.find(s => s.id === 'mainStorage');
                    if (main && main.items) {
                        Object.entries(deltas).forEach(([type, delta]) => {
                            const item = main.items.find(i => i.industryId === typeToId[type]);
                            if (item) item.amount += delta;
                        });
                        await setDbValue('inventory', inv);
                    }
                }

                const fullCompanies = await getDbValue('companies');
                affectedCompanies.forEach(c => { if (fullCompanies[c.id]) fullCompanies[c.id].already_worked = true; });
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

        // Detailed Confirmation (Recalculate breakdown locally for the confirmation msg)
        const empProductivityMap = {};
        const confirmEntries = affectedCompanies.map(({ obj, amount: assignToThisComp }) => {
            const def = companyDefinitions[obj.building_img.split('/').pop()];
            if (!def || !def.baseProduction) return null;
            const productivity = parseFloat(obj.effective_bonus) || 100;
            const key = def.industry.endsWith('_raw') ? def.industry : `${def.industry}_q${obj.quality}`;
            if (!empProductivityMap[key]) empProductivityMap[key] = productivity;
            const prodPerEmp = def.baseProduction * productivity / 100;
            return { def, quality: obj.quality, totalProd: prodPerEmp * assignToThisComp };
        }).filter(Boolean);
        const { breakdown: empBreakdownLocal, rawProjected: rawProjectedEmpLocal } = computeProductionEstimate(confirmEntries);

        const assignLines = [];
        Object.entries(empBreakdownLocal).forEach(([key, t]) => {
            if (t.prod > 0) {
                const pct = empProductivityMap[key] || 100;
                let line = `${t.label} (${parseFloat(pct).toFixed(2)}%) — Est. ${t.prod.toFixed(2)} units`;
                if (t.cons > 0) line += ` (Uses ${t.cons.toFixed(2)} ${t.rawType})`;
                assignLines.push(line);
            }
        });
        const assignLinesHtml = assignLines.map(l =>
            `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.75rem;color:var(--on-surface-variant)">${l}</div>`
        ).join('');
        const assignBodyHtml =
            `<div style="margin-bottom:10px">Assign and work <strong>${amount - left} employees</strong> in <strong>${companyCount} companies</strong></div>` +
            `<div>${assignLinesHtml}</div>`;

        if (!await showConfirmModal('Employee Assignment', assignBodyHtml, 'Assign & Work')) {
            btnAssign.disabled = false;
            btnAssign.textContent = 'Assign & Work';
            return;
        }

        const employeeWorksEncoded = encodeURIComponent(JSON.stringify(employee_works));
        const payload = `own_work=%5B%5D&employee_works=${employeeWorksEncoded}&cntOwnWork=0&cntEmployeeWork=${companyCount}&cntSelected=${companyCount}&action_type=production&_token=${AppState.csrfToken}`;

        try {
            const responseTxt = await apiPost('https://www.erepublik.com/en/economy/work', payload);
            const res = JSON.parse(responseTxt);
            if (isCaptchaResponse(res)) {
                showToast('Captcha required. Open the game in your browser to solve it, then retry.', 'error');
                return;
            }
            if (res.status === true) {
                AppState._assignEntries = [];
                AppState._assignRegionIds = [];

                showToast(`Successfully worked ${amount - left} employees!`, 'success');

                const fullCompanies = await getDbValue('companies');
                affectedCompanies.forEach(({ obj, amount }) => {
                    obj.todays_works = (parseInt(obj.todays_works) || 0) + amount;
                    if (fullCompanies[obj.id]) {
                        fullCompanies[obj.id].todays_works = obj.todays_works;
                    }
                });
                await setDbValue('companies', fullCompanies);

                // Update Raws in pageDetails using the local projection
                const p = AppState.pageDetails;
                const typeToId = { 'FRM': 7, 'WRM': 12, 'HRM': 17, 'ARM': 24 };
                const deltas = {};

                Object.entries(rawProjectedEmpLocal).forEach(([type, stats]) => {
                    if (stats.produced > 0 || stats.consumed > 0) {
                        const delta = stats.produced - stats.consumed;
                        deltas[type] = delta;
                        if (type === 'FRM') p.food_raw_stock = (p.food_raw_stock || 0) + delta;
                        if (type === 'WRM') p.weapon_raw_stock = (p.weapon_raw_stock || 0) + delta;
                        if (type === 'HRM') p.house_raw_stock = (p.house_raw_stock || 0) + delta;
                        if (type === 'ARM') p.airplane_raw_stock = (p.airplane_raw_stock || 0) + delta;
                    }
                });
                await setDbValue('pageDetails', p);

                // Sync with Inventory in DB to prevent stale overwrites in loadDataFromDb
                const inv = await getDbValue('inventory');
                if (Array.isArray(inv)) {
                    const main = inv.find(s => s.id === 'mainStorage');
                    if (main && main.items) {
                        Object.entries(deltas).forEach(([type, delta]) => {
                            const item = main.items.find(i => i.industryId === typeToId[type]);
                            if (item) item.amount += delta;
                        });
                        await setDbValue('inventory', inv);
                    }
                }

                // Withdraw assigned count from work pool
                const assignedCount = amount - left;
                if (AppState.employeeWorkPool !== null) {
                    AppState.employeeWorkPool = Math.max(0, AppState.employeeWorkPool - assignedCount);
                    await setDbValue('employeeWorkPool', AppState.employeeWorkPool);
                    console.log(`[WorkPool] -${assignedCount} works assigned. Pool: ${AppState.employeeWorkPool}`);
                }

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

        const holdingId = AppState.filters.holding;
        const h = AppState.holdingsMap[holdingId];
        const hName = h ? h.name : 'Unknown';
        const rId = h ? h.region_id : null;
        const regionData = regionMap[rId] || { name: `Region ${rId}`, permalink: '#' };
        const industry = AppState.filters.industry;
        const currentQ = AppState.filters.quality;

        const upgradeBodyHtml =
            `<div style="display:grid;grid-template-columns:auto 1fr;gap:5px 14px;font-size:0.8rem;">` +
            `<span style="color:var(--on-surface-variant)">Companies</span><span><strong>${toUpgrade.length}×</strong> ${formatIndustryName(industry)} Q${currentQ} → Q${targetQ}</span>` +
            `<span style="color:var(--on-surface-variant)">Location</span><span>${hName} · ${regionData.name}</span>` +
            `<span style="color:var(--on-surface-variant)">Cost</span><span style="color:#fabd00;font-weight:600;">${totalCost.toLocaleString()} Gold</span>` +
            `</div>`;

        if (!await showConfirmModal('Mass Upgrade', upgradeBodyHtml, 'Upgrade')) return;

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

            // Deduct gold cost from inventory so loadDataFromDb reads the correct balance
            const actualGoldSpent = toUpgrade
                .filter(c => successIds.includes(c.id))
                .reduce((sum, c) => sum + parseInt((c.upgrades && c.upgrades[targetQ] && c.upgrades[targetQ].cost) || 0), 0);
            if (actualGoldSpent > 0) {
                const inv = await getDbValue('inventory');
                if (Array.isArray(inv)) {
                    const main = inv.find(s => s.id === 'mainStorage');
                    const goldItem = main && main.items ? main.items.find(i => i.id === 'gold') : null;
                    if (goldItem) {
                        goldItem.amount = Math.max(0, goldItem.amount - actualGoldSpent);
                        await setDbValue('inventory', inv);
                    }
                }
            }

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
            if (isCaptchaResponse(res)) {
                showToast('Captcha required. Open the game in your browser to solve it, then retry.', 'error');
                return;
            }
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

        const otWarningHtml = energyCost === 100
            ? `<div style="margin-bottom:10px;padding:8px 10px;background:rgba(192,57,43,0.15);border-left:2px solid #c0392b;color:#e74c3c;font-size:0.75rem;">Careful — this overtime will cost <strong>100 energy</strong>, not 10.</div>`
            : '';
        const otBodyHtml = `${otWarningHtml}<div>Work overtime? This will cost <strong>${energyCost} energy</strong>.</div>`;
        if (!await showConfirmModal('Overtime Work', otBodyHtml, 'Work Overtime', energyCost === 100)) return;

        const btn = document.getElementById('btn-work-ot');
        btn.disabled = true; btn.textContent = 'Working...';

        const payload = `_token=${AppState.csrfToken}&action_type=workOvertime`;
        try {
            const responseTxt = await apiPost('https://www.erepublik.com/en/economy/workOvertime', payload);
            const res = JSON.parse(responseTxt);
            if (isCaptchaResponse(res)) {
                showToast('Captcha required. Open the game in your browser to solve it, then retry.', 'error');
                return;
            }
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

    function showConfirmModal(title, bodyHtml, confirmLabel = 'Confirm', danger = false) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100000;display:flex;align-items:center;justify-content:center;';

            const modal = document.createElement('div');
            modal.style.cssText = 'background:#1a1d20;border:1px solid rgba(255,255,255,0.12);min-width:320px;max-width:520px;width:90vw;font-family:Inter,sans-serif;color:#e8eaed;';

            const confirmColor = danger ? '#c0392b' : '#fabd00';
            const confirmTextColor = danger ? '#fff' : '#121416';
            modal.innerHTML = `
                <div style="background:#242729;padding:13px 18px;border-bottom:1px solid rgba(255,255,255,0.08);">
                    <span style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:0.8125rem;color:#fabd00;text-transform:uppercase;letter-spacing:0.5px;">${title}</span>
                </div>
                <div style="padding:16px 18px;font-size:0.8rem;line-height:1.6;">${bodyHtml}</div>
                <div style="padding:10px 18px;border-top:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;justify-content:flex-end;">
                    <button class="ccm-cancel" style="padding:6px 16px;background:transparent;border:1px solid rgba(255,255,255,0.18);color:#aaa;font-size:0.8rem;cursor:pointer;font-family:Inter,sans-serif;">Cancel</button>
                    <button class="ccm-confirm" style="padding:6px 16px;background:${confirmColor};border:none;color:${confirmTextColor};font-size:0.8rem;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;">${confirmLabel}</button>
                </div>
            `;

            let keyHandler;
            const cleanup = result => { document.removeEventListener('keydown', keyHandler); overlay.remove(); resolve(result); };
            keyHandler = e => { if (e.key === 'Escape') cleanup(false); };
            document.addEventListener('keydown', keyHandler);
            modal.querySelector('.ccm-cancel').addEventListener('click', () => cleanup(false));
            modal.querySelector('.ccm-confirm').addEventListener('click', () => cleanup(true));
            overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); });

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            modal.querySelector('.ccm-confirm').focus();
        });
    }

    // ==========================================
    // 10. NAVIGATION INJECTION
    // ==========================================
    function injectNavigationLink() {
        if (window.location.pathname.startsWith(CUSTOM_URL)) return;
        const menu = document.querySelector("#menu2 > ul");
        if (!menu) return;
        if (menu.querySelector(`a[href="${CUSTOM_URL}"]`)) return;

        const companiesLink = menu.querySelector('a[href="/en/economy/myCompanies"]');
        if (companiesLink && companiesLink.parentElement) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${CUSTOM_URL}">Custom company manager</a>`;
            companiesLink.parentElement.insertAdjacentElement('afterend', li);
        }
    }

    // Start
    injectNavigationLink();
    initCustomManager();

})();
