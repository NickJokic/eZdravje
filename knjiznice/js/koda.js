var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";


/**
 * Prijava v sistem z privzetim uporabnikom za predmet OIS in pridobitev
 * enolične ID številke za dostop do funkcionalnosti
 * @return enolični identifikator seje za dostop do funkcionalnosti
 */
function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
            "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}

var ehrId;
//KREIRA PACIENTA
function createEHR(name, surname, dateTime, smoker, alcohol, physicalActivity, stress, callback) {
    sessionId = getSessionId();

    if (!name || !surname || !dateTime) {
        $("#kreiranjeObvestilo").html("<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>Preverite in izpolnite manjkajoče podatke!</div>");
    }
    else {

        $.ajaxSetup({
            headers: {
                "Ehr-Session": sessionId
            }
        });

        $.ajax({
            url: baseUrl + "/ehr",
            type: 'POST',
            success: function(data) {
                ehrId = data.ehrId;
                var partyData = {
                    firstNames: name,
                    lastNames: surname,
                    dateOfBirth: dateTime,
                    partyAdditionalInfo: [{
                        key: "ehrId",
                        value: ehrId
                    }, {
                        key: "kajenje",
                        value: smoker
                    }, {
                        key: "alkohol",
                        value: alcohol
                    }, {
                        key: "vadba",
                        value: physicalActivity
                    }, {
                        key: "stres",
                        value: stress
                    }]
                };
                $.ajax({
                    url: baseUrl + "/demographics/party",
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(partyData),
                    success: function(party) {
                        if (party.action == 'CREATE') {
                            //  ("<div id='idji' class='alert alert-success alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>EHR zapis uspešno kreiran! EHR ID: " + ehrId + "</div>");

                            $("#kreiranjeObvestilo").html("<div class='alert alert-success alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>EHR zapis uspešno kreiran! EHR ID: " + ehrId + "</div>");
                            $("#ehrIdVital").val(ehrId);
                            callback(ehrId);
                        }
                    },
                    error: function(err) {
                        $("#kreiranjeObvestilo").html("<div class='alert alert-success' role='alert'>Napaka: " +
                            JSON.parse(err.responseText).userMessage + "'!</div>");
                    }
                });
            }
        });

    }
}

//DODAJANJE MERITVE PACIENTU
function addVitalSigns(EHRID, dateTime, temp, weight, height, systolic, diastolic, callback) {
    sessionId = getSessionId();



    if (!EHRID || !dateTime || !temp || !weight || !height || !systolic || !diastolic) {
        $("#vitalObvestilo").html("<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>Preverite in izpolnite manjkajoče podatke!</div>");
    }
    else {

        $.ajaxSetup({
            headers: {
                "Ehr-Session": sessionId
            }
        });

        var podatki = {
            // Struktura predloge je na voljo na naslednjem spletnem naslovu:
            // https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
            "ctx/language": "en",
            "ctx/territory": "SI",
            "ctx/time": dateTime,
            "vital_signs/body_temperature/any_event/temperature|magnitude": temp,
            "vital_signs/body_weight/any_event/body_weight": weight,
            "vital_signs/height_length/any_event/body_height_length": height,
            "vital_signs/body_temperature/any_event/temperature|unit": "°C",
            "vital_signs/blood_pressure/any_event/systolic": systolic,
            "vital_signs/blood_pressure/any_event/diastolic": diastolic
        };

        var parametriZahteve = {
            ehrId: EHRID,
            templateId: 'Vital Signs',
            format: 'FLAT',
        };

        $.ajax({
            url: baseUrl + "/composition?" + $.param(parametriZahteve),
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(podatki),
            success: function(res) {
                $("#vitalObvestilo").html("<div class='alert alert-success alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>Uspeh: " + res.meta.href + "</div>");
                callback();
            },
            error: function(err) {
                $("#vitalObvestilo").html("<div class='alert alert-danger' role='alert'>Napaka: " + JSON.parse(err.responseText).userMessage + "!</div>");
            }
        });
    }
}

//PODATKI TRENUTNEGA ANALIZIRANEGA PACIENTA
var trenutniName = "";
var trenutniSurname = "";
var trenutniBirthDate = "";
var trenutniSmoking = 0;
var trenutniAlcohol = 0;
var trenutniWorkout = 0;
var trenutniStress = 0;

