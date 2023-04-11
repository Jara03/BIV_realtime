



const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fs = require("fs")
const readline = require("readline");
const Long = require("long");
const axios = require("axios") ;
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.get('/api/bivrt', async (req, res) => {
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
                 console.log(hours);
                 res.json(hours);
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

 function formatGTFSName(zenbusName){
     return new Promise((resolve, reject) => {
         const linedata = fs.createReadStream("./resources/verdun-rezo/routes.txt", {encoding: "utf8"});
        let res = {name:'', color:''};
         let resName = '';
         let rescolor = '';

         const rl = readline.createInterface({
             input: linedata,
             crlfDelay: Infinity
         });

         rl.on('line', (line) => {
             const values = line.split(',');
             if (zenbusName.toString() === values[0]) {
                 resName = values[2];
                 rescolor = values[7];
                 res = {name:resName,color:('#'+rescolor)};
             }
         });

         rl.on('close', () => {
             resolve(res);
         });
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
    return Math.trunc(diffInSeconds / 60);
}

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
   // console.log(findStopName())

    const data = fs.readFileSync("./resources/poll.proto") //attention le fichier doit etre en UTF-8
    //console.log(ex);
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(Buffer.from(data));

    //const feed1 = feed1.toJSON();

    //console.log(feed.entity.length);


    for(let i = 0; i < feed.entity.length;i++){

        if (feed.entity[i].tripUpdate) {

            if (feed.entity[i].tripUpdate.stopTimeUpdate) {

                let stopTimeItem = searchStopPoint(feed.entity[i].tripUpdate.stopTimeUpdate);

                //TODO mettre les directions
                //TODO fetch le lien de l'api toutes les ...secondes (utiliser axios)

                if(stopTimeItem != null){

                    let value = stopTimeItem.arrival.time.toString();



                    const longValue = Long.fromString(value); // Create a Long object from a string
                    const timestamp = longValue.toNumber() * 1000; // Convert the Long object to a timestamp in milliseconds
                    const date = new Date(timestamp);


                    let LineInfo = await formatGTFSName(feed.entity[i].tripUpdate.trip.routeId);//TODO envoyer la couleur de ligne
                    let RemainMinutes = formatRemainingMinutes(date);
                   // console.log(LineName + ' dans :' + formatRemainingMinutes(date) + " vers : " + findStopName());
                    RTHOURS.push({
                        ln: LineInfo.name,
                        rm: RemainMinutes,
                        color:LineInfo.color
                    })
                }


            }
        }
    }

    return RTHOURS;
}


//fonction de correspondance des lignes gtfs avec les noms reels (correspondance avec routes.txt)