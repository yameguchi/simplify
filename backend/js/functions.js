const fs = require('fs');
var request = require('request-promise');

const apiCalls = require('./apicalls');

require('dotenv').config();

const database = "../data/shared_memory.json"

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:8888/yamify-v5/frontend/redirect.html";

const getBody = (code) => {
    let body = "grant_type=authorization_code";
    body += "&code=" + code;
    body += "&redirect_uri=" + encodeURI(REDIRECT_URI);
    body += "&client_id=" + CLIENT_ID;
    body += "&client_secret=" + CLIENT_SECRET;

    if(body != "") {
        return body;
    } else {
        console.error("Access token request body not defined...");
        alert("Access token request body not defined...");
    }
}

const getSavedTracks = async () => {
    let response;
    let tracks = [];
    offset = 0;

    do {
        let offset_querystring = '&offset=' + offset;
        response = await apiCalls.requestSavedTracks(offset_querystring);
        tracks = tracks.concat(response.items)

        offset += 50;
        
    } while(response.total - offset > 0);

    return tracks;
}

const getPlaylistsTracks = async () => {
    let response;
    let tracks = [];
    offset = 0;

    let playlists_endpoints = await apiCalls.requestPlaylistsEndpoints('&offset=0');

    for (let endpoint of playlists_endpoints) {
        endpoint += '/tracks?';
        offset = 0;

        do {
            let offset_querystring = '&offset=' + offset;
            response = await apiCalls.requestPlaylistTracks(endpoint, offset_querystring);
            tracks = tracks.concat(response.items)
    
            offset += 100;
        } while(response.total - offset > 0);
    }

    return tracks;
}

const getAllTracks = async () => {
    const savedTracks = await getSavedTracks();
    const playlistsTracks = await getPlaylistsTracks();

    let allTracks = savedTracks.concat(playlistsTracks);
    const uniqueTracksIds = [];
    const unique = allTracks.filter(element => {
        if (element.track != null) {
            let isDuplicate = uniqueTracksIds.includes(element.track.id);
    
            if (!isDuplicate) {
                uniqueTracksIds.push(element.track.id);
                return true;
            } else {
                return false;
            }
        }
    })

    const _genres = new Array();
    for (_track of unique) {
        const _track_artists = _track.track.artists;
        for (_artist of _track_artists) {
            
        }
    }

    return unique;
}

const getAllTracksAudioFeatures = async () => {
    let audio_features = new Array;
    let artists = new Array();

    let allTracks = await getAllTracks(); 

    let allTracksIds = getAllTracksIds(allTracks);
    let allTracksArtistsIds = getAllTracksArtistsIds(allTracks);

    let audio_feature_iterations = Math.ceil(allTracks.length / 100);
    let genre_iteratrions = Math.ceil(allTracksArtistsIds.length / 50);

    for (let i = 0; i < audio_feature_iterations; i++) {
        let song_ids_for_api_call = allTracksIds.splice(0, 100);
        let song_analysis = await apiCalls.requestAudioFeatures(song_ids_for_api_call.join());
        audio_features = audio_features.concat(song_analysis.audio_features);
    }

    for (let i = 0; i < genre_iteratrions; i++) {
        let artists_ids_for_api_call = allTracksArtistsIds.splice(0, 50);
        
        if (artists_ids_for_api_call.length > 0) {
            let song_artists = await apiCalls.requestArtists(artists_ids_for_api_call.join(','));
            if (song_artists != 400) {
                for (const _artist of song_artists) {
                    if(_artist != null) {
                        if (_artist.id != null && _artist.id != undefined) {
                            artists.push(_artist);
                        }
                    }
                }
            }
        }
    }

    for (const track_audio_features of audio_features) {
        if (track_audio_features != null) {
            let track_obj = allTracks.find( ({ track: { id } }) => id === track_audio_features.id );
            track_obj.audio_feature = track_audio_features;
        }
    }

    for (const _track of allTracks) {
        if (_track.track.artists != null && _track.track.artists != undefined) {
            let _track_genres = new Array();
            for (const _track_artist of _track.track.artists) {
                let artist_obj = artists.find( ({ id }) => id === _track_artist.id );

                if (artist_obj != null) {
                    artist_obj.genres.forEach( (_genre) => {
                        if (!_track_genres.includes(_genre) && _genre != null && _genre != undefined) {
                            _track_genres.push(_genre);
                        }
                    })
                } else {
                    _track_genres = [];
                }
            }
            _track.genres = _track_genres;
        }
    }

    return allTracks;
}

