const cors = require('cors');
const dotenv = require('dotenv').config();
const express = require('express');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const apiCalls = require("./apicalls");
const functions = require("./functions.js");
const tokens = require("./tokens.js");

const PORT = 3008;

const app = express();

app.use(cors());

app.get('/init', async (req, res) => {
    let code = req.query.code;

    let access_token_request_body = functions.getBody(code);
    apiCalls.callAuthorizationAPI(access_token_request_body).then((response) => {
        tokens.ACCESS_TOKEN = response.access_token;
        tokens.REFRESH_TOKEN = response.refresh_token;

        return;
    }).then(async () => {
        await functions.trackAnalysisToJSON();
        res.send(await functions.retrieveUserData());
    }).catch((err) => {
        console.log(err);
        res.send(err);
    });
})

app.get('/getplaylist', async (req, res) => {
    let playlist_type = req.query.playlist;
    let filename;
    let processed_data;

    switch(playlist_type) {
        case "roadtrip":
            filename = "roadtrip.json";
            processed_data = await functions.retrievePlaylist(filename);

            processed_data = {
                track_blurb: "A soundtrack to fuel your good mood while on the road. Contains your favorite sing-along classics.",
                tracks: JSON.parse(processed_data)
            };
            break;
        case "party":
            filename = "partyhits.json";
            processed_data = await functions.retrievePlaylist(filename);

            processed_data = {
                track_blurb: "From 2000's throwback dance party music to modern hype hip hop songs, the partyhits playlist will have you moving.",
                tracks: JSON.parse(processed_data)
            };
            break;
        case "90shiphop":
            filename = "90shiphop.json";
            processed_data = await functions.retrievePlaylist(filename);

            processed_data = {
                track_blurb: "Your goto boom-bap music. This one will get your head nodding.",
                tracks: JSON.parse(processed_data)
            };
            break;
        case "house":
            filename = "house.json";
            processed_data = await functions.retrievePlaylist(filename);

            processed_data = {
                track_blurb: "An array of your high tempo, fun music. Let's Dance!",
                tracks: JSON.parse(processed_data)
            };
            break;
        case "indie":
            filename = "indie.json";
            processed_data = await functions.retrievePlaylist(filename);

            processed_data = {
                track_blurb: "Your feel-good, crunchy acoustic indie playlist",
                tracks: JSON.parse(processed_data)
            };
            break;
        case "throwback":
            filename = "throwback.json";
            processed_data = await functions.retrievePlaylist(filename);

            processed_data = {
                track_blurb: "Nostalgia in a playlist. This one will have you singinig!",
                tracks: JSON.parse(processed_data)
            }
            break;
        case "chillvibes":
            filename = "chillvibes.json"
            processed_data = await functions.retrievePlaylist(filename);

            processed_data = {
                track_blurb: "Just chill.",
                tracks: JSON.parse(processed_data)
            }
            break;
        case "classical":
            filename = "classical.json"
            processed_data = await functions.retrievePlaylist(filename);

            processed_data = {
                track_blurb: "Serenity in a playlist. Sit back, relax, and enjoy these tunes.",
                tracks: JSON.parse(processed_data)
            }
            break;
        default:
            break;
    }
    res.send(processed_data);
})

app.get('/createPlaylist', async (req, res) => {
    let user_id = req.query.id;
    let current_playlist = req.query.playlistname;

    let body = {
        name: `${current_playlist} playlist - simplify`,
        public: false,
        collaborative: false,
        description: "playlists simplified"
    }

    body = JSON.stringify(body);

    let xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.spotify.com/v1/users/${user_id}/playlists`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + tokens.ACCESS_TOKEN);
    xhr.send(body);
    xhr.onload = () => {
        if (xhr.status == 201) {
            let response = JSON.parse(xhr.responseText);
            res.send(response);
        }
        else if (xhr.status == 401) {
            refreshAccessToken();
        }
        else {
            console.error(xhr.status);
            res.sendStatus(xhr.status)
        }
    }
})

app.get('/updatePlaylist', async (req, res) => {
    let playlist_id = req.query.playlistID;
    let _uris = req.query.uris;

    let xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.spotify.com/v1/playlists/${playlist_id}/tracks?uris=${_uris}`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + tokens.ACCESS_TOKEN);
    xhr.send();
    xhr.onload = () => {
        if (xhr.status == 201) {
            res.sendStatus(xhr.status);
        }
        // else if (xhr.status == 401) {
            // refreshAccessToken();
        // }
        else {
            console.error(xhr.status);
            if(xhr.status == 429) {
                console.error("Request rate limit reach. Please try again later");
            }
            res.sendStatus(xhr.status)
        }
    }
})

app.listen(PORT, () => {
    console.log(`app listening on: ${PORT}`);
})