const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const tokens = require('./tokens.js');

// constants
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// request URLs 
const ARTISTS =                     "https://api.spotify.com/v1/artists?ids="
const AUDIO_FEATURES =              "https://api.spotify.com/v1/audio-features?ids=";
const PLAYLISTS =                   "https://api.spotify.com/v1/me/playlists?limit=50"
const SAVED_TRACKS =                "https://api.spotify.com/v1/me/tracks?limit=50"
const TOKEN =                       "https://accounts.spotify.com/api/token";
const USER =                        "https://api.spotify.com/v1/me";

const callAuthorizationAPI = (body) => {
    let p_xhr = new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", TOKEN, true)
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.setRequestHeader('Authorization', 'Basic ' + btoa(CLIENT_ID + ":" + CLIENT_SECRET));
        xhr.send(body)
        xhr.onload = () => {
            if (xhr.status == 200) {
                console.log("User authentication success!");
                resolve(JSON.parse(xhr.responseText));
            } else {
                console.error("User authentication failed!");
                reject(xhr.responseText);
            }
        }
    })
    return p_xhr;
}

const callAPI = (method, url, body) => {
    let p_callAPI = new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', 'Bearer ' + tokens.ACCESS_TOKEN);
        xhr.send(body);
        xhr.onload = () => {
            if (xhr.status == 200) {
                let data = JSON.parse(xhr.responseText);
                resolve(data);
            }
            else {
                console.error(xhr.status);
                if(xhr.status == 429) {
                    console.error("Request rate limit reach. Please try again later");
                }
                reject(xhr.responseText);
            }
        }
    })
    return p_callAPI;
}

const requestSavedTracks = (offset) => {
    return callAPI('GET', SAVED_TRACKS + offset, null)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.error(err);
        });
}

const requestPlaylistsEndpoints = (offset) => {
    return callAPI('GET', PLAYLISTS + offset, null)
        .then((response) => {
            const arr = new Array();
            for(const item of response.items) {
                arr.push(item.href);
            }
            return arr;
        })
        .catch((err) => {
            console.error(err);
        });
}

const requestPlaylists = (offset) => {
    return callAPI('GET', PLAYLISTS + offset, null)
        .then((response) => {
            const arr = new Array();
            for(const item of response.items) {
                arr.push(item);
            }
            return arr;
        })
        .catch((err) => {
            console.error(err);
        });
}

const requestPlaylistTracks = (endpoint, offset) => {
    return callAPI('GET', endpoint + offset, null)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.error(err);
        });
}

const requestAudioFeatures = (ids) => {
    return callAPI('GET', AUDIO_FEATURES + ids, null)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            console.error(err);
            return(err.responseText)
        });
}

const requestArtists = (ids) => {
    return callAPI('GET', ARTISTS + ids, null)
        .then((response) => {
            return response.artists;
        })
        .catch((err) => {
            return err;
        })
}

const requestUserData = () => {
    return callAPI('GET', USER, null)
        .then((response) => {
            return response;
        })
        .catch((err) => {
            return err;
        })
}

module.exports = {
    callAPI,
    callAuthorizationAPI,
    requestSavedTracks,
    requestPlaylists,
    requestPlaylistTracks,
    requestPlaylistsEndpoints,
    requestAudioFeatures,
    requestArtists,
    requestUserData,
}