var trenutniDateMeritev = "";
var trenutniTemp = 0;
var trenutniWeight = 0;
var trenutniHeight = 0;
var trenutniSystolic = 0;
var trenutniDiastolic = 0;


//ADDITIONAL STVARI (KAJENJE, ALKOHOL, GIBANJE, STRES)
var partyAdditional = [];

function pridobiPodatkeInAnaliziraj() {

    var bereit = 0;

    sessionId = getSessionId();

    var EHRID = $("#ehrIdAnalyze").val();

    if (!EHRID) {
        $("#analyzeObvestilo").html("<div class='alert alert-danger alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>Prosimo vnesite EHR ID pacienta.</div>");
        $("#kUkrepomButton").addClass("disabled");
        $("#kUkrepomButton").attr("href", "#");
        podatkiPrisotni = -1;
    }
    else {

        $.ajax({
            url: baseUrl + "/demographics/ehr/" + EHRID + "/party",
            type: 'GET',
            headers: {
                "Ehr-Session": sessionId
            },

            success: function(data) {

                var party = data.party;

                //nastavi demografske podatke za pacienta
                trenutniName = party.firstNames;
                trenutniSurname = party.lastNames;
                trenutniBirthDate = party.dateOfBirth;
                partyAdditional = party.partyAdditionalInfo;
                //console.log("partyJSON: " + partyAdditional);

                //TEMPERATURA
                $.ajax({
                    url: baseUrl + "/view/" + EHRID + "/" + "body_temperature",
                    type: 'GET',
                    headers: {
                        "Ehr-Session": sessionId
                    },
                    success: function(res) {
                        bereit++;
                        if (res.length > 0) {

                            //nastavi datum meritve
                            trenutniDateMeritev = res[0].time;

                            //nastavi temperaturo
                            trenutniTemp = res[0].temperature;


                        }
                        else {
                            alert("NI PODATKA O TEMP.");
                        }

                        if (bereit === 4) {
                            podatkiPrisotni = 1;
                            analizirajPodatke();
                        }

                    },
                    error: function() {
                        alert(JSON.parse(err.responseText).userMessage);
                        $("#kUkrepomButton").addClass("disabled");

                    }
                });


                //TEŽA
                $.ajax({
                    url: baseUrl + "/view/" + EHRID + "/" + "weight",
                    type: 'GET',
                    headers: {
                        "Ehr-Session": sessionId
                    },
                    success: function(res) {
                        bereit++;
                        if (res.length > 0) {
                            trenutniWeight = res[0].weight;
                        }
                        else {
                            alert("NI PODATKA O TEŽI.");

                        }
                        if (bereit === 4) {
                            podatkiPrisotni = 1;
                            analizirajPodatke();
                        }

                    },
                    error: function() {
                        alert(JSON.parse(err.responseText).userMessage);
                        $("#kUkrepomButton").addClass("disabled");
                    }
                });

                //VIŠINA
                $.ajax({
                    url: baseUrl + "/view/" + EHRID + "/" + "height",
                    type: 'GET',
                    headers: {
                        "Ehr-Session": sessionId
                    },
                    success: function(res) {
                        bereit++;
                        if (res.length > 0) {
                            trenutniHeight = res[0].height;
                        }
                        else {
                            alert("NI PODATKA O VIŠINI.");

                        }
                        if (bereit === 4) {
                            podatkiPrisotni = 1;
                            analizirajPodatke();
                        }

                    },
                    error: function() {
                        alert(JSON.parse(err.responseText).userMessage);
                        $("#kUkrepomButton").addClass("disabled");
                    }
                });

                //TLAK
                $.ajax({
                    url: baseUrl + "/view/" + EHRID + "/" + "blood_pressure",
                    type: 'GET',
                    headers: {
                        "Ehr-Session": sessionId
                    },
                    success: function(res) {
                        bereit++;
                        if (res.length > 0) {
                            trenutniSystolic = res[0].systolic;
                            trenutniDiastolic = res[0].diastolic;
                        }
                        else {
                            alert("NI PODATKA O VIŠINI.");

                        }
                        if (bereit === 4) {
                            podatkiPrisotni = 1;
                            analizirajPodatke();
                        }

                    },
                    error: function() {
                        alert(JSON.parse(err.responseText).userMessage);
                        $("#kUkrepomButton").addClass("disabled");
                    }
                });
            },
            error: function(err) {
                $("#kUkrepomButton").addClass("disabled");
                $("#kUkrepomButton").attr("href", "#");
                alert(JSON.parse(err.responseText).userMessage);
            }
        });

        $("#kUkrepomButton").removeClass("disabled");
        $("#kUkrepomButton").attr("href", "#preventivniTab");

    }


    //console.log("PARTY:\n" + partyAdditional);

}





