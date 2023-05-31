const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fs = require("fs")
const readline = require("readline");
const Long = require("long");
const axios = require("axios") ;
const express = require("express");
const path = require("path");
const cors = require("cors");
const csv = require("csv-parser");

const gtfshours = require("./gtfshours.js");

const app = express();
app.use(cors());

app.get('/api/verdun-rezo/gare', async (req, res) => {
    const protoPath =  './resources/poll.proto';
    try {
         axios.get('https://zenbus.net/gtfs/rt/poll.proto?dataset=verdun-rezo',{
            responseType:'stream'
        }).then(async response => {
             if(fs.existsSync(protoPath)){
                 fs.unlink(protoPath, (err) => {
                     if (err) {
                         console.error(err);
                     }
                 });
             }


             const writer = fs.createWriteStream(path.resolve(protoPath));
             response.data.pipe(writer);
             writer.on('finish', async () => {
                 console.log('File downloaded successfully!');

                 const hours = await run();
                 const theo_hours = await gtfshours.processData();
                 //console.log(hours);
                 //console.log(theo_hours);
                // console.log(filterHours(hours,theo_hours));
                 const filteredHours = filterHours(hours,theo_hours)
                 res.json(filteredHours);
             });


         }).catch(error => {
             console.error('Error downloading file:', error);
         });


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }

});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}.`);
});



const stopId = 'zenbus:StopPoint:SP:507070002:LOC' //arret gare multimodale a rechercher (nouvelle variable a créer pour pls écrans)


//fonction de chargement des données avec express

function filterHours(data1, data2){
    const filteredData = [];

    // Create a map to track trip IDs and their corresponding objects
    const tripMap = new Map();

    // Process data from the first table
    for (const item of data1) {
        const { tr } = item;

        // Add or update the item in the map
        tripMap.set(tr, item);
    }

    // Process data from the second table
    for (const item of data2) {
        const { tr } = item;

        // If trip ID already exists in the map, skip
        if (tripMap.has(tr)) {
            continue;
        }

        // Add the item from the second table to the map
        tripMap.set(tr, item);
    }

    // Convert the map values to an array of filtered data
    for (const item of tripMap.values()) {
        filteredData.push(item);
    }

    return filteredData;
}

 function formatGTFSName(zenbusName){
     return new Promise((resolve, reject) => {
         const linedata = fs.createReadStream("./resources/verdun-rezo/routes.txt", {encoding: "utf8"});
        let res = '';
        let resName = '';
         let arrival = '';
         let trip_id = '';
         let rescolor = '';

         const rl = readline.createInterface({
             input: linedata,
             crlfDelay: Infinity
         });

         rl.on('line', (line) => {
             const values = line.split(',');
             if (zenbusName.toString() === values[0]) {
                 resName = values[4];
                 arrival = values[2];
                 trip_id = values[0];
                 rescolor = values[7];
                 res = {name:resName,color:('#'+rescolor)};
             }
         });

         rl.on('close', () => {
             resolve(res);
         });
     });
}
async function getLastStopOfTrip(tripId) {
    return new Promise((resolve, reject) => {
        // Load the stop times data for this trip
        const stopTimes = [];
        fs.createReadStream('./resources/verdun-rezo/stop_times.txt')
            .pipe(csv())
            .on('data', row => {
                //console.log(tripId)
                if (row.trip_id === tripId) {
                    stopTimes.push(row);
                }
            })
            .on('end', async () => {
                // Sort the stop times by their sequence number
                stopTimes.sort((a, b) => a.stop_sequence - b.stop_sequence);

                // Get the last stop ID
                const lastStopId = stopTimes[stopTimes.length - 1].stop_id;

                // Find the stop with this ID in the stops.txt file
                const stopName = await getStopNameById(lastStopId);

                resolve(stopName);
            });

        async function getStopNameById(stopId) {
            return new Promise(resolve => {
                fs.createReadStream('./resources/verdun-rezo/stops.txt')
                    .pipe(csv())
                    .on('data', row => {
                        if (row.stop_id === stopId) {
                            resolve(row.stop_name);
                        }
                    });
            });
        }
    });
}

function findStopName(){

    const stopsData = fs.readFileSync('./resources/verdun-rezo/stops.txt', 'utf8');

    const stops = stopsData.split('\n').slice(1);

    for (let i = 0; i < stops.length; i++) {
        const stop = stops[i].split(',');

        if (stop[0] === stopId) {
            return stop[2];
        }
    }
}

 function formatRemainingMinutes(nextDate){
    const now = new Date();
     // Unix timestamp
     const diffInSeconds = (nextDate.getTime() - now.getTime()) / 1000;
    //return diffInSeconds < 60 ? 'PI' :  Math.trunc(diffInSeconds / 60) + " min";
     return Math.trunc(diffInSeconds / 60);
}

let gtfsPath = './resources/verdun-rezo/';
function searchStopPoint(stopTimeUpdates) {
    //boucler dans le tableau et rechercher l'element de passage au stop
    //retourner le stopTimeUpdate correspondant

    // Loop through each StopTimeUpdate in the array
    for (let i = 0; i < stopTimeUpdates.length; i++) {
        // If the stopId matches the given stopId, return the StopTimeUpdate
        if (stopTimeUpdates[i].stopId === stopId) {
            return stopTimeUpdates[i];
        }
    }

    // If no StopTimeUpdate is found, return null
    return null;


}


async function run(){
    let RTHOURS = [];

    const data = fs.readFileSync("./resources/poll.proto") //attention le fichier doit etre en UTF-8

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(Buffer.from(data));

    for(let i = 0; i < feed.entity.length;i++){

        if (feed.entity[i].tripUpdate) {

            if (feed.entity[i].tripUpdate.stopTimeUpdate) {

                let stopTimeItem = searchStopPoint(feed.entity[i].tripUpdate.stopTimeUpdate);

                if(stopTimeItem != null){

                    let value = stopTimeItem.arrival.time.toString();



                    const longValue = Long.fromString(value); // Create a Long object from a string
                    const timestamp = longValue.toNumber() * 1000; // Convert the Long object to a timestamp in milliseconds
                    const date = new Date(timestamp);
                    const dir = await getLastStopOfTrip(feed.entity[i].tripUpdate.trip.tripId);


                    let LineInfo = await formatGTFSName(feed.entity[i].tripUpdate.trip.routeId);//TODO envoyer la couleur de ligne
                    let RemainMinutes = formatRemainingMinutes(date);
                    let tripID = feed.entity[i].tripUpdate.trip.tripId;
                   // console.log(LineName + ' dans :' + formatRemainingMinutes(date) + " vers : " + findStopName());
                    if(RemainMinutes < 46){
                        RTHOURS.push({
                            tr: tripID,
                            ln: LineInfo.name,
                            rm: RemainMinutes,
                            direction:dir,
                            color:LineInfo.color,
                            rt: true
                        })
                    }

                }


            }
        }
    }
    //tri du tableau avant envoi
    RTHOURS.sort((a, b) => a.rm - b.rm);

    return RTHOURS;
}


//fonction de correspondance des lignes gtfs avec les noms reels (correspondance avec routes.txt)