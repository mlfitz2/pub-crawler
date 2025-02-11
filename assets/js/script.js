let searchResults = document.getElementById('cities-list'); // holds the results of the city search
let routeList = document.querySelector('.route-list'); // holds the current route list of pubs
let chosenLocation; // stores the current location selected and shown on the map
let map = undefined; // stores the map and allows us to clear if new maps are loaded
let source = turf.featureCollection([]); // the source data for the route
const apiKeyMap = 'pk.eyJ1IjoiYmVuZm9rIiwiYSI6ImNrejBibzE4bDFhbzgyd213YXE3Ynp1MjAifQ.fbuWSwdUyN9SNuaJS_KLnw'; // api key for MapBox
let markerCounter = 0; // counter to ensure that maximum pubs (markers) per route is not exceeded
let savedRoutes = []; // collects routes to save to localStorage
let mapReady = false; // trigger for when the map has fully loaded


// event listener for the search button
    document.getElementById('search-btn').addEventListener('click', function(event){
        event.preventDefault();
        let searchEntry = document.getElementById('city-search-input'); // holds city/neighborhood search entry
        // handle blank search
        if (searchEntry.value === '' || searchEntry.value === 'test') {
            searchEntry.value = ' ';
        } else {
        // run API to return results
        getCities(searchEntry.value);
        }
    });

// function API call to return 5 search results for location entered. Calls openweathermap API. 
const getCities = function(searchEntry) {
    let apiUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${searchEntry}&limit=5&appid=feb08a39587f398b12842fe3303816d6`;
    // console.log(apiUrl);   
    fetch(apiUrl)
        .then(function(response){
            if (!response.ok) {
                alert('Error: ' + response.statusText);
                } 
            return response.json();    
        })
        .then(function (data){
            // console.log(data);
            renderResults(data);
            })
        .catch(function (error) {
            console.log(error);
            alert('Unable to connect to the host server. Please try again');
        });
    };

// render up to 5 locations to the user
const renderResults = function(data){
    // clear the search results
    searchResults.innerHTML = '<li class="city-option my-location" id="current-location-option" onclick="getMyLocation()">Use My Current Location</li>'; 
    // if no results returned display a message
    let str = '';
    if (data.length === 0) {
        let listEl = `<li class="city-option">No Results - Please Search Again</li>`;
        str += listEl;
    // if results are displayed render them to the page and include the lat and long data to pass into the location API call
    } else {
        for (let i=0; i < data.length; i++) {
            if (data[i].state == undefined) {
            data[i].state = '';
            }
            let listEL = `<li class="city-option locations" data-lat="${data[i].lat}" data-long="${data[i].lon}">${data[i].name}, ${data[i].state} (${data[i].country})</li>`;
            str += listEL;
        };
    }
    // add cities as a list
    searchResults.innerHTML += str;
    // activate event listeners on the newly created <li>s
    localeSelect();
};

// accesses newly created city/neighborhood search results, adds event listeners, sets the chosen location and renders the map
const localeSelect = function(){
    document.querySelectorAll('.locations').forEach(function(locale){
        locale.addEventListener('click', function(){
            searchResults.innerHTML = '<li class="city-option my-location" id="current-location-option" onclick="getMyLocation()">Use My Current Location</li>'; // clear search results after click
            chosenLocation = locale;
            renderMap();
            });
    });
};

// load current location. Note that this creates a browser alert to the user to accept use of their current location
const getMyLocation = function (){
        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };
        function success(loc) {
            let elem = document.createElement('li');
            elem.dataset.long = loc.coords.longitude;
            elem.dataset.lat = loc.coords.latitude;
            elem.textContent = 'My Location';
            chosenLocation = elem;
            renderMap();
        };
        function error(err) {
            console.warn(`ERROR(${err.code}): ${err.message}`);
        };
        navigator.geolocation.getCurrentPosition(success, error, options);
};

 // function that renders or resets the map. Called from search selection, clear route button or during the restoration of a saved route to reset variables
 // return closest pubs to location selected. Limit is 25 results or a 5000 meter radius. 
const renderMap = function(){
    //reset variables
    document.getElementById('favorite-results-area').className = 'results-area';
    document.getElementById('route-details').innerHTML = '';
    routeList.innerHTML = '';
    markerCounter = 0;
    mapReady = false;
    const apiKey = 'ec770931d96f478da03865c1cf963f8b';
    const types = 'catering.pub,catering.bar,catering.biergarten';
    const limit = 25;
    const radius = 5000;
    let apiUrl = `https://api.geoapify.com/v2/places?categories=${types}&filter=circle:${chosenLocation.dataset.long},${chosenLocation.dataset.lat},${radius}&bias=proximity:${chosenLocation.dataset.long},${chosenLocation.dataset.lat}&limit=${limit}&apiKey=${apiKey}`;
    // console.log(apiUrl);   
    fetch(apiUrl)
        .then(function(response){
            if (!response.ok) {
                alert('Error: ' + response.statusText);
                } 
            return response.json();    
        })
        .then(function (data){
            // console.log(data);
            loadMap(data);
            })
        .catch(function (error) {
            console.log(error);
            alert('Unable to connect');
        });
    };