var podatkiPrisotni = -1;

function analizirajPodatke() {

    //UREDI ŠE PODATKE OD PARTY ADDITIONAL
    //alert("IZPIS: "+partyAdditional[0]["key"]);
    for (var i = 0; i < partyAdditional.length; i++) {
        if (partyAdditional[i]["key"] === "kajenje") {
            trenutniSmoking = partyAdditional[i]["value"];
        }
        else if (partyAdditional[i]["key"] === "alkohol") {
            trenutniAlcohol = partyAdditional[i]["value"];
        }
        else if (partyAdditional[i]["key"] === "vadba") {
            trenutniWorkout = partyAdditional[i]["value"];
        }
        else if (partyAdditional[i]["key"] === "stres") {
            trenutniStress = partyAdditional[i]["value"];
        }
    }

    /**
     * VITAL SIGNS TAB SUMMARY
     *
     */

    if (podatkiPrisotni === 1) {
        var stUkrepov = 0;
        //NASTAVI PODATKE
        $("#imeInfo").html("<b>Ime: </b>" + trenutniName + " " + trenutniSurname);
        $("#bDayInfo").html("<b>Rojstni datum: </b>" + trenutniBirthDate);
        $("#datumMeritveInfo").html("<b>Datum meritve: </b>" + trenutniDateMeritev);
        $("#tezaInfo").html("<b>Telesna teža: </b>" + trenutniWeight + "kg");
        $("#visinaInfo").html("<b>Telesna višina: </b>" + trenutniHeight + "cm");

        //KAJENJE
        switch (trenutniSmoking) {
            case '0':
                $("#kajenjeInfo").html("<b>Kajenje:</b> Nekadilec");
                $("#kajenjeInfo").css("color", "#5cb85c");
                $("#smokingInfoTab").css("display", "none");
                break;
            case '1':
                $("#kajenjeInfo").html("<b>Kajenje:</b> Aktivni");
                $("#kajenjeInfo").css("color", "#d9534f");
                $("#smokingInfoTab").css("display", "block");
                $("#kajenjePrevenitva").html("Kadilci imajo kar 2 do 4-krat večjo možnost za srčni infarkt kot nekadilci. Vzrok je v kemikalijah tobaka, ki poškodujejo krvne celice, krvna tkiva in slabšajo delovanje srca. Opustite kajenje!");
                stUkrepov++;
                break;
            case '2':
                $("#kajenjeInfo").html("<b>Kajenje:</b> Pasivni");
                $("#kajenjeInfo").css("color", "#f0ad4e");
                $("#smokingInfoTab").css("display", "block");
                $("#kajenjePrevenitva").html("Pasivno kajenje poveča verjetnost infarkta. Izogibajte se kadilskim prostorom!");
                stUkrepov++;
                break;
            default:
                break;
                // code
        }

        //ALKOHOL
        switch (trenutniAlcohol) {
            case '0':
                $("#alkoholInfo").html("<b>Alkohol:</b> < 2 enoti dnevno");
                $("#alkoholInfo").css("color", "#5cb85c");
                $("#alcoholInfoTab").css("display", "none");
                break;
            case '1':
                $("#alkoholInfo").html("<b>Alkohol:</b> >= 2 enoti dnevno");
                $("#alkoholInfo").css("color", "#d9534f");
                $("#alcoholInfoTab").css("display", "block");
                $("#alkoholPrevenitva").html("Prevelike količine alkohola dvignejo krvni tlak in povečajo nivo trigliceridov, kar so odlični pogoji za srčni infarkt. Moški omejite količino alkohola na 2 enoti, ženske pa na 1 enoto dnevno.");
                stUkrepov++;
                break;
            default:
                break;
        }

        //TELOVADBA
        switch (trenutniWorkout) {
            case '0':
                $("#vadbaInfo").html("<b>Vadba</b>: < 75min tedensko");
                $("#vadbaInfo").css("color", "#f0ad4e");
                $("#workoutInfoTab").css("display", "block");
                $("#telovadbaPrevenitva").html("Tveganje za infarkt se poveča pri neaktivnih in debelih osebah. Priporočena je zmerna vadba, vsaj 75 minut tedensko, seveda ob zdravih prehranjevalnih navadah.");
                stUkrepov++;
                break;
            case '1':
                $("#vadbaInfo").html("<b>Vadba:</b> > 75min tedensko");
                $("#vadbaInfo").css("color", "#5cb85c");
                $("#workoutInfoTab").css("display", "none");
                break;
            default:
                break;
        }

        //STRES
        $("#stresInfo").html("<b>Količina stresa: </b>" + (trenutniStress * 20) + "%");
        if (trenutniStress < 3) {
            $("#stresInfo").css("color", "#5cb85c");
            $("#stressInfoTab").css("display", "none");
        }
        else {

            $("#stresInfo").css("color", "#d9534f");
            $("#stressInfoTab").css("display", "block");
            $("#stresPrevenitva").html("Prevelika količina stresa negativno vpliva na tlak, holesterol, prehranjevalne navade in količino vadbe. Poskušajte zmanjšati stres npr. z meditacijo, jogo, masažo, telovadbo.");
            stUkrepov++;

        }

        //ANALIZIRAJ BMI
        var trenutniBMI = (trenutniWeight) / ((trenutniHeight / 100) * (trenutniHeight / 100));
        trenutniBMI = trenutniBMI.toFixed(2);
        analizaBMI(trenutniBMI);

        //ANALIZIRAJ TEMPERATURO
        analizaTemp(trenutniTemp);

        //ANALIZIRAJ TLAK
        analizaSist(trenutniSystolic);
        analizaDiast(trenutniDiastolic);
        $('[data-toggle="tooltip"]').tooltip();

        if (stUkrepov === 0) {
            $("#vseJeVredi").html("<b><i class='fa fa-heartbeat' aria-hidden='true'></i> V tem trenutku niste v rizični kategoriji za nastanek srčnega infarkta. Le tako naprej!</b>");
            $("#vseJeVredi").css("color", "#5cb85c");
            $("#ukrepiDisclaimer").css("display", "none");
        }
        else {
            $("#vseJeVredi").html("<b><i class='fa fa-stethoscope'></i> Priporočeno je, da se v nadaljevanju posvetujete z zdravnikom. Za več informacij o infarktu in o najbližjih zdravstvenih ustanovah, si oglejte razdelek 'Ostali viri'.</b>");
            $("#vseJeVredi").css("color", "#f0ad4e");
            $("#ukrepiDisclaimer").css("display", "block");
        }
    }
    else {
        console.log("No EHRID data");
    }

}

