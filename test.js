



const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fs = require("fs")
const readline = require("readline");
const Long = require("long");


//fonction de chargement des données avec express

 function formatGTFSName(zenbusName){
     return new Promise((resolve, reject) => {
         const linedata = fs.createReadStream("./verdun-rezo/routes.txt", {encoding: "utf8"});

         let res = '';

         const rl = readline.createInterface({
             input: linedata,
             crlfDelay: Infinity
         });

         rl.on('line', (line) => {
             const values = line.split(',');
             if (zenbusName.toString() === values[0]) {
                 res = values[2];
             }
         });

         rl.on('close', () => {
             resolve(res);
         });
     });
}

 function formatRemainingMinutes(nextDate){
    const now = new Date();
     // Unix timestamp
     const diffInSeconds = (nextDate.getTime() - now.getTime()) / 1000;
    return Math.trunc(diffInSeconds / 60);
}

async function run(){
    const data = fs.readFileSync("./poll.proto") //attention le fichier doit etre en UTF-8
    const feed1 = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(data);
    const feed = feed1.toJSON();


    for(let i = 0; i < feed.entity.length;i++){

        if(feed.entity[i].vehicle){

             await formatGTFSName(feed.entity[i].vehicle.trip.routeId).then(r => console.log(r))


        }else
        if (feed.entity[i].tripUpdate) {

            if (feed.entity[i].tripUpdate.stopTimeUpdate[0].arrival) { //problème avec les accès
                console.log(i)
                console.log(feed.entity[1].tripUpdate.stopTimeUpdate[1].arrival)
                let value = feed.entity[i].tripUpdate.stopTimeUpdate[0].arrival.time.toString()//prochain passage a l'arret 0 chercher le bon arret

                const longValue = Long.fromString(value); // Create a Long object from a string
                const timestamp = longValue.toNumber() * 1000; // Convert the Long object to a timestamp in milliseconds
                const date = new Date(timestamp);


                let test = await formatGTFSName(feed.entity[i].tripUpdate.trip.routeId);

                console.log(test + ' dans :' + formatRemainingMinutes(date));

            }
        }
    }
}

run()




//fonction de correspondance des lignes gtfs avec les noms reels (correspondance avec routes.txt)


