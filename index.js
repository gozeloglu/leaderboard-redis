const redis = require("redis");
const express = require("express");
const app = express();

// var client = redis.createClient("redis-15220.c135.eu-central-1-1.ec2.cloud.redislabs.com:15220");
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

app.listen(8000, function(){
    console.log("server is running");
});