//ANALIZA BMI PACIENTA
function analizaBMI(bmi) {
    if (bmi >= 18.5 && bmi < 25.0) {
        $("#obvestiloBMI").html("<span class='obvestilo label label-success fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 18.5 - 24.9'>" + bmi + ", ITM je normalen" + ".</span>");
    }
    else if (bmi >= 16.0 && bmi < 18.5) {
        $("#obvestiloBMI").html("<span class='obvestilo label label-warning fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 18.5 - 24.9'>" + bmi + ", ITM je rahlo do zmerno prenizek" + ".</span>");
    }
    else if (bmi < 16.0) {
        $("#obvestiloBMI").html("<span class='obvestilo label label-danger fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 18.5 - 24.9'>" + bmi + ", ITM je zelo prenizek" + ".</span>");
    }
    else if (bmi >= 25.0 && bmi < 30.0) {
        $("#obvestiloBMI").html("<span class='obvestilo label label-warning fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 18.5 - 24.9'>" + bmi + ", ITM je rahlo do zmerno previsok" + ".</span>");
    }
    else if (bmi > 30.0) {
        $("#obvestiloBMI").html("<span class='obvestilo label label-danger fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 18.5 - 24.9'>" + bmi + ", ITM je zelo previsok" + ".</span>");
    }
}



