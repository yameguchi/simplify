const CLIENT_ID = "de9d5d42a9f245a7908c59a0eb748396";
const REDIRECT_URI = "http://localhost:8888/yamify-v5/frontend/redirect.html";
const AUTHORIZE = "https://accounts.spotify.com/authorize";

// sends request to initialize app
// authorizes user and retrieves access token
const init = () => {
    display_loader();
    const queryString = window.location.search;

    if (sessionStorage.getItem("logged_in") == "true") {
        undisplay_loader();
        return;
    }

    const http = new XMLHttpRequest();
    const url=`http://localhost:3008/init${queryString}`;
    http.open("GET", url);
    http.send();

    http.onload = () => {
        undisplay_loader();
        let response = JSON.parse(http.responseText);
        sessionStorage.setItem("logged_in", true);
        sessionStorage.setItem("user_id", response.id);
        sessionStorage.setItem("user_href", response.href);
    }
}

// sends request to get output playlist derived from app.py script
const getPlaylist = (playlist_type) => {
    sessionStorage.setItem("current_playlist", playlist_type);

    const http = new XMLHttpRequest();
    const url=`http://localhost:3008/getplaylist?playlist=${playlist_type}`;
    http.open("GET", url);
    http.send();

    http.onload = () => {

        clearData();

        let response = JSON.parse(http.responseText);

        let blurb = document.createElement('p');
        blurb.classList.add("blurb")
        blurb.innerHTML = response.track_blurb;

        let playlist_blurb = document.querySelector(".playlist-blurb");
        playlist_blurb.appendChild(blurb);

        for (const track of response.tracks) {
            console.log(track);
            t_row = document.createElement('tr');
            t_data_album = document.createElement('td');
            t_data_album_cover = document.createElement('img');
            t_data_artists = document.createElement('td');
            t_data_name = document.createElement('td');
            t_data_genres = document.createElement('td');
            t_data_sim = document.createElement('td');
            t_data_valence = document.createElement('td');
            t_data_uri = document.createElement('td');
            t_data_dance = document.createElement('td');
            
            let album_src = track.album_cover;
            let artists = track.artists;
            let name = track.name;
            let genres = (track.genres);
            let sim = track.sim;
            let valence = track.valence_y;
            let id = track.track_uri;
            let dance = track.danceability_y;

            sim = Math.round(sim * 100);
            
            t_data_album_cover.src = album_src;
            t_data_album_cover.alt = `Album of track: ${name}`;
            t_data_album_cover.style.width = "100px";
            t_data_album_cover.style.height = "100px";
            t_data_artists.innerHTML = artists;
            t_data_name.innerHTML = name;
            t_data_genres.innerHTML = genres;
            t_data_sim.innerHTML = `${sim}%`;
            t_data_valence.innerHTML = valence;
            t_data_uri.innerHTML = id;
            t_data_dance.innerHTML = dance;
            
            t_data_album.appendChild(t_data_album_cover);
            t_row.appendChild(t_data_album);
            t_row.appendChild(t_data_name);
            t_row.appendChild(t_data_artists);
            t_row.appendChild(t_data_valence);
            t_row.appendChild(t_data_uri);
            t_row.appendChild(t_data_dance);
            t_row.appendChild(t_data_sim);

            t_data_uri.classList.add('track_uri');
            t_data_uri.style.display = "none";

            t_row.classList.add('playlist_data');
            
            document.querySelector(".output-table").appendChild(t_row);    
        }
        addPlaylistBtn();
    }
}

let display_loader = () => {
    document.querySelector('.output-table-wrapper').style.display = "none";

    let output_wrapper = document.querySelector(".output-wrapper");
    
    let p0 = document.createElement('p');
    let p1 = document.createElement('p');

    let div = document.createElement('div');
    let div0 = document.createElement('div');
    let div1 = document.createElement('div');
    let div2 = document.createElement('div');
    let div3 = document.createElement('div');
    let div4 = document.createElement('div');

    div0.classList.add('lds-ellipsis');
    div0.appendChild(div1);
    div0.appendChild(div2);
    div0.appendChild(div3);
    div0.appendChild(div4);

    p0.style.color = "rgba(255,255,255)";
    p0.classList.add("init_msg");
    p0.innerHTML = "Initializing... This may take up to 1 minute"

    p1.style.color = "rgba(255,255,255)";
    p1.classList.add("init_msg");
    p1.innerHTML = "Once loaded, click on a playlist you want to generate with songs in YOUR library!"

    div.appendChild(div0);
    div.appendChild(p0);
    div.appendChild(p1);

    div.style.textAlign = "center";

    div.classList.add('loader-wrapper');

    output_wrapper.insertBefore(div, output_wrapper.firstChild);
}

let undisplay_loader = () => {
    document.querySelector('.loader-wrapper').remove();
    document.querySelector('.output-table-wrapper').style.display = "block";
}

let clearData = () => {
    for (const row of document.querySelectorAll('.playlist_data')) {
        row.remove();
    }

    if (document.querySelector('.blurb') != null) {
        document.querySelector('.blurb').remove();
    }
    
    if (document.querySelector('.add-playlist-btn') != null) {
        document.querySelector('.add-playlist-btn').remove();
    }
}

let addPlaylistBtn = () => {
    let wrapper = document.querySelector('.add-playlist-btn-wrapper');

    let addPlaylistBtn = document.createElement('input');

    addPlaylistBtn.type = "button";
    addPlaylistBtn.classList.add('add-playlist-btn');
    addPlaylistBtn.classList.add('playlist-btn');
    addPlaylistBtn.value = "Add to Playlist";
    addPlaylistBtn.onclick = function () {createPlaylist()};

    wrapper.appendChild(addPlaylistBtn);
}

// sends request to create a playlist on user's spotify profile
let createPlaylist = () => {
    let user_id = sessionStorage.getItem('user_id');
    let current_playlist = sessionStorage.getItem('current_playlist')

    const http = new XMLHttpRequest();
    const url=`http://localhost:3008/createPlaylist?id=${user_id}&playlistname=${current_playlist}`;
    http.open("GET", url);
    http.send();

    http.onload = async () => {
        let response = JSON.parse(http.responseText);
        let playlist_id = response.id;

        updatePlaylist(playlist_id);
    }
}

// sends request to update content in user created playlist on user's
// spotify profile
let updatePlaylist = (playlist_id) => {
    let track_uris = new Array();
    let nodes = document.querySelectorAll('.track_uri');
    for (const track of nodes) {
        track_uris.push(track.innerHTML);
    }

    const http = new XMLHttpRequest();
    const url=`http://localhost:3008/updatePlaylist?playlistID=${playlist_id}&uris=${track_uris.join(',')}`;
    http.open("GET", url);
    http.send();
}

const requestAuthorization = () => {
    let url = AUTHORIZE;
    url += "?client_id=" + CLIENT_ID;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(REDIRECT_URI);
    url += "&show_dialog=true";
    url += "&scope=user-read-private user-library-read playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private";
    window.location.href = url;
}