// code for map display
const loadMap = function(data){
    //Removes the instructions from layout - if shown
    document.querySelector('#instructions-area').className = 'hidden';
    //Display map container and header
    document.querySelector('#map').className = '';
    document.querySelector('#map-header').className = '';
    document.querySelector('#map-header-text').textContent = chosenLocation.textContent;
    // remove old map if existing
    map = undefined;
    document.getElementById('map').innerHTML = '<button id="toggle-fullscreen" class="btn">Toggle Fullscreen</button><ul id="route-details"></ul>';

    mapboxgl.accessToken = apiKeyMap;
    map = new mapboxgl.Map({
        container: 'map', // container ID
        style: 'mapbox://styles/mapbox/streets-v11', // style URL
        center: [chosenLocation.dataset.long, chosenLocation.dataset.lat], // starting position [lng, lat]
        zoom: 13 // starting zoom
    });
    
    //adds controls to map
    map.addControl(new mapboxgl.NavigationControl());
  
    // adds markers with popups and buttons
    for (let i = 0; i < data.features.length; i++) {
        let lat = data.features[i].geometry.coordinates[1];
        let long = data.features[i].geometry.coordinates[0];
        let placeId = data.features[i].properties.place_id;
        // add data for creating <li> elements as a data attribute for the marker popup
        let listEL = `<li class="brewery-list" data-lat="${lat}" data-long="${long}" data-id="${placeId}"><span class="brewery-name">${data.features[i].properties.name}</span><br/><span class="brewery-address">${data.features[i].properties.street}</span></li>`;
        // create element to be added to DOM for marker pop up upon click
        const div = window.document.createElement('div');
            div.dataset.listEl = listEL;
            div.dataset.id = placeId; 
            div.innerHTML = `<strong>${data.features[i].properties.name}</strong><br/><button class="add-route-btn" onclick="addToRoute()">Add to Route</button>`;
        // create markers, set popups
            let marker = new mapboxgl.Marker({ 'color': '#000000'})
                .setLngLat([long, lat])
                .setPopup(new mapboxgl.Popup({className: 'popup'}).setDOMContent(div))
                .addTo(map);
    };

    map.on('load', function(){
        // creating source that will hold route data once passed
        map.addSource('route', {
            type: 'geojson',
            data: source
          });
          // adding layer to map to render route line
        map.addLayer(
        {
            id: 'routeline',
            type: 'line',
            source: 'route',
            layout: {
            'line-join': 'round',
            'line-cap': 'round'
            },
            paint: {
            'line-color': '#3887be',
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 22, 12]
            }
        },
        'waterway-label'
        );
        // adding directional arrows to route line
        map.addLayer(
            {
              id: 'routearrows',
              type: 'symbol',
              source: 'route',
              layout: {
                'symbol-placement': 'line',
                'text-field': '▶',
                'text-size': ['interpolate', ['linear'], ['zoom'], 12, 24, 22, 60],
                'symbol-spacing': ['interpolate', ['linear'], ['zoom'], 12, 30, 22, 160],
                'text-keep-upright': false
              },
              paint: {
                'text-color': '#3887be',
                'text-halo-color': 'hsl(55, 11%, 96%)',
                'text-halo-width': 3
              }
            },
        );
        for (i=0; i<map._markers.length; i++){
            map._markers[i]._element.dataset.marker = i;
            map._markers[i]._popup._content.children[0].children[2].dataset.marker = i;
        };
        setFullscreen();
        mapReady = true;
    });
};