//ANALIZA TEMPERATURE
function analizaTemp(temp) {
    if (temp < 36.2) {
        $("#obvestiloTemp").html("<span class='obvestilo label label-warning fade-in' data-toggle='tooltip' data-placement='top' title='Normalna vrednost: 36.2 - 37.2'>" + temp + ", temperatura je prenizka" + ".</span>");
    }
    else if (temp >= 36.2 && temp <= 37.2) {
        $("#obvestiloTemp").html("<span class='obvestilo label label-success fade-in' data-toggle='tooltip' data-placement='top' title='Normalna vrednost: 36.2 - 37.2'>" + temp + ", temperatura je normalna" + ".</span>");

    }
    else if (temp > 37.2) {
        $("#obvestiloTemp").html("<span class='obvestilo label label-warning fade-in' data-toggle='tooltip' data-placement='top' title='Normalna vrednost: 36.2 - 37.2'>" + temp + ", temperatura je previsoka" + ".</span>");

    }
}

//SYSTOLIC
function analizaSist(syst) {
    if (syst < 90) {
        $("#obvestiloSystolic").html("<span class='obvestilo label label-warning fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 90 - 120 mm/Hg' >" + syst + ", sist. tlak je prenizek" + ".</span>");
    }
    else if (syst >= 90 && syst <= 120) {
        $("#obvestiloSystolic").html("<span class='obvestilo label label-success fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 90 - 120 mm/Hg' >" + syst + ", sist. tlak je normalen" + ".</span>");

    }
    else if (syst > 120 && syst < 140) {
        $("#obvestiloSystolic").html("<span class='obvestilo label label-warning fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 90 - 120 mm/Hg' >" + syst + ", sist. tlak je rahlo do zmerno previsok" + ".</span>");

    }
    else {
        $("#obvestiloSystolic").html("<span class='obvestilo label label-danger fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 90 - 120 mm/Hg' >" + syst + ", sist. tlak je zelo previsok" + ".</span>");

    }
}

//DIASTOLIC
function analizaDiast(diast) {
    if (diast < 60) {
        $("#obvestiloDiastolic").html("<span class='obvestilo label label-warning fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 60 - 80 mm/Hg' >" + diast + ", diast. tlak je prenizek" + ".</span>");
    }
    else if (diast >= 60 && diast <= 80) {
        $("#obvestiloDiastolic").html("<span class='obvestilo label label-success fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 60 - 80 mm/Hg' >" + diast + ", diast. tlak je normalen" + ".</span>");
    }
    else if (diast > 80 && diast < 90) {
        $("#obvestiloDiastolic").html("<span class='obvestilo label label-warning fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 60 - 80 mm/Hg' >" + diast + ", diast. tlak je rahlo do zmerno previsok" + ".</span>");

    }
    else {
        $("#obvestiloDiastolic").html("<span class='obvestilo label label-danger fade-in' data-toggle='tooltip' data-placement='top' title='Idealna vrednost: 60 - 80 mm/Hg' >" + diast + ", diast. tlak je zelo previsok" + ".</span>");

    }
}


/**
 * Generator podatkov za novega pacienta, ki bo uporabljal aplikacijo. Pri
 * generiranju podatkov je potrebno najprej kreirati novega pacienta z
 * določenimi osebnimi podatki (ime, priimek in datum rojstva) ter za njega
 * shraniti nekaj podatkov o vitalnih znakih.
 * @param stPacienta zaporedna številka pacienta (1, 2 ali 3)
 * @return ehrId generiranega pacienta
 */


/*
VZORČNI PACIENTI
*/
// ime, priimek, datumRojstva, kajenje, alkohol, telovadba, stres
var vzorcniPacienti = [
    ["Janez", "Novak", "1957-03-10T09:08", "1", "1", "0", "4"],
    ["Miha", "Piha", "1999-11-23T13:53", "0", "0", "1", "2"],
    ["Peter", "Klepec", "1956-02-02T20:19", "2", "1", "1", "0"],
    ["", "", "", "", "", "", ""]
];
//ehrId, datumUra, temp, teža, višina, sistol., diastol.
var meritvePacientov = [
    ["b89877c2-893c-4120-940a-6f547f5c39b6", "2015-08-13T07:54", "38.2", "110", "172", "142", "94"],
    ["35521687-c93d-4085-870e-e93e5aa6a331", "2016-07-18T09:34", "37", "72", "176", "118", "77"],
    ["eb5f040d-2aa4-4927-8b60-af7321584940", "2016-09-02T11:04", "37.1", "76.5", "190", "121", "81"],
    ["", "", "", "", "", "", "", ""]
];

