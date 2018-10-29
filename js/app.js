var map;
var markersArray = {};
var markerLoaded = false;
var currentMarker = null;
var defaultIcon;
var CURRENT_LOCATION =  {lat: 23.5880, lng: 58.3829};
function googleError() {
    $("#query-summary").text("Could not load Google Maps");
    $("#list").hide();
}
//function to initialize the map
function initMap() {
    "use strict";
    map = new google.maps.Map(document.getElementById("map"), {
        center: CURRENT_LOCATION,
        zoom: 12,
        mapTypeControl: false
    });
    //binding view with the map
    ko.applyBindings(new ViewModel());

}

//Knockout's ViewModel
var ViewModel = function () {
    var self = this;
    self.ResturantList = ko.observableArray([]);
    this.filter = ko.observable("");
    var infoWindow = new google.maps.InfoWindow();
    //initialize the view and load data
    function init(){
        getResturants();
        markerLoaded = true;
    }

    google.maps.event.addDomListener(window, "load", init);

    //onclick on infowindow show information
    this.showMarkerInfo = function(name) {
        var trigger = name.name();
        google.maps.event.trigger(markersArray[trigger], "click");
    };

    /* Knockout Computed observable to 
    filters the arrays and markers from the input*/
    this.FilteredList = ko.computed(function() {
        var filter = self.filter().toLowerCase();
        if (markerLoaded) {
            if (!filter) {
                 //set the marker for all resturants
                self.ResturantList().forEach(function (resturant) {
                    resturant.marker.setVisible(true);
                    resturant.marker.setAnimation(null);
                });
                return self.ResturantList();
            } else{
                //show markers and info for filtered resturants
                return ko.utils.arrayFilter(self.ResturantList(),
                                            function(resturant) {
                    var result =stringStartsWith(
                        resturant.name().toLowerCase(), filter);
                    if (result) {
                        if (resturant.marker) {
                            resturant.marker.setVisible(true);
                        }
                    } else {
                        if (resturant.marker) {
                            resturant.marker.setVisible(false);
                        }
                    }
                    return result;
                });
            }
        } else {
            return self.ResturantList();
        }
    });


  // Renders the information when set up
    self.markerListener = function(resturant) {
        resturant.marker.addListener("click", function() {
            if (currentMarker) {
                currentMarker.setAnimation(null);
            }
            currentMarker = resturant.marker;
            resturant.marker.setAnimation(google.maps.Animation.BOUNCE);
            map.setCenter(resturant.marker.getPosition());

            infoWindow.open(map, resturant.marker);
            map.panTo(resturant.marker.position);
            infoWindow.setContent(resturant.formattedInfoWindowData());
        });
    };


    //function to get Resturant in Muscat from FourSquare
    function getResturants() {
        var data;

        $.ajax({
            url: "https://api.foursquare.com/v2/venues/search",
            dataType: "json",
            data: "&client_id=NVR1TQWLYYC0OLXINQ2Q2LO4ZJFP4D1PRJP5M14XY1" +
            "SB2GDM&client_secret=WZUMMKQW0DFKSP3ZTNWNSKEO1V1DA3YGEEFHTKK"+
            "TF1GK4ISG&v=20181024%20&ll=23.5880,58.3829%20&query=resturant",
            async: true,
        }).done(function (response) {
            data = response.response.venues;
            data.forEach(function (resturant) {
                resturants = new Resturants(resturant, map);
                self.ResturantList.push(resturants);
            });
            self.ResturantList().forEach(function (resturant) {
                if (resturant.map_location()) {
                    self.markerListener(resturant);
                }
            });
        }).fail(function (response, status, error) {
            $("#query-summary").text("resturant\'s could not load...");
        });
    }
};

var stringStartsWith = function (string, startsWith) {
    string = string || "";
    if (startsWith.length > string.length) {
        return false;
    }
    return string.substring(0, startsWith.length) === startsWith;
};

//Resturants model
var Resturants = function (resturant, map) {
    var self = this;
    self.name = ko.observable(resturant.name);
    self.location = resturant.location;
    self.lat = self.location.lat;
    self.lng = self.location.lng;
    self.category = ko.observable(resturant.categories[0].name);
    self.map_location = ko.computed(function () {
        if (self.lat === 0 || self.lon === 0) {
            return null;
        } else {
            return new google.maps.LatLng(self.lat, self.lng);
        }
    });
    self.formattedAddress = ko.observable(self.location.formattedAddress);
    self.formattedPhone = ko.observable(resturant.formattedPhone);
    self.marker = (function (resturant) {
        var marker;
        if (resturant.map_location()) {
            marker = new google.maps.Marker({
                position: resturant.map_location(),
                map: map,
                icon: defaultIcon
            });
            //stor markers in the arrays
            markersArray[self.name()] = marker;
        }
        return marker;
    })(self);

    self.id = ko.observable(resturant.id);
    self.url = ko.observable(resturant.url);

    self.formattedInfoWindowData = function () {
        return '<div class="info-window-content">' + '<a href="' + (self.url()===undefined?'/':self.url()) + '">' +
            '<h6>' + (self.name()===undefined?'Resturant name not available':self.name()) + '</a></h6><p><i>' + (self.category()===undefined?'Category name not available':self.category()) + '</i></p>' + 
            '<p>'+(self.formattedAddress()===undefined?'No address available':self.formattedAddress())+ '</p>' +
            '<p>'+ (self.formattedPhone()===undefined?'No Contact Info':self.formattedPhone()) + '</p>';
    }
};

