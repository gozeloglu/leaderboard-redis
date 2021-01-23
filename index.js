const redis = require("redis");
const express = require("express");
const app = express();
app.use(express.json());

const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
});
client.auth(process.env.REDIS_PASSWORD);

client.on('error', err => {
    console.log('Error ' + err);
});

client.on('connect', function() {
    console.log("Redis is connected!");
});

client.zadd("user1", 123, function(err, res) {
    console.log(res);
});

app.get('/leaderboard', (req, res) => {
    var obj = {
        "name": "Gökhan",
        "Country": "Tr"
    }
    //res.send('Leaderboard')
    res.send(obj)
    return "Game Leaderboard"
});

app.route('/leaderboard/:country_iso_code').get((req, res) => {
    console.log(req.params.country_iso_code)
    res.send(req.params.country_iso_code)
    return "Country"
});

/**
 * @description Fetches the player by using GUID.
 * Player's rank is retrieved from sorted set
 * Player's personal information(display_name, point,
 * country) is is retrieved from hash map
 * Then, these all information is combined and returned
 * @returns The function returns JSON object that includes 
 * player information with its rank.
 */
app.get('/user/profile/:guid', (req, res, next) => {
    /// TODO rank should be reversed

    client.zrank("leaderboard_set", req.params.guid, function(err, rank) {
        if (err) {
            next(err);
        } else {
            client.hmget(req.params.guid, ["name", "points", "country"], function(err, response) {
                if (err) {
                    next(err)
                } else {

                    // If the guid is not exist in database
                    // Checks the player name that is null or not
                    if (response[0] === null) {
                        res.send("There is no such a player");
                    } else {
                        res.setHeader('Content-Type', 'application/json');
                        res.json({
                            user_id: req.params.guid,
                            display_name: response[0],
                            points: response[1],
                            rank: rank,
                            country: response[2]
                        });
                    }
                }
            })
        }
    });
});

app.post('/score/submit', (req, res) => {
    // TODO JSON object should be taken
});

/**
 * @description Creates a new player and saves it on the Redis
 * Player ID and its score are saved on sorted set
 * Player's personal information(display_name, point,
 * country) is saved on hash map
 * @returns The function returns JSON object that includes 
 * player information.
 * 
 * Sample JSON Object:
 * 
 * {
 *   "user_id": <string - guid>,
 *   "display_name": <string - player name>,
 *   "points": <string - point>,
 *   "rank": <integer - player's rank>,
 *   "country": <string - player's country iso code>
 * }
 */
app.post('/user/create', (req, res, next) => {
    
    client.hmset(
        req.body.user_id, 
        ["name", req.body.display_name, "points", req.body.points, "country", req.body.country], 
        function(err, response) {
        if (err) {
            next(err)
        } else {
            client.zadd(["leaderboard_set", req.body.points, req.body.user_id], function(err, response) {
                if (err) {
                    next(err);
                } else {
                    res.setHeader('Content-Type', 'application/json');
                    res.json({
                         user_id: req.body.user_id,
                         display_name: req.body.display_name,
                         points: req.body.points,
                         rank: req.body.rank,
                         country: req.body.country
                     });
                }
            })
        }
        
    })
});


app.listen(8000, function(){
    console.log("server is running");
});
