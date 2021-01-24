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

/**
 * @description Fetches the leaderboard
 * Gets leaderboard from Redis in reverse order
 * Fetches the player information by using user_id
 * 
 * @returns List of JSON object that contains user information
 */
app.get('/leaderboard', (req, res, next) => {

    client.zrevrange("leaderboard_set", 0, -1, "withscores", function(err, leaderboard) {
        if (err) {
            next(err);
            return err;
        } else {
            var leaderboardArr = new Array(leaderboard.length/2);           
            var fetchedUserCount = 0;   // Counts the fetched user count

            for (let i = 0; i < leaderboard.length; i += 2) {
                client.hmget(leaderboard[i], ["name", "country"], function(err, playerData) {
                    const player = {
                        rank: (i/2) + 1,
                        points: leaderboard[i+1],
                        display_name: playerData[0],
                        country: playerData[1]
                    }
                    leaderboardArr[i/2] = player;
                    fetchedUserCount++;

                    if (fetchedUserCount == leaderboard.length/2) {
                        res.send(leaderboardArr);
                    }
                })
            }
        }
    })
});

/**
 * @description Fetches the data according to the country code
 * @param  {string} country_iso_code - Indicates the country
 * @returns List of JSON objects that includes user informaation
 */
app.route('/leaderboard/:country_iso_code').get((req, res) => {
    
    client.zrevrange("leaderboard_set", 0, -1, "withscores", function(err, leaderboard) {
        if (err) {
            next(err);
            return err;
        } else {
            var leaderboardArr = new Array();           
            var fetchedUserCount = 0;   // Counts the fetched user count
            var j = 0;
            var isSent = false;

            for (let i = 0; i < leaderboard.length; i += 2) {
                client.hmget(leaderboard[i], ["name", "country"], function(err, playerData) {
                    fetchedUserCount++;
                    
                    if (playerData[1] === req.params.country_iso_code)  {
                        const player = {
                            rank: (i/2) + 1,
                            points: leaderboard[i+1],
                            display_name: playerData[0],
                            country: playerData[1]
                        }
                        leaderboardArr[j] = player;
                        j++;

                        if (fetchedUserCount == leaderboard.length/2) {
                            isSent = true;
                            if (leaderboardArr.length == 0) {
                                res.send("There is no player from " + req.params.country_iso_code)
                            } else {
                                res.send(leaderboardArr);
                            }
                        }
                    }

                    if (fetchedUserCount == leaderboard.length/2 && !isSent) {
                        isSent = true;
                        if (leaderboardArr.length == 0) {
                            res.send("There is no player from " + req.params.country_iso_code)
                        } else {
                            res.send(leaderboardArr);
                        }
                    }
                })
            }
        }
    })

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

    client.zrevrank("leaderboard_set", req.params.guid, function(err, rank) {
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
                            rank: rank+1,
                            country: response[2]
                        });
                    }
                }
            })
        }
    });
});

/**
 * @description Submits the player score by adding new score to old one
 * Checks the timestamp whether is valid or not wrt to current
 * Checks the player is exist or not
 * 
 * @returns Player's new score and player's new rank
 * 
 * Sample JSON Object:
 * {
 *  "score_worth": <last score>,
 *  "user_id": <valid user id>,
 *  "timestamp": <submit timestamp>
 * }
 */
app.post('/score/submit', (req, res, next) => {

    if (timestampIsFuture(req.body.timestamp)) {
        res.send("You cannot submit score for invalid time.")
    } else {
        client.zscore("leaderboard_set", req.body.user_id, function(err, score) {
            if (err) {
                res.send("Player could not find!")
                next(err);
            } else {
                var player_score = parseInt(score, 10)
                player_score += req.body.score_worth
                client.zadd(["leaderboard_set", player_score, req.body.user_id], function(err, response) {
                    if (err) {
                        res.send("Player could not find!")
                        next(err)
                    } else {
    
                        // Fetch updated rank
                        client.zrevrank("leaderboard_set", req.body.user_id, function(err, rank) {
                            if (err) {
                                next(err)
                            } else {
                                res.send("Player's new score is: " + player_score + "\n" + 
                                        "Player's rank is: " + modifyPlayerRank(rank+1))
                            }
                        })
                    }
                })
            }
        });
    }
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
                    client.zrevrank("leaderboard_set", req.body.user_id, function(err, playerRank) {
                        res.setHeader('Content-Type', 'application/json');
                        res.json({
                            user_id: req.body.user_id,
                            display_name: req.body.display_name,
                            points: req.body.points,
                            rank: playerRank+1,
                            country: req.body.country
                     });
                    })
                    
                }
            })
        }
        
    })
});


/**
 * @description Modifies the rank string with suffix
 * Puts the number sufficies at the end of the number
 * @param {number} rank - Player's rank
 * @returns String rank number
 */
function modifyPlayerRank(rank) {
    
    if (rank % 10 === 1) {
        return rank.toString() + "st"
    } else if (rank % 10 === 2) {
        return rank.toString() + "nd"
    } else if (rank % 10 === 3) {
        return rank.toString() + "rd"
    } else {
        return rank.toString() + "th"
    }
}

/**
 * @description Compares the current timestamp and player submit timestamp
 * @param {number} timestamp - Score submit timestamp
 * @returns true if submit time is in the future
 *          false if submit time is in the now or past
 */
function timestampIsFuture(timestamp) {
    var currentDate = new Date();
    var currentTimestamp = currentDate.getTime();
    currentTimestamp = currentTimestamp.toString().substr(0, 10);

    return timestamp <= currentTimestamp ? false : true
}

app.listen(8000, function(){
    console.log("server is running");
});

module.exports = { timestampIsFuture, modifyPlayerRank }