function generirajPodatke(stPacienta, success) {
    var index = stPacienta - 1;
    createEHR(vzorcniPacienti[index][0], vzorcniPacienti[index][1], vzorcniPacienti[index][2], vzorcniPacienti[index][3], vzorcniPacienti[index][4], vzorcniPacienti[index][5], vzorcniPacienti[index][6], function(id) {
        success(id);
        addVitalSigns(id, meritvePacientov[index][1], meritvePacientov[index][2], meritvePacientov[index][3], meritvePacientov[index][4], meritvePacientov[index][5], meritvePacientov[index][6], function() {
            //alert("Dodana meritev!");
        });
        return id;
    });
}

//SLIDER VALUE LISTENER
function showValue(value) {
    document.getElementById("range").innerHTML = value;
}

//GOOGLE MAPS API

var lat = 0;
var long = 0;

function loadMaps() {

    SearchPlaceMap = {
        init: function() {
            var self = this;
            var lokacija = new google.maps.LatLng(lat, long);

            self.map = new google.maps.Map(document.getElementById('hospitalMap'), {
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                center: lokacija,
                zoom: 12
            });

            var request = {
                location: lokacija,
                radius: 35000,
                types: ['hospital']
            };

            self.infowindow = new google.maps.InfoWindow();
            var service = new google.maps.places.PlacesService(self.map);
            service.nearbySearch(request, function(results, status) {
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    for (var i = 0; i < results.length; i++) {
                        self.createMarker(results[i]);
                    }
                }
            });
        },

        createMarker: function(place) {
            var self = this;
            var placeLoc = place.geometry.location;
            var marker = new google.maps.Marker({
                map: self.map,
                position: place.geometry.location
            });

            google.maps.event.addListener(marker, 'click', function() {
                self.infowindow.setContent(place.name);
                self.infowindow.open(self.map, this);
            });
        }
    }

    SearchPlaceMap.init();

};
//END OF GOOGLE MAPS API

