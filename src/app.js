const express = require('express');
const axios = require('axios');
const cors = require('cors');

//import redis
const redis = require('redis');
const redisClient = redis.createClient();

const DEFAULT_EXPIRATION = 3600

const app = express();
app.use(cors());

app.get("/photos", async (req, res) => {

    const albumId = req.query.albumId;

    await getOrSetCache(`photos?albumId=${albumId}`, async () => {
        const { data } = await axios.get(
            "https://jsonplaceholder.typicode.com/photos", { params: { albumId } }
        )
        return data;
    }, res)

})

app.get("/photos/:id", async (req, res) => {

    await getOrSetCache(`photos:${req.params.id}`, async () => {
        const { data } = await axios.get(
            `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
        )
        return data;
    }, res)

})


// function to set a cache is redis or get a cached value from redis
async function getOrSetCache(key, callback, res) {
    try {
        // connecting to redis
        await redisClient.connect();
        console.log('Redis Client Connected');

        let cacheResult = await redisClient.get(key)
        if (cacheResult != null) {
            await redisClient.disconnect();
            console.log("Data from Redis, Redis Client disconnected")
            return res.json(JSON.parse(cacheResult));
        } else {
            const freshData = await callback();
            await redisClient.SETEX(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));
            await redisClient.disconnect();
            console.log("Data from API, Redis Client disconnected")
            res.json(freshData);
        }
    } catch (err) {
        console.error(`Error occured: ${err}`);
    }

}

app.listen(3000, () => console.log("Listening on port 3000"));