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


/**
 * Generator podatkov za novega pacienta, ki bo uporabljal aplikacijo. Pri
 * generiranju podatkov je potrebno najprej kreirati novega pacienta z
 * določenimi osebnimi podatki (ime, priimek in datum rojstva) ter za njega
 * shraniti nekaj podatkov o vitalnih znakih.
 * @param stPacienta zaporedna številka pacienta (1, 2 ali 3)
 * @return ehrId generiranega pacienta
 */
function generirajPodatke(stPacienta) {
    ehrId = "";

    // TODO: Potrebno implementirati

    return ehrId;
}

function showValue(value) {
    document.getElementById("range").innerHTML = value;
}


var lat = 0;
var long = 0;

//GOOGLE MAPS API
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
    console.log(lat + " " + long);
    loadMaps();
}
//KONEC GEOLOKACIJE


// TODO: Tukaj implementirate funkcionalnost, ki jo podpira vaša aplikacija
$(window).ready(function() {
    getLocation();


});