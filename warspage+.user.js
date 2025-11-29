// ==UserScript==
// @name		WarsPage+
// @author		Curlybear
// @description		Improvements to the wars page (05/2020)
// @version		0.30
// @updateURL		https://curlybear.eu/erep/warspage+.user.js
// @downloadURL		https://curlybear.eu/erep/warspage+.user.js
// @match		https://www.erepublik.com/*/military/campaigns*
// @run-at		document-end
// @grant		none
// ==/UserScript==

// 0.2
// - Fixed walls not always being shown the right way around

// 0.3
// - Fixed compatibility with ViolentMonkey (Angular doesn't load in time for some reason ¯\_(ツ)_/¯)

// 0.4
// - Added Epic visual for battles and divisions tooltip
// - Re-enabled tank symbol for compatibility

// 0.5
// - Fix the clickable area of the fight button to be the whole height

// 0.6
// - Adapt to new page version

// 0.7
// - Added division fighter damage (hover over the division walls to display the fighter lists)

// 0.8
// - Fixed some loading issues
// - Various CSS fix/tweak

// 0.9
// - Styled the new contribution information "bullet"
// - Removed the city name, who the hell needs that
// - Moved the war type near the round type
// - Finally seperated the flags ( ͡° ͜ʖ ͡°)
// - Various CSS fix/tweaks

// 0.10
// - Fixed the bullets styling

// 0.11
// - Simplified bullets styling after feedback
// - Added Campaign of the Day styling

// 0.12
// - Added determination

// 0.13
// - Remove "campaign" button. No sense in having two buttons linking to the same page

// 0.14
// - In order to ease the navigation of the page (traditionally hovering from top to bottom), I've reversed the positions of divs and divs damage

// 0.15
// - Deactivate division damage stuff until I can figure it out

// 0.16
// - Fix terrains position

// 0.17
// - Re-enable div damage
// - Division domination points are broken until further notice

// 0.18
// - Fix display

// 0.19
// - Remove terrain hexagons, it's redundant information anyway

// 0.20
// - Don't hide RW info, that's pretty good to have

// 0.21
// - Erep fucked with some default array method, and js took it badly, so now I have to check for something absurd

// 0.22
// - Trying a fix for the script not loading properly for some users

// 0.23
// - Fix merc stats that devs moved to citizen-profile-json-personal from citizen-profile-json

// 0.24
// - Make sorting optional

// 0.25
// - Replace "Waiting" by a countdown timer

// 0.26
// - Fix the timer by *not* using erep provided data

// 0.27
// - BattleTracker Integration

// 0.28
// - BattleTracker Integration: Add Track All feature

// 0.29
// - Add Free divs display (with toggle)

// 0.30
// - Fix Free divs detection

