// ==UserScript==
// @name         BattleTracker
// @version      0.5
// @description  Track battles from anywhere
// @author       Curlybear
// @updateURL		https://curlybear.eu/erep/battletracker.user.js
// @downloadURL		https://curlybear.eu/erep/battletracker.user.js
// @match        https://www.erepublik.com/*
// @grant        none
// @noframes
// ==/UserScript==

// Credit to ReanuKeeves for the improved drag and drop logic

// 0.2
// - Fix first time use scenario

// 0.3
// - Better implementation of drag and drop logic

// 0.4
// - Medal tracking (White background for battles fought in, green border for winning medal, red for not winning medal)
// - Minor design updates

// 0.5
// - Fix cleanup of old battles generating errors

// Possible future features:
// - Auto track medals/fought in battles (setting on/off)
// - Track button on battlefield
// - Epic status visual representation, somehow

(function() {
    'use strict';
    let selectedRegion = "Abkhazia";
    const regions = ["Abkhazia",
                     "Abruzzo",
                     "Abu Dhabi",
                     "Aegean Coast of Turkey",
                     "Aegean Islands",
                     "Ajman",
                     "Al Bahah",
                     "Al Jawf",
                     "Al Madinah",
                     "Al Qasim",
                     "Al Riyadh",
                     "Alabama",
                     "Aland",
                     "Alaska",
                     "Albanian Coast",
                     "Alberta",
                     "Alentejo",
                     "Algarve",
                     "Alsace",
                     "Amazonica",
                     "Andalucia",
                     "Andhra Pradesh",
                     "Andina",
                     "Anhui",
                     "Aosta Valley",
                     "Apulia",
                     "Aquitaine",
                     "Aragon",
                     "Argentine Northwest",
                     "Arizona",
                     "Arkansas",
                     "Asir",
                     "Asturias",
                     "Attica",
                     "Auckland",
                     "Auvergne",
                     "Azores",
                     "Baden-Wurttemberg",
                     "Baja",
                     "Balearic Islands",
                     "Balochistan",
                     "Banat",
                     "Basilicata",
                     "Basque Country",
                     "Bassarabia",
                     "Bavaria",
                     "Beersheba South District",
                     "Beijing",
                     "Belgrade",
                     "Beni and Cochabamba",
                     "Bihar",
                     "Black Sea Coast of Turkey",
                     "Bohus",
                     "Bolivian Altiplano",
                     "Brandenburg and Berlin",
                     "Bratislava",
                     "Brcko District",
                     "Brestskaya",
                     "British Columbia",
                     "Brittany",
                     "Brussels",
                     "Bucovina",
                     "Bukovyna",
                     "Burgas",
                     "Burgenland",
                     "Burgundy",
                     "Calabria",
                     "California",
                     "Campania",
                     "Canary Islands",
                     "Cantabria",
                     "Canterbury",
                     "Caribe e Insular",
                     "Carinthia",
                     "Castilla La Mancha",
                     "Castilla y Leon",
                     "Catalonia",
                     "Center West of Brazil",
                     "Central Anatolia",
                     "Central Armenia",
                     "Central Black Earth",
                     "Central Croatia",
                     "Central East Chaco",
                     "Central Greece",
                     "Central Hungary",
                     "Central Montenegro",
                     "Central Slovakia",
                     "Central Taiwan",
                     "Central Thailand",
                     "Central Transdanubia",
                     "Central Venezuela",
                     "Central Western Venezuela",
                     "Centro",
                     "Chagang",
                     "Champagne Ardenne",
                     "Charrua",
                     "Chhattisgarh",
                     "Chimor",
                     "Chisinau",
                     "Chongqing",
                     "Chubu",
                     "Chugoku",
                     "Chungcheongbuk-do",
                     "Chungcheongnam-do",
                     "Chuquisaca and Tarija",
                     "Colorado",
                     "Connecticut",
                     "Cork",
                     "Corsica",
                     "Crete",
                     "Crisana",
                     "Cundiboyacense",
                     "Cuyo",
                     "Dainava",
                     "Delaware",
                     "Deutschschweiz",
                     "District of Columbia",
                     "Dnipro",
                     "Dobrogea",
                     "Donbas",
                     "Dubai",
                     "Dublin",
                     "East Midlands",
                     "East of England",
                     "East Srpska Republic",
                     "Eastern Anatolia",
                     "Eastern Cape",
                     "Eastern Finland",
                     "Eastern Macedonia",
                     "Eastern Netherlands",
                     "Eastern Province",
                     "Eastern Serbia",
                     "Eastern Siberia",
                     "Eastern Slovakia",
                     "Eastern Taiwan",
                     "Eastern Thailand",
                     "Emilia-Romagna",
                     "Epirus",
                     "Esfahan",
                     "Extremadura",
                     "Far Eastern Russia",
                     "Fars",
                     "Federation of BiH",
                     "Flanders",
                     "Florida",
                     "Franche-comte",
                     "Free State",
                     "Friuli-Venezia Giulia",
                     "Fujairah",
                     "Fujian",
                     "Galicia and Lodomeria",
                     "Galicia",
                     "Gangwon-do",
                     "Gansu",
                     "Gauteng",
                     "Gegharkunik",
                     "Georgia",
                     "Gotaland",
                     "Gotland",
                     "Graubunden",
                     "Great Andes",
                     "Great Poland",
                     "Guangdong",
                     "Guangxi",
                     "Guayana",
                     "Guizhou",
                     "Gujarat",
                     "Gulf of Mexico",
                     "Gyeonggi-do",
                     "Gyeongsangbuk-do",
                     "Gyeongsangnam-do",
                     "Ha'il",
                     "Haifa district",
                     "Hainan",
                     "Hamgyong",
                     "Hawaii",
                     "Heilongjiang",
                     "Henan",
                     "Hesse",
                     "Hokkaido",
                     "Homelskaya",
                     "Hormozgan",
                     "Hovedstaden",
                     "Hrodzienskaya",
                     "Hubei",
                     "Hunan",
                     "Hwangae",
                     "Idaho",
                     "Illinois",
                     "Indiana",
                     "Inner Carniola",
                     "Inner Kartli",
                     "Inner Mongolia",
                     "Ionian Islands",
                     "Iowa",
                     "Istria and Kvarner",
                     "Jammu and Kashmir",
                     "Jamtland Harjedalen",
                     "Java",
                     "Jeju",
                     "Jeollabuk-do",
                     "Jeollanam-do",
                     "Jerusalem district",
                     "Jharkhand",
                     "Jiangsu",
                     "Jiangxi",
                     "Jilin",
                     "Jizan",
                     "Kakheti",
                     "Kalimantan",
                     "Kaliningrad",
                     "Kangwon",
                     "Kansas",
                     "Kanto",
                     "Karnataka",
                     "Kentucky",
                     "Kerala",
                     "Kerman Province",
                     "Kesk-Eesti",
                     "Kinki",
                     "Kirde-Eesti",
                     "Kosovo",
                     "Kurzeme",
                     "KwaZulu Natal",
                     "Kyushu",
                     "La Rioja",
                     "Laane-Eesti",
                     "Languedoc Roussillon",
                     "Lapland",
                     "Las Villas",
                     "Latgale",
                     "Lazio",
                     "Leningrad Oblast",
                     "Lesser Sunda Islands",
                     "Liaoning",
                     "Liguria",
                     "Lika and Gorski Kotar",
                     "Lima",
                     "Limousin",
                     "Limpopo",
                     "Lisboa",
                     "Lithuania Minor",
                     "Lithuanian Highland",
                     "Little Poland",
                     "Llanos",
                     "Loire Valley",
                     "Lombardy",
                     "London",
                     "Lorraine",
                     "Louisiana",
                     "Louna-Eesti",
                     "Louth",
                     "Low Andes",
                     "Lower Austria",
                     "Lower Carniola",
                     "Lower Egypt",
                     "Lower Kartli",
                     "Lower Normandy",
                     "Lower Saxony and Bremen",
                     "Luzon",
                     "Macedonia",
                     "Madeira",
                     "Madhya Pradesh",
                     "Madrid",
                     "Maharashtra",
                     "Mahilyowskaya",
                     "Maine",
                     "Makkah",
                     "Maluku islands",
                     "Manitoba",
                     "Maramures",
                     "Marche",
                     "Marmara",
                     "Maryland",
                     "Massachusetts",
                     "Mayo",
                     "Mazandaran and Golistan",
                     "Mazovia",
                     "Mazuria",
                     "Mecklenburg-Western Pomerania",
                     "Mediterranean Coast of Turkey",
                     "Mesopotamia",
                     "Michigan",
                     "Mid Andes",
                     "Middle Egypt",
                     "Midi-Pyrenees",
                     "Midtjylland",
                     "Mindanao",
                     "Minnesota",
                     "Minskaya",
                     "Mississippi",
                     "Missouri",
                     "Moldova",
                     "Molise",
                     "Montana",
                     "Montenegrin Coast",
                     "Moravia",
                     "Moscow and Central Russia",
                     "Mpumalanga",
                     "Muntenia",
                     "Murcia",
                     "Najran",
                     "Navarra",
                     "Nazareth North District",
                     "Nebraska",
                     "Nevada",
                     "New Brunswick",
                     "New Hampshire",
                     "New Jersey",
                     "New Mexico",
                     "New South Wales",
                     "New York",
                     "Newfoundland and Labrador",
                     "Ningxia",
                     "Nord-Norge",
                     "Nordjylland",
                     "Norrland and Sameland",
                     "Norte Chico",
                     "Norte Grande",
                     "Norte",
                     "North Calais",
                     "North Carolina",
                     "North Caucasus",
                     "North Central States",
                     "North Dakota",
                     "North Dalmatia",
                     "North East of England",
                     "North East States",
                     "North Eastern India",
                     "North Eastern Venezuela",
                     "North Montenegrin Mountains",
                     "North of Brazil",
                     "North Rhine-Westphalia",
                     "North West of England",
                     "North West Province",
                     "North West States",
                     "North-Eastern Thailand",
                     "North-West Frontier Province",
                     "Northeast of Brazil",
                     "Northeast of Mexico",
                     "Northern Armenia",
                     "Northern Basarabia",
                     "Northern Bohemia",
                     "Northern Borders",
                     "Northern Cape",
                     "Northern Cyprus",
                     "Northern Great Plain",
                     "Northern Hungary",
                     "Northern India",
                     "Northern Ireland",
                     "Northern Low Amazon",
                     "Northern Netherlands",
                     "Northern Russia",
                     "Northern Taiwan",
                     "Northern Territory",
                     "Northern Thailand",
                     "Northwest Croatia",
                     "Northwest of Mexico",
                     "Northwest Territories",
                     "Northwestern Iran",
                     "Nova Scotia",
                     "Nunavut",
                     "Oaxaca",
                     "Ohio",
                     "Oklahoma",
                     "Oltenia",
                     "Ontario",
                     "Oregon",
                     "Oriente",
                     "Orinoquia",
                     "Orissa",
                     "Ostlandet",
                     "Otago",
                     "Oulu",
                     "Pacific Coast of Mexico",
                     "Pacifica",
                     "Palawan",
                     "Pampas",
                     "Pando",
                     "Papua",
                     "Parana and Santa Catarina",
                     "Paranena",
                     "Paris Isle of France",
                     "Patagonia",
                     "Pays de la Loire",
                     "Peloponnese",
                     "Peninsular Malaysia",
                     "Pennsylvania",
                     "Picardy",
                     "Piedmont",
                     "Plovdiv",
                     "Podolia",
                     "Pohja-Eesti",
                     "Poitou Charentes",
                     "Polisia",
                     "Pomerania",
                     "Povardarie",
                     "Prekmurje",
                     "Prince Edward Island",
                     "Provence Alpes Azur",
                     "Punjab",
                     "Pyongan",
                     "Qinghai",
                     "Quebec",
                     "Queensland",
                     "Rajasthan",
                     "Ras al-Khaimah",
                     "Raska",
                     "Razavi Khorasan",
                     "Red Sea Coast",
                     "Rhineland-Palatinate",
                     "Rhode Island",
                     "Rhone Alps",
                     "Rio Grande do Sul",
                     "Romandie",
                     "Ruse",
                     "Ryanggang",
                     "Saarland",
                     "Sabah",
                     "Salzburg",
                     "Samogitia",
                     "Santa Cruz",
                     "Sarawak",
                     "Sardinia",
                     "Saskatchewan",
                     "Saxony-Anhalt",
                     "Saxony",
                     "Scania",
                     "Schleswig-Holstein and Hamburg",
                     "Scotland",
                     "Semnan",
                     "Shaanxi",
                     "Shandong",
                     "Shanghai",
                     "Shannon",
                     "Shanxi",
                     "Sharjah",
                     "Shikoku",
                     "Sichuan",
                     "Sicily",
                     "Silesia",
                     "Sinai",
                     "Sindh",
                     "Singapore City",
                     "Sistan and Baluchistan",
                     "Siveria",
                     "Sjaelland",
                     "Slavonia",
                     "Sloboda",
                     "Slovenian Littoral",
                     "Smaland",
                     "Sofia",
                     "Sorlandet",
                     "South Australia",
                     "South Carolina",
                     "South Dakota",
                     "South Dalmatia",
                     "South East Chaco",
                     "South East of England",
                     "South East States",
                     "South Khorasan",
                     "South South States",
                     "South West of England",
                     "South West States",
                     "Southeast of Brazil",
                     "Southeast of Mexico",
                     "Southeastern Albania",
                     "Southeastern Anatolia",
                     "Southern Basarabia",
                     "Southern Bohemia",
                     "Southern Cyprus",
                     "Southern Finland",
                     "Southern Great Plain",
                     "Southern Low Amazon",
                     "Southern Netherlands",
                     "Southern Serbia",
                     "Southern Taiwan",
                     "Southern Thailand",
                     "Southern Transdanubia",
                     "Southwestern Iran",
                     "Styria and Carinthia",
                     "Styria",
                     "Subcarpathia",
                     "Sudovia",
                     "Sulawesi",
                     "Sumadija",
                     "Sumatra",
                     "Svalbard & Jan Mayen",
                     "Svealand",
                     "Svizzera italiana",
                     "Syddanmark",
                     "Syunik",
                     "Tabuk",
                     "Tamil Nadu",
                     "Tasmania",
                     "Taurida",
                     "Tel Aviv Center District",
                     "Tennessee",
                     "Texas",
                     "Thessaly",
                     "Thrace",
                     "Thuringia",
                     "Tibet",
                     "Tirana",
                     "Tohoku",
                     "Transilvania",
                     "Transnistria",
                     "Trentino-South Tyrol",
                     "Trondelag",
                     "Tuscany",
                     "Tyrol",
                     "Umbria",
                     "Umm al Quwain",
                     "Upper Austria",
                     "Upper Carniola",
                     "Upper Egypt",
                     "Upper Normandy",
                     "Urals",
                     "Utah",
                     "Uttar Pradesh",
                     "Valencian Community",
                     "Valley of Mexico",
                     "Varna",
                     "Veneto",
                     "Venezuelan Andean",
                     "Venezuelan Capital",
                     "Vermont",
                     "Vestlandet",
                     "Victoria",
                     "Vidin",
                     "Vidzeme",
                     "Virginia",
                     "Visayas",
                     "Vitsebskaya",
                     "Vojvodina",
                     "Volga Vyatka",
                     "Volga",
                     "Volhynia",
                     "Vorarlberg",
                     "Wales",
                     "Wallonia",
                     "Washington",
                     "Wellington",
                     "West Bengal",
                     "West Georgia",
                     "West Midlands",
                     "West Srpska Republic",
                     "West Virginia",
                     "Western Australia",
                     "Western Cape",
                     "Western Cuba",
                     "Western Desert",
                     "Western Finland",
                     "Western Macedonia",
                     "Western Netherlands",
                     "Western Serbia",
                     "Western Siberia",
                     "Western Slovakia",
                     "Western Transdanubia",
                     "Wexford",
                     "Wisconsin",
                     "Wyoming",
                     "Xinjiang",
                     "Yazd",
                     "Yorkshire & Humberside",
                     "Yukon",
                     "Yunnan",
                     "Zaporozhia",
                     "Zemgale",
                     "Zhejiang",
                     "Zona Austral",
                     "Zona Central",
                     "Zona Sur",
                     "Zulian"
                    ]

    let battles = JSON.parse(localStorage.getItem("battletracker_battle_ids"))
    if (!battles) {
        let battles = []
        localStorage.setItem("battletracker_battle_ids", JSON.stringify(battles));
    }

    localStorage.setItem("battletracker_day", JSON.stringify(erepublik.settings.eDay));

    // Setup the tracker box
    jQuery("body").append("<div id='battletracker'><button id='battletrackerHeader'></button></div>");

    if(!localStorage.getItem('epicpos1') || !localStorage.getItem('epicpos2')){localStorage.setItem('epicpos1', 0);localStorage.setItem('epicpos2', 100)}
    dragElement("battletracker",'epicpos1','epicpos2');
    var epicelmnt = document.getElementById("battletracker");
    var epicpos1 = localStorage.getItem('epicpos1'), epicpos2 = localStorage.getItem('epicpos2');
    epicelmnt.style.top = epicpos2 + "px";
    epicelmnt.style.left = epicpos1 + "px";


    let battletracker_trackedregions = JSON.parse(localStorage.getItem("battletracker_trackedregions"));

    if (battletracker_trackedregions == null){
        battletracker_trackedregions = []
        localStorage.setItem("battletracker_trackedregions", JSON.stringify(battletracker_trackedregions.unique()));
    }

    const battletracker = document.getElementById("battletracker");
    jQuery(battletracker).append("<div id='battletracker_setting_btn'>⚙️</div>")
    jQuery("body").append("<div id='battletracker_setting_modal' class='modal'><div class='close' id='battletracker_setting_closebtn'>✖</div></div>")
    jQuery("#battletracker_setting_modal").append("<div class='searchregionbar'><select id='battletracker_setting_comboBoxRegions'></select><button id='battletracker_setting_RegionsAdd'>Track region</button></div>")
    jQuery("#battletracker_setting_modal").append("<div class='trackedregionscontainer'><span class='battletracker_setting_title'>Currently tracked regions</span><ul id='battletracker_setting_tracked_regions_list'></ul></div>")

    jQuery("#battletracker_setting_RegionsAdd").click(function() {
        addRegion(selectedRegion);
    });

    // Display tracked regions
    for (let region in battletracker_trackedregions){
        if (region != 'unique') {
            jQuery('#battletracker_setting_tracked_regions_list').append("<li id='battletracker_setting_region_" + battletracker_trackedregions[region].replace(/\s/g, '') + "'>" + battletracker_trackedregions[region] + "</li>")

            let button = jQuery("#battletracker_setting_tracked_regions_list li:last").append("<span class='battletracker_remove'>✖</span>");
            button.click(function() {
                jQuery("#battletracker_setting_region_" + battletracker_trackedregions[region].replace(/\s/g, '')).remove();
                battletracker_trackedregions = battletracker_trackedregions.filter(function(value) {
                    return value !== battletracker_trackedregions[region];
                });
                localStorage.setItem("battletracker_trackedregions", JSON.stringify(battletracker_trackedregions.unique()));
            })
        }
    }

    function addRegion(region) {
        battletracker_trackedregions.push(selectedRegion)
        localStorage.setItem("battletracker_trackedregions", JSON.stringify(battletracker_trackedregions));
        jQuery('#battletracker_setting_tracked_regions_list').append("<li>" + selectedRegion + "</li>")
    }

    for (const region in regions) {
        if (region != 'unique') {
            jQuery("#battletracker_setting_comboBoxRegions").append("<option value='" + regions[region] + "'>" + regions[region] + "</select>")
        }
    }

    const battletracker_setting_comboBoxRegions = document.getElementById("battletracker_setting_comboBoxRegions");

    battletracker_setting_comboBoxRegions.addEventListener("change", function() {
        selectedRegion = this.value;
    });

    let openBtn = document.getElementById("battletracker_setting_btn");
    let battletracker_setting_modal = document.getElementById("battletracker_setting_modal");
    let closeBtn = document.getElementById("battletracker_setting_closebtn");

    openBtn.addEventListener("click", function() {
        battletracker_setting_modal.style.display = "block";
    });

    closeBtn.addEventListener("click", function() {
        battletracker_setting_modal.style.display = "none";
    });

    // Add table and battles
    jQuery("#battletracker").append("<table id='battletrackertable'></table>");
    jQuery("#battletrackertable").append("<tr class='headers'></tr>");
    jQuery("#battletrackertable tr:last").append("<td class='battletracker_header'>Region</td>");
    jQuery("#battletrackertable tr:last").append("<td class='battletracker_header'>D1</td>");
    jQuery("#battletrackertable tr:last").append("<td class='battletracker_header'>D2</td>");
    jQuery("#battletrackertable tr:last").append("<td class='battletracker_header'>D3</td>");
    jQuery("#battletrackertable tr:last").append("<td class='battletracker_header'>D4</td>");
    jQuery("#battletrackertable tr:last").append("<td class='battletracker_header'>Air</td>");
    jQuery("#battletrackertable tr:last").append("<td class='battletracker_header'>Time</td>");
    jQuery("#battletrackertable tr:last").append("<td class='battletracker_header'></td>");

    // Get fighting info
    var xobjfighting = new XMLHttpRequest();
    xobjfighting.overrideMimeType("application/json");
    xobjfighting.open('GET', 'https://www.erepublik.com/en/military/campaignsJson/citizen', true);
    xobjfighting.onreadystatechange = function () {
        if (xobjfighting.readyState == 4 && xobjfighting.status == "200") {
            load_fighting_info(xobjfighting.responseText);
        }
    };
    xobjfighting.send();



    function load_fighting_info(response) {
        const x = JSON.parse(response);
        var battles = x.battles;
        var statsdivs = []
        var statsbattles = []
        for (let b in battles){
            if (battles[b].citizenStats){
                for (let s in battles[b].citizenStats) {
                    statsbattles.push(b)
                    statsdivs = jQuery.merge(statsdivs, battles[b].citizenStats[s].activeZones)
                }
            }
        }

        statsbattles = statsbattles.unique()

        // Get battle info
        var xobj2 = new XMLHttpRequest();
        xobj2.overrideMimeType("application/json");
        xobj2.open('GET', 'https://www.erepublik.com/en/military/campaignsJson/list', true);
        xobj2.onreadystatechange = function () {
            if (xobj2.readyState == 4 && xobj2.status == "200") {
                add_battle_info(xobj2.responseText, statsbattles, statsdivs);
            }
        };
        xobj2.send();
    }


    function add_battle_info(response, statsbattles, statsdivs) {
        const x = JSON.parse(response);
        const battles = x.battles;
        var time = Math.floor(Date.now() / 1000);
        let battletracker_battle_ids = JSON.parse(localStorage.getItem("battletracker_battle_ids"));

        // Find battleids of tracked regions
        //for (region in battletracker_trackedregions) {
        let filteredBattles = Object.entries(battles).filter(([key,value]) => battletracker_trackedregions.includes(value.region.name));
        for (let battle in filteredBattles){
            if (battle != 'unique') {
                battletracker_battle_ids.push(filteredBattles[battle][0])
            }
        }

        battletracker_battle_ids = battletracker_battle_ids.unique();
        //}

        // Loop on battles
        for (var i = 0; i < battletracker_battle_ids.length; i++) {
            let battle = battles[battletracker_battle_ids[i]]

            // Clean up old battles
            if(!battle){
                let badid = battletracker_battle_ids[i]
                battletracker_battle_ids = battletracker_battle_ids.filter(function(value) {
                    return value != badid;
                });
                localStorage.setItem("battletracker_battle_ids", JSON.stringify(battletracker_battle_ids));
                continue;
            }
            jQuery("#battletrackertable").append("<tr id='battletrackerrow_" + battle.id + "'></tr>");
            jQuery("#battletrackertable tr:last").append("<td class='battletracker_region'>" + battle.region.name + "</td>");
            for (const divid in battle.div) {
                jQuery("#battletrackertable tr:last").append("<td class='battletracker_div'><a href='https://www.erepublik.com/en/military/battlefield/" + battle.id + "/" + divid + "'><img class='battletracker_flag " + divid + "' src='https://static.erepublik.tools/assets/img/erepublik/country/" + battle.div[divid].wall.for + ".gif'/></a></td>");
                if (statsdivs.includes(parseInt(divid))){
                    jQuery("#battletrackerrow_" + battle.id).addClass("battletracker_row_fought")

                    const xobj3 = new XMLHttpRequest();
                    xobj3.overrideMimeType("application/json");
                    xobj3.open('POST', 'https://www.erepublik.com/en/military/battle-console', true);
                    xobj3.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                    xobj3.onreadystatechange = function () {
                        if (xobj3.readyState == 4 && xobj3.status == "200") {
                            add_medal_info(xobj3.responseText, battle.id, divid);
                        }
                    };
                    xobj3.send("action=battleStatistics&type=damage&leftPage=1&rightPage=1&battleZoneId=" + divid + "&_token=" + csrfToken);
                }
            }

            if (battle.start - time < 0) {
                jQuery("#battletrackertable tr:last").append("<td class='battletracker_time'>" + secondsToHms(time - battle.start) + "</td>");
            } else{
                secondsToHmsCountdown(jQuery("#battletrackertable tr:last").append("<td class='battletracker_countdown'></td>"));
                n(".battletracker_countdown:not(.countdownAdded)", function (t) {
                    t.classList.add("countdownAdded");
                    var n = battle.start - time;
                    n > 0 && secondsToHmsCountdown(t, n, e => e.textContent = "00h:00m")
                })
            }

            let button = jQuery("#battletrackertable tr:last").append("<td class='battletracker_remove'>✖</td>");
            jQuery("#battletrackertable tr:last td:last").click(function() {
                jQuery("#battletrackerrow_" + battle.id).remove();
                battletracker_battle_ids = battletracker_battle_ids.filter(function(value) {
                    return value != battle.id;
                });
                localStorage.setItem("battletracker_battle_ids", JSON.stringify(battletracker_battle_ids));
            })
        }
    }

    function add_medal_info(response, battleid, divid){
        const x = JSON.parse(response);
        delete x["rounds"]
        let iswin = false
        for (let side in x) {
            if (x[side].fighterData[1] && x[side].fighterData[1].citizenId == erepublik.citizen.citizenId) {
                iswin = true
            }
        }

        if (iswin) {
            jQuery("."+ divid).addClass("medal_win")
        } else {
            jQuery("."+ divid).addClass("medal_lose")

        }
    }


    function n(e, t) {
        var n = document.querySelectorAll(e);
        return t && n.forEach((e, n) => t(e, n)), n
    }


    function secondsToHms(d) {
        d = Number(d);
        var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);

        h = (h < 10) ? "0" + h : h;
        m = (m < 10) ? "0" + m : m;

        return h + "h:" + m + "m";
    }
    function secondsToHmsCountdown(e, t, n, i) {
        var o = Date.now() + 1e3 * t;
        ! function t() {
            var a = (o - Date.now()) / 1e3;
            if (a < 1) n(e);
            else {
                var r = Math.floor(a / 3600),
                    l = Math.floor(a % 3600 / 60),
                    s = Math.floor(a % 60);
                e.textContent = (i ? r ? r + ":" : "" : "-") + (i ? l > 9 ? l : "0" + l : l) + (i ? "" : "m") + ":" + (s > 9 ? s : "0" + s) + (i ? "" : "s"), setTimeout(t, 1e3)
            }
        }()
    }



    function dragElement(element,x,y) {
        var elmnt = document.getElementById(element);
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (elmnt) {
            // if present, the header is where you move the DIV from:
            document.getElementById(element + 'Header').onpointerdown = dragMouseDown;
        } else {
            // otherwise, move the DIV from anywhere inside the DIV:
            elmnt.onpointerdown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onpointerup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onpointermove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            localStorage.setItem(x, (elmnt.offsetLeft - pos1));
            localStorage.setItem(y, (elmnt.offsetTop - pos2));
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onpointerup = null;
            document.onpointermove = null;
        }
    }

    // Prettyfying stuff
    function addGlobalStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) {
            return;
        }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    addGlobalStyle(`
#battletracker {
  width: 370px;
  background-image: radial-gradient(circle, #8c8c8c, #6b6b6b);;
  border-radius: 10px;
  border: 1px solid #6b6b6b;
  position: absolute;
  top: 50px;
  left: 50px;
  text-align: center;
  padding-bottom: 10px;
  padding-left: 10px;
  padding-right: 10px;
  z-index: 10000000;
  box-shadow: 0 1px 7.3px 5.7px rgb(34 31 31 / 14%);
  overflow: hidden;
}

#battletracker > * {
  color: white;
  text-shadow: 1px 1px #3f3f3f;
}

#battletracker_setting_btn, #battletracker_setting_closebtn {
  position: absolute;
  right: 5px;
  top: 0px;
  font-size: large;
  cursor: pointer;
}

#battletracker_setting_closebtn {
  top: -28px;
}

.battletracker_header {
  padding-top: 3px;
  padding-bottom: 3px;
  font-weight: 800;
}

.battletracker_row_fought {
    background-image: radial-gradient(circle, #ffffff, #00000000);
    font-weight: 700;
}

.battletracker_region {
  padding-left: 3px;
  padding-right: 3px;
  font-size: 12px;
  min-width: 105px;
}

.battletracker_div, .battletracker_time, .battletracker_remove, .battletracker_header {
  padding: 3px;
}

.battletracker_remove:hover {
  color: darkred;
}

.battletracker_time {
  padding-left: 5px;
}

.battletracker_flag {
  display: block;
  height: 16px;
  width: 23px;
  border: 5px #9f9f9f solid;
  border-radius: 8px;
}



.medal_win{
  border: 5px green solid;
}

.medal_lose{
  border: 5px red solid;
}

.modal {
  display: none; /* Hidden by default */
  z-index: 10000001; /* Sit on top */
  background-color: rgb(0,0,0); /* Fallback color */
  background-image: radial-gradient(circle, #8c8c8c, #6b6b6b);
  width: 25%;
  border-radius: 10px;
  border: 1px solid #6b6b6b;
  border-top: 30px solid black;
  position: absolute;
  top: 50%; /* Set the top to 50% */
  left: 50%; /* Set the left to 50% */
  text-align: center;
  transform: translate(-50%, -50%); /* Translate the div to the center */
}

  /* Modal Content */
  .modal-content {
    background-color: #fefefe;
    margin: 15% auto; /* 15% from the top and centered */
    padding: 20px;
    border: 1px solid #888;
    width: 80%; /* Could be more or less, depending on screen size */
  }

  /* The Close Button */
  .close {
    color: #aaa;

    font-size: 28px;
    font-weight: bold;
  }

  .close:hover,
  .close:focus {
    color: grey;
    text-decoration: none;
    cursor: pointer;
  }
  .searchregionbar {
    width: 100%
  }
  .battletracker_setting_title{
    color: white;
    text-shadow: 1px 1px #3f3f3f;
  }
  #battletrackerHeader{
    touch-action: none;
    width:110%;
    border:none;
    cursor:move;
    cursor: -webkit-grab;
    cursor: -moz-grab;
    padding:10px 15px;
    background-color: rgba(233,233,233,.9);
    display:inline-block;
    position: relative;
    left: -10px;
    top: -2px;
    height: 28px;
    background-color: black;
  }

  .pulsate {
  animation: pulsate 1s ease-out;
  animation-iteration-count: infinite;
  transform-origin: center;
}

@keyframes pulsate {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
`);
})();