//GEOLOKACIJA
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    }
    else {
        alert("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {

    lat = position.coords.latitude;
    long = position.coords.longitude;
    //console.log(lat + " " + long);
    loadMaps();
}
//KONEC GEOLOKACIJE

//GRAF
function narisiGraf() {

    var ctx = document.getElementById("myChart");
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: letnicePodatki,
            datasets: [{
                label: "Moški",
                fill: false,
                lineTension: 0.1,
                backgroundColor: "rgba(51,122,183,0.4)",
                borderColor: "rgba(51,122,183,1)",
                borderCapStyle: 'butt',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: "rgba(51,122,183,1)",
                pointBackgroundColor: "#fff",
                pointBorderWidth: 5,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: "rgba(51,122,183,1)",
                pointHoverBorderColor: "rgba(220,220,220,1)",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: moskiPodatki,
            }, {
                label: "Ženske",
                fill: false,
                lineTension: 0.1,
                backgroundColor: "rgba(227,45,139,0.4)",
                borderColor: "rgba(227,45,139,1)",
                borderCapStyle: 'butt',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: "rgba(227,45,139,1)",
                pointBackgroundColor: "#fff",
                pointBorderWidth: 5,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: "rgba(227,45,139,1)",
                pointHoverBorderColor: "rgba(220,220,220,1)",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: zenskiPodatki
            }]
        },
        options: {
            responsive: true,
            title: {
                display: false,
                text: 'Trend uporabe tobačnih izdelkov v Sloveniji [%]'
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}
//KONEC GRAFA
var moskiPodatki = [];
var zenskiPodatki = [];
var letnicePodatki = [];

function preberiJsonGraf(callback) {

    var url = "statistika.json";

    $.getJSON(url, function(json) {
        //alert(json.fact[0].Value); // this will show the info it in firebug console
        //alert(json.fact[0].dims["SEX"]);
        var tmp1, tmp2;

        for (var i = 0; i < json.fact.length; i++) {

            if (json.fact[i].dims["SEX"] === "Female") {
                tmp1 = json.fact[i].Value;
                zenskiPodatki.push(tmp1.substring(0, 4));
                letnicePodatki.push(json.fact[i].dims["YEAR"]);
            }
            else {
                tmp2 = json.fact[i].Value;
                moskiPodatki.push(tmp2.substring(0, 4));
            }
        }

        moskiPodatki = moskiPodatki.reverse();
        zenskiPodatki = zenskiPodatki.reverse();
        letnicePodatki = letnicePodatki.reverse();
        callback();
    });

}


//MAIN ONLOAD
$(document).ready(function() {

    preberiJsonGraf(function() {
        narisiGraf();
    });

    $('[data-toggle="tooltip"]').tooltip();

    getLocation();


    //izberi iz padajočega menija
    $("#kreirajTemplate").change(function() {
        var index = $("#kreirajTemplate").val();

        $("#nameForm").val(vzorcniPacienti[index][0]);
        $("#surnameForm").val(vzorcniPacienti[index][1]);
        $("#birthDateForm").val(vzorcniPacienti[index][2]);
        $("#kadilec").val(vzorcniPacienti[index][3]);
        $("#alkohol").val(vzorcniPacienti[index][4]);
        $("#vadba").val(vzorcniPacienti[index][5]);
        $("#stres").val(vzorcniPacienti[index][6]);
    });

    //izberi iz padajočega menija
    $("#meritveTemplate").change(function() {
        var index = $("#meritveTemplate").val();

        $("#ehrIdVital").val(meritvePacientov[index][0]);
        $("#dateVital").val(meritvePacientov[index][1]);
        $("#tempVital").val(meritvePacientov[index][2]);
        $("#weightVital").val(meritvePacientov[index][3]);
        $("#heightVital").val(meritvePacientov[index][4]);
        $("#systolicVital").val(meritvePacientov[index][5]);
        $("#diastolicVital").val(meritvePacientov[index][6]);
    });

    //izberi iz padajočega menija
    $("#analyzeTemplate").change(function() {
        var index = $("#analyzeTemplate").val();
        $("#ehrIdAnalyze").val(meritvePacientov[index][0]);
    });

    $("#kreirajEHR").click(function() {
        var name = $("#nameForm").val();
        var surname = $("#surnameForm").val();
        var dateTime = $("#birthDateForm").val();
        var smoker = $("#kadilec").val();
        var alcohol = $("#alkohol").val();
        var physicalActivity = $("#vadba").val();
        var stress = $("#stres").val();

        createEHR(name, surname, dateTime, smoker, alcohol, physicalActivity, stress);
    });

    $("#dodajMeritev").click(function() {
        var EHRID = $("#ehrIdVital").val();
        var dateTime = $("#dateVital").val();
        var temp = $("#tempVital").val();
        var weight = $("#weightVital").val();
        var height = $("#heightVital").val();
        var systolic = $("#systolicVital").val();
        var diastolic = $("#diastolicVital").val();

        addVitalSigns(EHRID, dateTime, temp, weight, height, systolic, diastolic);
    });

    $("#analyze").click(function() {
        pridobiPodatkeInAnaliziraj();
    });

    $("#kUkrepomButton").click(function() {
        if (!$("#kUkrepomButton").hasClass("disabled")) {
            $("#0tab").removeClass("active");
            $("#1tab").addClass("active");
        }
    });

    $("#generirajPodatkeButton").click(function() {
        generirajPodatke(1, function(id1) {
            $("#generiranjeObvestilo").html("<div id='idji' class='alert alert-success alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>Uspešno generirani podatki: </div>");
            $("#idji").append("<div>Janez Novak: " + id1 + "</div>");
            meritvePacientov[0][0] = id1;
            generirajPodatke(2, function(id2) {
                $("#idji").append("<div>Miha Piha: " + id2 + "</div>");
                meritvePacientov[1][0] = id2;
                generirajPodatke(3, function(id3) {
                    $("#idji").append("<div>Peter Klepec: " + id3 + "</div>");
                    meritvePacientov[2][0] = id3;
                });
            });
        });
    });
});