(function () {
    'use strict';

    var retryCount = -1,
        maxRetry = 6,
        timeout = 600,
        timer;

    (function initScript() {
        window.clearTimeout(timer)

        if (!window.angular) {
            retryCount++;
            if (retryCount < maxRetry) {
                timer = setTimeout(initScript, timeout)
            }
            return;
        }

        setTimeout(chromeAngularTools, 600);
    })();

    function chromeAngularTools() {
        var ngAppElem = angular.element(document.querySelector('[ng-app],[data-ng-app]') || document);

        window.$injector = ngAppElem.injector();
        window.inject = $injector.invoke;
        window.$rootScope = ngAppElem.scope();

        window.getService = function getService(serviceName) {
            inject([serviceName, function (s) {
                window[serviceName] = s;
            }]);
        };

        Object.defineProperty(window, '$scope', {
            get: function () {
                var elem = angular.element(__commandLineAPI.$0);
                return elem.isolateScope() || elem.scope();
            },
        });

        function n(e, t) {
            var n = document.querySelectorAll(e);
            return t && n.forEach((e, n) => t(e, n)), n
        }
        function b(e, t, n, i) {
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
        var e = Math.floor(Date.now() / 1000);
        n(".timer:not(.countdownAdded)", function (t) {
            t.classList.add("countdownAdded");
            var n = angular.element(t).scope().campaign.start - e;
            n > 0 && b(t, n, e => e.textContent = "00h:00m")
        })

        angular.element("#ListCampaignsController").scope().$apply($scope => { $scope.$watch("filteredList", function (nV) { if (nV.length) doStuff(); }); });

        const isSorted = localStorage.getItem("sortedwars")
        if(isSorted == 'true') {
            jQuery("#ListCampaignsFilters > div.filters_wrapper > div.top_right").prepend("<div class='sort_btn'>Sort</div><label class='switch'><input id='sortingcheck' type='checkbox' checked><span  class='slider round'></span></label>")
            sortTime();
        } else {
            jQuery("#ListCampaignsFilters > div.filters_wrapper > div.top_right").prepend("<div class='sort_btn'>Sort</div><label class='switch'><input id='sortingcheck' type='checkbox'><span class='slider round'></span></label>")
        }
        jQuery("#sortingcheck").click(function() {
            localStorage.setItem("sortedwars", jQuery("#sortingcheck")[0].checked);
            if(jQuery("#sortingcheck")[0].checked){
                sortTime();
            } else {
                location.reload();
            }
        })

        const showFreeDivs = localStorage.getItem("showFreeDivs")
        if(showFreeDivs == 'true') {
            jQuery("#ListCampaignsFilters > div.filters_wrapper > div.top_right").prepend("<div class='sort_btn'>Show Free Divs</div><label class='switch'><input id='freedivcheck' type='checkbox' checked><span  class='slider round'></span></label>")
        } else {
            jQuery("#ListCampaignsFilters > div.filters_wrapper > div.top_right").prepend("<div class='sort_btn'>Show Free Divs</div><label class='switch'><input id='freedivcheck' type='checkbox'><span class='slider round'></span></label>")
        }
        jQuery("#freedivcheck").click(function() {
            localStorage.setItem("showFreeDivs", jQuery("#freedivcheck")[0].checked);
            location.reload();
        })
    }

    function doStuff() {
        let battletracker_day = JSON.parse(localStorage.getItem("battletracker_day"));
        let battletracker_integration = (battletracker_day == erepublik.settings.eDay)

        if (battletracker_integration) {
            jQuery("#ListCampaignsFilters > div.filters_wrapper > div.top_left").append("<div class='trackall_btn'>Track all</div>")
            jQuery(".trackall_btn").click(function(e){
                if (jQuery(e.target).text() == "Track all"){
                    jQuery('.trackbutton').text("Untrack")
                    jQuery('.trackall_btn').text("Untrack all")
                    let battles_tracked = JSON.parse(localStorage.getItem("battletracker_battle_ids"));
                    for (let b in angular.element("#ListCampaignsController").scope().filteredList){
                        if (b != 'unique'){
                            battles_tracked.push(angular.element("#ListCampaignsController").scope().filteredList[b].id.toString())
                        }
                    }
                    localStorage.setItem("battletracker_battle_ids", JSON.stringify(battles_tracked.unique()));
                } else {
                    jQuery(e.target).text("Track all")
                    jQuery('.trackbutton').text("Track")
                    let battles_tracked = JSON.parse(localStorage.getItem("battletracker_battle_ids"));
                    for (let b in angular.element("#ListCampaignsController").scope().filteredList){
                        if (b != 'unique'){
                            battles_tracked = battles_tracked.filter(function(value) {
                                return value != angular.element("#ListCampaignsController").scope().filteredList[b].id.toString();
                            });
                        }
                    }
                    localStorage.setItem("battletracker_battle_ids", JSON.stringify(battles_tracked.unique()));
                }
            })
        }

        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', 'https://www.erepublik.com/en/main/citizen-profile-json-personal/' + erepublik.citizen.citizenId, true);
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                merc(xobj.responseText);
            }
        };
        xobj.send();

        var xobj2 = new XMLHttpRequest();
        xobj2.overrideMimeType("application/json");
        xobj2.open('GET', 'https://www.erepublik.com/en/military/campaignsJson/', true);
        xobj2.onreadystatechange = function () {
            if (xobj2.readyState == 4 && xobj2.status == "200") {
                divs(xobj2.responseText);
            }
        };
        xobj2.send();

        function merc(response) {
            const x = JSON.parse(response);
            const countries = x.achievements[11].mercenaryProgress.details;
            jQuery(".merc_left, .merc_right").remove();
            for (let countryId in countries) {
                if (countries[countryId].enemies_killed == 25) {
                    jQuery("." + countries[countryId].permalink + ".left_flag").parent().siblings(".points").children(".left_points").children(".country_name").append("<span class=\"merc_left merc_completed\">&nbsp;" + countries[countryId].enemies_killed + "/25 </span>")
                    jQuery("." + countries[countryId].permalink + ".right_flag").parent().siblings(".points").children(".right_points").children(".country_name").prepend("<span class=\"merc_right merc_completed\"> " + countries[countryId].enemies_killed + "/25&nbsp;</span>")
                } else {
                    jQuery("." + countries[countryId].permalink + ".left_flag").parent().siblings(".points").children(".left_points").children(".country_name").append("<span class=\"merc_left merc_none\">&nbsp;" + countries[countryId].enemies_killed + "/25 </span>")
                    jQuery("." + countries[countryId].permalink + ".right_flag").parent().siblings(".points").children(".right_points").children(".country_name").prepend("<span class=\"merc_right merc_none\"> " + countries[countryId].enemies_killed + "/25&nbsp;</span>")
                }
            }
        }

        function divs(response) {
            const x = JSON.parse(response);
            const battles = x.battles;
            for (const battleId in battles) {
                if (!jQuery("#battle-" + battleId.toString()).hasClass("done")) {
                    jQuery("#battle-" + battleId.toString()).addClass("done")

                    // Battle Tracker integration
                    if (battletracker_integration){
                        let battles_tracked = JSON.parse(localStorage.getItem("battletracker_battle_ids"));
                        if (!battles_tracked.includes(battleId.toString())){
                            jQuery("#battle-" + battleId.toString() + " .card_top .war_title").after("<button class='trackbutton'>Track</button>")
                        } else {
                            jQuery("#battle-" + battleId.toString() + " .card_top .war_title").after("<button class='trackbutton'>Untrack</button>")
                        }
                        jQuery("#battle-" + battleId.toString() + " .trackbutton").click(function(e){
                            if (jQuery(e.target).text() == "Track"){
                                jQuery(e.target).text("Untrack")
                                let battles_tracked = JSON.parse(localStorage.getItem("battletracker_battle_ids"));
                                battles_tracked.push(battleId)
                                localStorage.setItem("battletracker_battle_ids", JSON.stringify(battles_tracked.unique()));
                            } else {
                                jQuery(e.target).text("Track")
                                let battles_tracked = JSON.parse(localStorage.getItem("battletracker_battle_ids"));
                                battles_tracked = battles_tracked.filter(function(value) {
                                    return value !== battleId.toString();
                                });
                                localStorage.setItem("battletracker_battle_ids", JSON.stringify(battles_tracked.unique()));
                            }
                        })
                    }

                    const showFreeDivs = localStorage.getItem("showFreeDivs")
                    if (showFreeDivs == 'true'){
                        jQuery("#battle-" + battleId.toString() + " .left_flag").append("<div class='freedivholder_left'>");
                        jQuery("#battle-" + battleId.toString() + " .right_flag").append("<div class='freedivholder_right'>");
                    }

                    const checkfull = (divid) => battles[battleId].div[divid].epic == 1;
                    const checkepic = (divid) => battles[battleId].div[divid].epic == 2;
                    let divids = [];
                    for (var id in battles[battleId].div) {
                        divids.push(id);
                    }
                    divids.sort(function (a, b) {
                        return a == b ? 0 : (a > b ? 1 : -1);
                    });

                    if (divids.some(checkfull)) {
                        jQuery("#battle-" + battleId.toString() + " .card_bottom").addClass("full_scale");
                        jQuery("#battle-" + battleId.toString() + " img[src='//www.erepublik.net/images/icons_svg/military/war_listing/war_versus.svg").attr("src", "https://wiki.erepublik.com/images/2/21/Icon_full_scale_war.png").css("filter", "invert()");
                    }
                    if (divids.some(checkepic)) {
                        jQuery("#battle-" + battleId.toString() + " .card_bottom").addClass("epic");
                        jQuery("#battle-" + battleId.toString() + " img[src='//www.erepublik.net/images/icons_svg/military/war_listing/war_versus.svg").attr("src", "https://www.erepublik.com/images/modules/misc/epic_battles_icon.png").css("filter", "invert()");
                    }
                    if (divids.length == 1) {
                        jQuery("#battle-" + battleId).append("<div id='divs-" + battleId + "' class='div_tooltip air'></div>");
                    } else {
                        jQuery("#battle-" + battleId).append("<div id='divs-" + battleId + "' class='div_tooltip'></div>");
                    }
                    for (const division of divids) {
                        let percent_inv;
                        let percent_def;
                        const epic_css = battles[battleId].div[division].epic ? (battles[battleId].div[division].epic == 2 ? "div_epic" : "div_full") : "";
                        //const points_inv = battles[battleId].div[division].dom_pts.inv;
                        //const points_def = battles[battleId].div[division].dom_pts.def;
                        const points_inv = '?';
                        const points_def = '?';
                        if (battles[battleId].div[division].wall.for == battles[battleId].inv.id) {
                            percent_inv = (parseFloat(battles[battleId].div[division].wall.dom)).toFixed(2);
                            percent_def = (100 - percent_inv).toFixed(2);
                        } else {
                            percent_def = (parseFloat(battles[battleId].div[division].wall.dom)).toFixed(2);
                            percent_inv = (100 - percent_def).toFixed(2);
                        }
                        if (percent_inv == percent_def) {
                            jQuery("#battle-" + battleId + " .div_tooltip").append("<div id='div-row-" + division + "' class='div_row'><span class='div_points_left " + epic_css + "'>" + points_inv + "</span><div class='progress-bar'>\
<span class='progress-bar-fill' style='width:" + percent_inv + "%;'>&nbsp;" + percent_inv + "%</span>\
<span class='progress-bar-empty' style='width:" + percent_def + "%;'>" + percent_def + "%&nbsp;</span>\
</div><span class='div_points_right "+ epic_css + "'>" + points_def + "</span>");
                            if (showFreeDivs == 'true'){
                                // Detect free divs
                                jQuery("#battle-" + battleId + " .freedivholder_left").append("<div class='freediv'>" + battles[battleId].div[division].div + "</div>")
                                jQuery("#battle-" + battleId + " .freedivholder_right").prepend("<div class='freediv'>" + battles[battleId].div[division].div + "</div>")
                            }
                        } else {
                            if (percent_inv > percent_def) {
                                jQuery("#battle-" + battleId + " .div_tooltip").append("<div id='div-row-" + division + "' class='div_row'><span class='div_points_left " + epic_css + "'>" + points_inv + "</span><div class='progress-bar'>\
<span class='progress-bar-fill' style='width:" + percent_inv + "%;'>&nbsp;" + percent_inv + "%</span>\
<span class='progress-bar-empty div_losing' style='width:" + percent_def + "%;'>" + percent_def + "%&nbsp;</span>\
</div><span class='div_points_right "+ epic_css + "'>" + points_def + "</span>");
                                if (showFreeDivs == 'true' && percent_def == 0){
                                    // Detect free divs
                                    jQuery("#battle-" + battleId + " .freedivholder_right").prepend("<div class='freediv'>" + battles[battleId].div[division].div + "</div>")
                                }
                            } else {
                                jQuery("#battle-" + battleId + " .div_tooltip").append("<div id='div-row-" + division + "' class='div_row'><span class='div_points_left " + epic_css + "'>" + points_inv + "</span><div class='progress-bar'>\
<span class='progress-bar-fill div_losing' style='width:" + percent_inv + "%;'>&nbsp;" + percent_inv + "%</span>\
<span class='progress-bar-empty' style='width:" + percent_def + "%;'>" + percent_def + "%&nbsp;</span>\
</div><span class='div_points_right "+ epic_css + "'>" + points_def + "</span>");
                                if (showFreeDivs == 'true' && percent_inv == 0){
                                    // Detect free divs
                                    jQuery("#battle-" + battleId + " .freedivholder_left").append("<div class='freediv'>" + battles[battleId].div[division].div + "</div>")
                                }
                            }
                        }
                        jQuery("#div-row-" + division).on("mouseenter", function () {
                            div_damage(division, battleId, battles[battleId].inv.id, battles[battleId].def.id, true);
                        }).on("mouseleave", function () {
                            div_damage(division, battleId, battles[battleId].inv.id, battles[battleId].def.id, false);
                        })

                    }
                    jQuery("#battle-" + battleId.toString()).on("mouseenter", function () {
                        jQuery("#divs-" + battleId.toString()).show();
                    }).on("mouseleave", function () {
                        jQuery("#divs-" + battleId.toString()).hide();
                    })
                    jQuery("#battle-" + battleId.toString() + " .fight_btn img").wrap("<div class='fight_btn_content'></div>");
                    jQuery("#battle-" + battleId.toString() + " .fight_btn_content").prepend("<span class='round'>R" + battles[battleId].zone_id + "</span>");

                    jQuery("#battle-" + battleId.toString() + " .war_type").appendTo(jQuery("#battle-" + battleId.toString() + " .hexagons"))
                    jQuery("#battle-" + battleId.toString() + " .campaign").remove()

                    if (battles[battleId].det > 1) {
                        if (battles[battleId].is_rw || battles[battleId].is_lib) {
                            jQuery("#battle-" + battleId.toString() + " .left_flag").prepend("<span class='attacker_det tipsyElement' original-title='Soldiers will receive x" + battles[battleId].det + " Influence when fighting.'>x" + battles[battleId].det + "</span>")
                        } else {
                            jQuery("#battle-" + battleId.toString() + " .right_flag").append("<span class='defender_det tipsyElement' original-title='Soldiers will receive x" + battles[battleId].det + " Influence when fighting.'>x" + battles[battleId].det + "</span>")
                        }
                    }
                }
            }
            // CoTD
            let cotdId = x.countries[window.erepublik.citizen.countryLocationId].cotd;
            if (cotdId) {
                jQuery("#battle-" + cotdId.toString()).addClass("cotd");
            }
        }

        function div_damage(div_id, battle_id, inv_id, def_id, show) {
            if (!jQuery("#divs-damage-tooltip-" + div_id).length) {
                jQuery("#battle-" + battle_id).append("<div id='divs-damage-tooltip-" + div_id + "' class='div_damage_tooltip'></div>");
                var xobj3 = new XMLHttpRequest();
                xobj3.overrideMimeType("application/json");
                xobj3.open('POST', 'https://www.erepublik.com/en/military/battle-console', true);
                xobj3.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                xobj3.onreadystatechange = function () {
                    if (xobj3.readyState == 4 && xobj3.status == "200") {
                        add_div_damage(xobj3.responseText, div_id, battle_id, inv_id, def_id);
                    }
                };
                xobj3.send("action=battleStatistics&type=damage&leftPage=1&rightPage=1&battleZoneId=" + div_id + "&_token=" + csrfToken);
            } else {
                if (show) {
                    jQuery("#divs-damage-tooltip-" + div_id).show();
                } else {
                    jQuery("#divs-damage-tooltip-" + div_id).hide();
                }
            }
        }

        function add_div_damage(response, div_id, battle_id, inv_id, def_id) {
            const x = JSON.parse(response);
            jQuery("#divs-damage-tooltip-" + div_id).append("<div class='attacker_damage'></div><div class='defender_damage'></div>");
            for (let fighter_id in x[inv_id].fighterData) {
                if (fighter_id != 'unique') {
                    jQuery("#divs-damage-tooltip-" + div_id + " .attacker_damage").append("<div class='citizen_data'><span class='citizen_name'>" + x[inv_id].fighterData[fighter_id].citizenName + "</span><span class='citizen_damage'>" + x[inv_id].fighterData[fighter_id].value + "</span></div>")
                }
            }
            for (let fighter_id in x[def_id].fighterData) {
                if (fighter_id != 'unique') {
                    jQuery("#divs-damage-tooltip-" + div_id + " .defender_damage").append("<div class='citizen_data'><span class='citizen_damage'>" + x[def_id].fighterData[fighter_id].value + "</span><span class='citizen_name'>" + x[def_id].fighterData[fighter_id].citizenName + "</span></div>")
                }
            }
        }
    };

    function sortTime() {
        jQuery('#ListCampaignsBattles > div').sort(function (a, b) {
            var contentA = jQuery("#" + a.id + " .card_bottom .fight .timer")[0].textContent;
            var contentB = jQuery("#" + b.id + " .card_bottom .fight .timer")[0].textContent;
            return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
        }).appendTo(jQuery('#ListCampaignsBattles'));
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
#ListCampaignsController #ListCampaignsBattles.wars .war_card {
    width: 100%;
    display: flex;
    margin-bottom: 5px;
    flex-wrap: wrap;
    height: auto;
    position: relative;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top {
    display: flex;
    width: 90%;
    height: auto;
    align-items: center;
    justify-content: space-between;
    border-top-right-radius: 0px;
    border-bottom-left-radius: 2px;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card:hover .card_top {
    background-color: #294b6a;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_bottom {
    width: 10%;
    bottom: auto;
    height: auto;
    background: #74b7ff;
    border-radius: 0 5px 5px 0;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_bottom:hover {
    background: #59a8fe;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_bottom .fight {
    width: 100%;
    left: -35px;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_bottom .fight .fight_btn {
    position: relative;
    bottom: 0px;
    width: 200px;
    height: 100%;
    background: none;
    font-weight: bold;
    font-size: 20px;
    color: white;
    filter: invert();
    z-index: 1;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_bottom .fight .fight_btn:hover {
    filter: invert()!important;
    text-shadow: none;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_bottom .fight .fight_btn:active {
    line-height: normal;
    color: white;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_bottom .fight .fight_btn img {
    width: 30px;
    height: 30px;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_bottom .fight .timer {
    color: black;
    font-size: 16px;
    font-weight: normal
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_title {
    width: 350px;
    font-weight: bold;
    font-size:15px;
}

.war_title::before{
    content: ""; width: 12px; height: 28px; background-color: #283b4d; position: absolute; left: 3px;
}

.war_card:hover .war_title::before{
    content: ""; width: 12px; height: 28px; background-color: #294b6a; position: absolute; left: 3px;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_title b {
    display:none;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_flags {
    display: flex;
    width: auto;
    position: relative;
    height: auto;
    margin-left: 1rem;
}

.war_flags {
    left: 255px!important;
    border: none;
}

.war_flags .left_flag,
.war_flags .right_flag {
    width: 50px !important;
    height: 38px !important;
    background-size: contain !important;
}

.left_flag {
    padding-right: 5px!important;
}

.right_flag {
    padding-left: 5px!important;
    background-position: right!important
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_flags .hexagons .wrapper {
    display: none;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_flags .war_type {
    position: relative;
    bottom: 0px;
    width: 30px;
    height: 30px;
    left: -225px!important;
    filter: invert();
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_flags .war_type img {
    width: auto;
    height: auto;
}

.war_type::before {
    top: 0;
    bottom: 0 !important;
    left: 0 !important;
    right: 0;
    background-size: contain !important;
    width: auto !important;
    height: auto !important;
}

.war_type::before {
    display: none;
}

.war_type > img[src="//www.erepublik.net/images/icons_svg/military/war_listing/default_war_type.svg"] {
    display: none;
}

.attacker_points > img[src="//www.erepublik.net/images/icons_svg/military/war_listing/attacker.svg"] {
    display: none;
}

.defender_points > img[src="//www.erepublik.net/images/icons_svg/military/war_listing/defender.svg"] {
    display: none;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .allies {
    height: auto;
    width: 15em;
    background: none;
    margin-left: 2rem;
    padding-right: 0.5rem;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_title span {
    white-space: nowrap;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_flags .black_bar {
    display: none;
}

.points {
    position: relative;
    background: none!important;
    bottom: 8px;
}

.left_points,
.right_points {
    width: 200px!important;
}

.country_name {
    overflow: visible;
}

.attacker_points,
.defender_points {
    background: none!important;
}

#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_title span {
    padding-left: 8px;
}


#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_flags .black_bar .attacker_points,
#ListCampaignsController #ListCampaignsBattles.wars .war_card .card_top .war_flags .black_bar .defender_points {
    width: 120px;
    height: 20px;
}

.merc_left {

    width: 45px;
    text-align: left;
}

.merc_right {
    width: 45px;
    text-align: right;
}

.merc_completed {
    color: #30cb00;
}

.merc_none {
    color: #ffba35
}

.progress-bar {
    display: flex;
    width: 80%;
    background-color: #f74639;
    border-radius: 3px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, .2);
    font-size: 16px;
    margin-top: 1px;
    margin-bottom: 1px;
}

.progress-bar-fill {
    display: block;
    background-color: #3183ff;
    border-radius: 3px 0 0 3px;
    text-align: left;
    transition: width 500ms ease-in-out;
}

.progress-bar-empty {
    width: auto;
    text-align: right;
    direction: rtl;
}

.div_tooltip {
    position: absolute;
    width: 24rem;
    background: #294b6a;
    text-shadow: 0 0 8px #000;
    font-family: LeagueGothicRegular, Impact, sans-serif;
    font-size: 20px;
    color: white;
    border-radius: 5px 5px 0px 0px;
    border: 2px solid #d4d4d4;
    border-bottom: none;
    z-index: 1000;
    align-items: center;
    padding: 0.5rem;
    display: none;
    flex-direction: column;
    top: -242%;
    left: 453px;
}

.air {
    top:-74%!important;
}

.div_row {
    display: flex;
    width: 100%;
}

.div_points_left,
.div_points_right {
    width: 15%;
}

.div_points_left {
    text-align: left;
    padding-left: 5px;
}

.div_points_right {
    text-align: right;
    padding-right: 5px;
}

.full_scale {
    background-color: #ffb734!important;
}

.full_scale:hover {
    background-color: #ffb123!important;
}

.epic {
    background-color: orangered!important;
}

.epic:hover {
    background-color: #e53e00!important;
}

.div_losing {
    background-color: #c9c9c9;
}

.div_full {
    color: #ffb734!important;
}

.div_epic {
    color: orangered!important;
}

.fight_btn_content {
    display: flex;
    margin-bottom: 20px;
}

.round {
    padding-top: 3px;
}

.div_damage_tooltip {
    position: absolute;
    width: 24rem;
    background: #294b6a;
    text-shadow: 0 0 8px #000;
    font-size: 11px;
    color: white;
    border-radius: 0 0 5px 5px;
    border: 2px solid #d4d4d4;
    border-top: none;
    z-index: 105;
    padding: 0.5rem;
    flex-direction: row;
    top: 100%;
    display: flex;
    left: 453px;
}

.attacker_damage {
    text-align: left;
    width: 50%;
    border-right: 1px solid #fff;
}

.defender_damage {
    text-align: right;
    width: 50%;
}

.attacker_damage .citizen_damage {
    text-align: right;
    margin-right: 1px;
    direction: rtl;
}

.defender_damage .citizen_damage {
    text-align: left;
    padding-left: 1px;
}


.citizen_data {
    display: flex;
    width: 100%
}

.citizen_name,
.citizen_damage {
    height: 15px;
}

.citizen_name {
    overflow: hidden;
    text-overflow: ellipsis;
    width: 60%;
}

.citizen_damage {
    width: 40%;
}

.attacker_points span, .defender_points span{
    width:15px;
    margin: 0!important;
}

.bullets {
    width:60px!important;
    height:20px!important;
    padding: 2px;
}

.bullet {
    width:10px!important;
    height:10px!important;
    background: url(/images/icons_svg/military/war_listing/bullet.svg?1591270716853) 0 no-repeat!important;
    background-size: cover!important;
}

.cotd .card_top{
    background: #da8a00!important;
}

.cotd:hover .card_top, .cotd .div_tooltip, .cotd .div_damage_tooltip{
    background: #db9a1d!important;
}

.cotd .card_top .war_title{
    color:black!important;
}

.cotd .war_title::before{
    content: ""; width: 12px; height: 28px; background-color: #da8a00; position: absolute; left: 3px;
}

.cotd:hover .war_title::before{
    content: ""; width: 12px; height: 28px; background-color: #db9a1d; position: absolute; left: 3px;
}

.cotd .div_damage_tooltip{
    color: black;
}

.cotd .country_name{
    color: #000!important;
}

.cotd .bullets {
    filter: invert()!important;
}

.attacker_det {
    display: inline;
    padding: 2px;
    top: 8px;
    position: relative;
    text-shadow: 0 0 8px #000;
    font-family: LeagueGothicRegular,Impact,sans-serif;
    font-size: 18px;
    color: #fff;
    left: -30px;
    z-index: 100;
}

.defender_det {
    display: inline;
    padding: 2px;
    top: 8px;
    position: relative;
    text-shadow: 0 0 8px #000;
    font-family: LeagueGothicRegular,Impact,sans-serif;
    font-size: 18px;
    color: #fff;
    left: 52px;
    z-index: 100;
}
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

.sort_btn {
    position: relative;
    height: 43px;
    text-transform: uppercase;
    border: 0;
    background: 0;
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    -ms-flex-pack: center;
    justify-content: center;
    -webkit-box-align: center;
    -webkit-align-items: center;
    -ms-flex-align: center;
    align-items: center;
    font-family: Arial,Helvetica,sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #030303;
    cursor: pointer;
    -webkit-transition: all .2s ease-in-out;
    transition: all .2s ease-in-out;
    padding-left: 20px;
}
.trackbutton, .trackall_btn{
    position: absolute;
    left: 310px;
    align-items: center;
    background-color: #0A66C2;
    border: 0;
    border-radius: 100px;
    box-sizing: border-box;
    color: #ffffff;
    cursor: pointer;
    display: inline-flex;
    font-family: -apple-system, system-ui, system-ui, "Segoe UI", Roboto, "Helvetica Neue", "Fira Sans", Ubuntu, Oxygen, "Oxygen Sans", Cantarell, "Droid Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Lucida Grande", Helvetica, Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    justify-content: center;
    line-height: 20px;
    max-width: 480px;
    min-height: 24px;
    min-width: 0px;
    overflow: hidden;
    padding: 0px;
    padding-left: 10px;
    padding-right: 10px;
    text-align: center;
    touch-action: manipulation;
    transition: background-color 0.167s cubic-bezier(0.4, 0, 0.2, 1) 0s, box-shadow 0.167s cubic-bezier(0.4, 0, 0.2, 1) 0s, color 0.167s cubic-bezier(0.4, 0, 0.2, 1) 0s;
    user-select: none;
    -webkit-user-select: none;
    vertical-align: middle;
}
.trackbutton:active, .trackall_btn:active {
    background: #09223b;
    color: rgb(255, 255, 255, .7);
}

.trackbutton:hover, .trackbutton:focus, .trackall_btn:hover, .trackall_btn:focus {
    background-color: #16437E;
    color: #ffffff;
}

.trackall_btn {
  left:200px;
}

.freedivholder_left {
    left: -200px;
    position: relative;
    width: 200px;
    margin-right: 0;
    margin-left: auto;
    display: flex;
    justify-content: flex-end;
}

.freedivholder_right {
    left: 50px;
    position: relative;
    width: 200px;
    margin-right: auto;
    display: flex;
    margin-left: 0;
    justify-content: flex-start;
}

.freediv {
    left: 310px;
    align-items: center;
    background-color: #0d8a00;
    border: 0;
    border-radius: 100px;
    box-sizing: border-box;
    color: #ffffff;
    cursor: pointer;
    display: inline-flex;
    font-family: -apple-system, system-ui, system-ui, "Segoe UI", Roboto, "Helvetica Neue", "Fira Sans", Ubuntu, Oxygen, "Oxygen Sans", Cantarell, "Droid Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Lucida Grande", Helvetica, Arial, sans-serif;
    font-size: 10px;
    font-weight: 600;
    justify-content: center;
    max-width: 480px;
    min-height: 12px;
    min-width: 0px;
    overflow: hidden;
    padding: 0px;
    padding-left: 5px;
    padding-right: 5px;
    text-align: center;
    touch-action: manipulation;
    transition: background-color 0.167s cubic-bezier(0.4, 0, 0.2, 1) 0s, box-shadow 0.167s cubic-bezier(0.4, 0, 0.2, 1) 0s, color 0.167s cubic-bezier(0.4, 0, 0.2, 1) 0s;
    user-select: none;
    -webkit-user-select: none;
    vertical-align: middle;
    float:right;
}
`);
})(window);