// function called by clicking button on a marker popup within map to add the pub to the route
let addToRoute = function () {
    if (markerCounter < 10) {
        const button = document.querySelector('.add-route-btn');
        let li = button.parentElement.dataset.listEl;
        routeList.insertAdjacentHTML('beforeend', li);
        // record that we added a marker
        markerCounter++;
        let popupId = button.dataset.marker;
        //render marker colors
        let marker = document.querySelector(`[data-marker='${popupId}']`);
            // set starting location to red
            if (markerCounter == 1) {
                marker.children[0].children[0].children[1].attributes[0].nodeValue = '#F70000';
            };
            // set all others to blue
            if (markerCounter != 1) {
                marker.children[0].children[0].children[1].attributes[0].nodeValue = '#3FB1CE';
            };
    } else {
        alert('A maximum of 10 pubs are permitted per route. It is important to drink responsibly.');
    }
};

// Calls API and adds the route to the map. Starting point is always the first pub, the rest of the route is optimized regarless of selection order
const createRoute = function () {
    if (markerCounter < 2) {
        alert('Two or more pubs are required to make a route')
        return;
    }
    const profile = 'mapbox/walking';
    let coordinates = '';
    for (let i=0; i < routeList.children.length; i++) {
        coordinates += `${routeList.children[i].dataset.long},${routeList.children[i].dataset.lat};`;
    };
    // remove the ; from the end of the coordinates string
    let slicedCoords = coordinates.slice(0, -1);
    let apiUrl = `https://api.mapbox.com/optimized-trips/v1/${profile}/${slicedCoords}?geometries=geojson&overview=full&roundtrip=true&source=any&destination=any&access_token=${apiKeyMap}`;
    fetch(apiUrl)
        .then(function(response){
            if (!response.ok) {
                alert('Error: ' + response.statusText);
                } 
            return response.json();    
        })
        .then(function (data){
            showRouteDetails(data);
            let routeGeoJSON = turf.featureCollection([
                turf.feature(data.trips[0].geometry)
            ]);
            map.getSource('route').setData(routeGeoJSON);
            })
        .catch(function (error) {
            console.log(error);
            alert('Unable to connect');
        });
};

// renders the route details such as duration, total distance Etc
let showRouteDetails = function (data){
    let seconds = data.trips[0].duration / 3600;
    let hours = seconds.toFixed(2);
    let distance = data.trips[0].distance / 1000;
    let kms = distance.toFixed(2);
    let stops = data.trips[0].legs.length + 1;
    document.getElementById('route-details').innerHTML = `<li><strong>Stops:</strong> ${stops}</li><li><strong>Total Walk Time:</strong> ${hours}hrs</li><li><strong>Total Distance:</strong> ${kms}km</li>`;
};

// event listener for save route button
document.getElementById('save-route').addEventListener('click', function(event){
    event.preventDefault();
    let routeName = document.getElementById('save').value;
    // make sure a route name is entered
    if (!routeName) {
        alert('Enter a name for your route');
        return;
    }
    // ready saved route for storage
    let item = {
        name: routeName,
        location: chosenLocation.outerHTML,
        route: routeList.innerHTML,
    };
    savedRoutes.push(item);
    // add to storage
    localStorage.setItem('PubCrawler-SavedRoutes', JSON.stringify(savedRoutes));
    renderSavedList(savedRoutes);
});

//  get saved items from Local Storage
const getSavedRoutes = function(){
    // check that localStorage exists and if not show message to user within Saved Routes section
    if (!localStorage.getItem('PubCrawler-SavedRoutes')) {
        document.getElementById('saved-routes').innerHTML = `<li class="saved-list">No Saved Data</li>`;
        return;
    }
    // retrieve and parse data into savedRoutes array
    let data = localStorage.getItem('PubCrawler-SavedRoutes');
    savedRoutes = JSON.parse(data);
    // render saved routes to the list
    renderSavedList(savedRoutes);
};

// render saved route list from local storage
const renderSavedList = function(routes){
    // located the ul element and clear it
    let ul = document.getElementById('saved-routes');
    ul.innerHTML = '';
    // loop through the saved routes array and create li items that store the needed information to restore the route
    for(let i=0; i < routes.length; i++){
        let li = document.createElement('li');
        li.textContent = routes[i].name;
        li.className = 'saved-list';
        li.dataset.location = routes[i].location;
        li.dataset.route = routes[i].route;
        // render li items to the list
        ul.insertAdjacentElement('beforeend', li);
    }
    // console.log(ul.innerHTML);
    // activate event listeners on the items and run restore route function if clicked
    let savedRoutesListItems = document.querySelectorAll('.saved-list');
    savedRoutesListItems.forEach(function(route){
        route.addEventListener('click', function(){
        restoreRoute(route);
        });
    });
};

