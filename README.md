# Leaderboard - Redis

This is a **Node.js** implementation of the leadboard backend by using **Redis**. Project has basic features of the leaderboard operations like adding new player, storing scores and player information. 

# Redis 

**Redis** is an open-source, in-memory data structure store, used as a database, cache, and message broker. Redis has some nice data structures strings, hashes, lists, sets, sorted sets. To get more information from [here](https://redis.io/).

# Challenge 

The challenge is updating the ranks when one of the player's rank is changed on the game. For example, player A's rank is 100th and its new rank will be 50th. All players' rank should be updated between 50th and 100th. Changing one of the player's rank affects the other player's rank.Especially, updating thousands of millions of players' ranks will be costly for your application if we update one-by-one each of the players. 

# Why I used Redis?

To solve that problem, I used [sorted sets](https://redis.io/topics/data-types-intro#sorted-sets) in Redis. Basically, it stores unique key and its value. It does not allow to store duplicate keys. It is a nice feature, because players have unique IDs and I specified unique IDs as a key in sorted set. Also, it updates the rank with new scores automatically. 

To store player's personal information, I used [hashes](https://redis.io/topics/data-types-intro#hashes). It keeps key-value pairs. Unlike the sorted set, it can keep more than one key-value pairs. 

### Sorted Set Example 

| Rank   |      Key (User ID)      |  Value (Score)|
|----------|:-------------:|------:|
| 0 |  e4cdb120-28fc-4285-a78d-eb48660b7730| 123 |
| 1 |  e4cdb120-28fc-4285-a78d-eb48660b7731| 234 |
| 2 | e4cdb120-28fc-4285-a78d-eb48660b7732 | 456 |
| ..| ...| ...| 

This is a sample sorted set structure of my solution. The keys and values are random. The important thing is that sorted sets sort the data in ascending order. That's why the key which has the minimum score is the first key in set. Also, sorted sets are zero-based. 


### Hash Example

| Key (User ID) | Name | Points | Country | 
| :-------------:|------:| :---------:|  :-------:|
| e4cdb120-28fc-4285-a78d-eb48660b7730| Ahmet | 123 | tr |
| e4cdb120-28fc-4285-a78d-eb48660b7731| John  | 234 | us |
| e4cdb120-28fc-4285-a78d-eb48660b7732 | Maria | 456 | uk |
| ...| ...| ...| ...|

Basically, each player's personal information is stored in hashes. We can reach the hashes by using user ID. 

# Runs

To run this project, you need to install `node` and `npm`. You can check them by typing the following commands.

```bash
$ node --version
$ npm --version
```

If you need to install them, you can visit the following links:

* https://nodejs.org/en/download/
* https://www.npmjs.com/get-npm

My `npm` version is 6.14.5 and `node` version is v12.18.2. 

Firstly, you need to install packages. To install them, run the following comamnd.

```bash
$ npm install
```` 

Before running the project, be sure that you saved the **PORT**, **HOST**, and **PASSWORD** on your environment. 

**Environment Variables:**

* `REDIS_HOST`
* `REDIS_PORT`
* `REDIS_PASSWORD`

To run the project, you can enter the following command.

```bash
$ npm start
```

To run the test, you can enter the following command.

```bash
$ npm run test
```

# Endpoints

There are 5 different endpoints in my project. 

### GET - All Leaderboard

Fetches the all leaderboard table and returns list of JSON objects. 

```
/leaderboard
Example: http://localhost:8000/leaderboard
```

The response will be list of JSON object format as follow:

```
[
    {
        "rank": 1,
        "points": "282",
        "display_name": "Gökhan",
        "country": "tr"
    },
    {
        "rank": 2,
        "points": "247",
        "display_name": "Ahmet",
        "country": "tr"
    },
    {
        "rank": 3,
        "points": "40",
        "display_name": "Cenk",
        "country": "tr"
    },
    {
        "rank": 4,
        "points": "0",
        "display_name": "John",
        "country": "us"
    },
    {
        "rank": 5,
        "points": "0",
        "display_name": "David",
        "country": "es"
    },
    {
        "rank": 6,
        "points": "0",
        "display_name": "Karem",
        "country": "fr"
    }
]
```

### GET - Leaderboard by Country

Fetches the all leaderboard table for given country code.

```
/leaderboard/<country_iso_code>
Example: http://localhost:8000/leaderboard/tr
```

The response will be list of JSON objects that includes the player information from given country. If there is no such a country, it will return a error message.

```
[
    {
        "rank": 1,
        "points": "282",
        "display_name": "Gökhan",
        "country": "tr"
    },
    {
        "rank": 2,
        "points": "247",
        "display_name": "Ahmet",
        "country": "tr"
    },
    {
        "rank": 3,
        "points": "40",
        "display_name": "Cenk",
        "country": "tr"
    }
]
```

### GET - User Profile

Fetches the user profile by using user id.

```
/user/profile/<user_id>
Example: http://localhost:8000/user/profile/e4cdb120-28fc-4285-a78d-eb48660b7730
```

The response will be JSON object that includes the user profile. If there is no such a player, it will return a string that tells there is no this player. 

```
{
    "user_id": "e4cdb120-28fc-4285-a78d-eb48660b7730",
    "display_name": "David",
    "points": "0",
    "rank": 7,
    "country": "gr"
}
```

### POST - Submit Score

Submits the new score for given player. It increments the player's score with new score. 

```
/score/submit
Example: http://localhost:8000/score/submit
Body: 
{
    "score_worth": 1,
    "user_id": "e4cdb120-28fc-4285-a78d-eb48660b7730",
    "timestamp": 1611433105
}
```
The body includes score worth, user id, and timestamp. Timestamp is compared with the current timestamp to check the time is in past or not. If the given timestamp in future, the score will not be updated and returns an error message. If the timestamp is in the now or past, the score will be updated. I am not storing the timestamp in Redis. 

**SUCCESSFUL SUBMIT**
```
Player's new score is: 2
Player's rank is: 4th
```

**UNSUCCESSFUL SUBMIT**
```
Player could not find!
```

The response will be a string that includes a message with new rank and new score. If the user id does not exist in Redis, unsuccessful submit message will be returned.

### POST - User Create

Creates a new user and saves on the Redis.

```
/user/create
Example: http://localhost:8000/user/create
Body:
{
    "user_id": "e4cdb120-28fc-4285-a78d-eb48660b7730",
    "display_name": "David",
    "points": 0,
    "country": "gr"
}
```

The body includes user id, user name, total points, and country. Rank is not added to the body because Redis determines the rank. That's why there is no need to add rank information on the body. 

```
{
    "user_id": "e4cdb120-28fc-4285-a78d-eb48660b7730",
    "display_name": "David",
    "points": 0,
    "rank": 7,
    "country": "gr"
}
```
The response will be the same JSON object. Rank is added to body object in request. The rank will be determined by alphabetical order if the scores is the same. 

### DELETE - Delete User

Deletes the user by user id from Redis DB. 

```
/user/delete/<user_id>
Example: http://localhost:8000/user/delete/e4cdb120-28fc-4285-a78d-eb48660b7730
```

Returns a JSON object that includes the success or error messages by result of the delete operation. 

#### Success message

```
{
    "success_message": "e4cdb120-28fc-4285-a78d-eb48660b7730 is removed"
}
```

#### Error message

```
{
    "error_message": "User could not removed from sorted set."
}
```

or 

```
{
    "error_message": "User could not removed from hash."
}
```
