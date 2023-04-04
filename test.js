



const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fs = require("fs")
const readline = require("readline");

//fonction de chargement des données avec express

async function formatGTFSName(zenbusName){
    const linedata = fs.createReadStream("./verdun-rezo/routes.txt", {encoding:"utf8"});

    //fetch chaque ligne et split a a virgule
    const rl = readline.createInterface({
        input: linedata,
        crlfDelay: Infinity
    });

    rl.on('line', (line) => {

        const values = line.split(',');
        if(zenbusName.toString() === (values[0])){
            console.log(values[2])
           // console.log(values[0]);

        }
    });

    rl.on('close', () => {});


}

async function run(){
    const data = fs.readFileSync("./pill.proto") //attention le fichier doit etre en UTF-8
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(data);

    console.log(feed.entity.length)

//console.log(feed.entity[0])
    for(let i = 0; i < feed.entity.length-1;i++){

        if(feed.entity[i].vehicle){

            await formatGTFSName(feed.entity[i].vehicle.trip.routeId)


        }else if(feed.entity[i].tripUpdate){

            await formatGTFSName(feed.entity[i].tripUpdate.trip.routeId)
        }
    }
}





//fonction de correspondance des lignes gtfs avec les noms reels (correspondance avec routes.txt)