// resotres marker colors when recalling a saved route
const markerColorRestore = function () {
    selectedPubIds = [];
    const start = routeList.children[0].dataset.id;
    for (let i = 1; i < routeList.children.length; i++){
        selectedPubIds.push(routeList.children[i].dataset.id);
    };
    // console.log(selectedPubIds);
    for (let i = 0; i < map._markers.length; i++){
        let id = map._markers[i]._popup._content.children[0].dataset.id;
        if (selectedPubIds.includes(id)) {
            map._markers[i]._element.children[0].children[0].children[1].attributes.fill.textContent = '#3FB1CE';
        };
        if (id == start) {
            map._markers[i]._element.children[0].children[0].children[1].attributes.fill.textContent = '#F70000';
        };
    };
};

const restoreRoute = function(route){
    document.getElementById('favorite-results-area').className = 'results-area';
    const parser = new DOMParser();
    let locData = parser.parseFromString(route.dataset.location, 'text/html');
    chosenLocation = locData.children[0].children[1].children[0];
    renderMap();
    const routeData = route.dataset.route;
    routeList.innerHTML = routeData;
    markerCounter = routeList.children.length;
    // the rendering of the saved route requires the map to be ready and loaded. As this can take > 1 second, the setTimeout function ensure that this code waits 2 seconds before initially running, and checks if the map is ready before executing. The function reruns every second after the first try. As this function would just continue to loop, if the fail count reaches 10 it will stop.
    let failCount = 0;
    const recreateRoute = function (){
        if (failCount > 10) {
            alert('Unable to load saved route');
            return; 
        } else if (!mapReady) {
                failCount++
                setTimeout(function(){
                recreateRoute();
            }, 1000);
        } else {
            //Adds saved route name to title at top
            document.querySelector('#map-header-text').textContent = route.textContent
            createRoute();
            markerColorRestore();
        }
    };
    setTimeout(function(){
        recreateRoute();
    }, 2000);
};

// look into adding document.webkitCurrentFullScreenElement
// function to make both map and header go fullscreen
const setFullscreen = function (){
    document.getElementById('toggle-fullscreen').addEventListener('click', function() {
        let elem = document.querySelector('#map-area');
        if(document.fullscreenElement || document.webkitCurrentFullScreenElement) {
           closeFullscreen(); 
        } else {
            openFullscreen(elem);
            document.getElementById('map').style.height = '100%';
        }
    });
    
    document.addEventListener('fullscreenchange', function(){
        if (!document.fullscreenElement && !document.webkitCurrentFullScreenElement) {
            document.getElementById('map').style.height = null;
        };
    });

    function openFullscreen(elem) {
        if (elem.requestFullscreen) {
        elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
        }
    };
  
    function closeFullscreen() {
        if (document.exitFullscreen) {
        document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
        }
    };
};

const modalControl = function(){
    const modal = document.getElementById('instructions-modal');
    const btn = document.getElementById('modal-btn');
    const span = document.querySelector('.modal-close');

    // When the user clicks the button, open the modal 
    btn.addEventListener('click', function() {
        modal.style.display = "block";
    });

    // When the user clicks on <span> (x), close the modal
    span.addEventListener('click', function() {
    modal.style.display = "none";
    });

    // When the user clicks anywhere outside of the modal, close it
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
        modal.style.display = "none";
        };
    });
};

// move the search function box to the top of the page in mobile view
const moveSearchBox = function () {
    const size = window.matchMedia('(max-width: 768px)')
    if (size.matches) {
        document.getElementById("second-column").prepend(document.getElementById('search-area'));
    } else {
        document.getElementById("first-column").prepend(document.getElementById('search-area'));
    };
}
// and upon resizing the viewport
window.addEventListener('resize', moveSearchBox);

// event listener for create route button
document.getElementById('create-route').addEventListener('click', function(event){
    event.preventDefault();
    createRoute();
});

// event listener for clear route button
document.getElementById('clear-route').addEventListener('click', function(event){
    event.preventDefault();
    renderMap();
});

// event listener for clear saved results button. Clears local storage
document.getElementById('clear-saved').addEventListener('click', function(event){
    event.preventDefault();
    localStorage.clear();
    getSavedRoutes();
});

// get search history upon page load and ready modal
window.addEventListener('load', function() {
    getSavedRoutes();
    modalControl();
    moveSearchBox();
});