const getAllTracksIds = (tracks) => {
    let ids = new Array;
    for (const _track of tracks) {
        if(_track.track != null) {
            ids.push(_track.track.id);
        }
    }
    return ids;
} 

const getAllTracksArtistsIds = (tracks) => {
    let ids = new Array;
    for (const _track of tracks) {
        if((_artists = _track.track.artists) != null) {
            for(_artist of _artists) {
                if(!ids.includes(_artist.id))
                ids.push(_artist.id);
            }
        }
    }
    return ids;
} 

const trackAnalysisToJSON = async () => {
    let data = new Array;
    let dataset = new Array;

    const allTracksAnalysis = await getAllTracksAudioFeatures();

    for (const track_data of allTracksAnalysis) {
        if (track_data.track != null && track_data.track != undefined && track_data.audio_feature != null && track_data.audio_feature != undefined) {
            let id =                track_data.track.id;
            let name =              track_data.track.name;
            if (name.indexOf('(') != -1) name = name.slice(0, name.indexOf('(')-1);
            name = `"${name}"`
            let popularity =        track_data.track.popularity;
            let duration_ms =       track_data.track.duration_ms;
            let explicit =          track_data.track.explicit ? 0 : 1;
            let artists = [];
            let id_artists = [];
            for (const artist of track_data.track.artists) {
                artists.push(artist.name);
                id_artists.push(artist.id);
            }
            artists = `"${artists}"`;
            id_artists = `"${id_artists}"`;
            let genres =            track_data.genres;
            let release_date =      track_data.track.album.release_date;
            let danceability =      track_data.audio_feature.danceability;
            let energy =            track_data.audio_feature.energy;
            let key =               track_data.audio_feature.key;
            let loudness =          track_data.audio_feature.loudness;
            let mode =              track_data.audio_feature.mode;
            let speechiness =       track_data.audio_feature.speechiness;
            let acousticness =      track_data.audio_feature.acousticness;
            let instrumentalness =  track_data.audio_feature.instrumentalness;
            let liveness =          track_data.audio_feature.liveness;
            let valence =           track_data.audio_feature.valence;
            let tempo =             track_data.audio_feature.tempo;
            let time_signature =    track_data.audio_feature.time_signature;
            let date_added =        track_data.added_at;
            let preview_url =       track_data.track.preview_url;
            let track_url =         track_data.track.external_urls.spotify;
            let track_uri =         track_data.track.uri;

            let album_cover;

            if (track_data.track.album.images.length > 0) {
                album_cover =       track_data.track.album.images[0].url;
            } else {
                album_cover =       "";
            }
    
            data = [date_added, id, name, popularity, duration_ms, explicit, artists, genres, id_artists, release_date, danceability, energy, key, loudness, mode, speechiness, acousticness, instrumentalness, liveness, valence, tempo, time_signature, album_cover, preview_url, track_url, track_uri];
            
            if (data.length > 0) dataset.push(data);
        }
        
    }
    
    allTrackAnalysisToJson = JSON.stringify(dataset);
    fs.writeFileSync(database, allTrackAnalysisToJson);

    return "successfully uploaded to shared memory!";
}

const retrievePlaylist = async (playlist_type) => {
    const query_string = playlist_type;

    var options = {
        method: 'GET',

        uri: `http://127.0.0.1:5001/getplaylist?playlist=${query_string}`,
        body: null,
    };
  
    var sendrequest = await request(options);

    return sendrequest;
}

let retrieveUserData = async () => {
    let user = await apiCalls.requestUserData();
    return user;
}

module.exports = { //handleRedirect,
    //handleAuthorizationResponse,
    getBody,
    getAllTracks,
    getAllTracksAudioFeatures,
    trackAnalysisToJSON,
    retrievePlaylist,
    retrieveUserData
}