// Usage example
const axios = require("axios");
const {forEach} = require("core-js/stable/dom-collections");
const stopIdZenbus = 'zenbus:StopPoint:SP:507070002:LOC';



const OperatorId = 16;
async function getNextArrivalAtStop() {

    try{
        let response = await axios.get('https://stage1.api.grandest2.cityway.fr/api/transport/v3/timetable/GetNextStopHoursForStops/json', {
            params: {
                StopIds: '151317'
            }
        })
       return response.data;

    }catch (e){
        console.error("Error : ", e);
    }
}

async function processData(){
    let arrivals = [];

    arrivals = await getNextArrivalAtStop();
    //console.log(arrivals);
 //return arrivals.Hours

    let Hours = arrivals.Data.Hours;
    let arrival_limited = await filterLimited(Hours);
    let THEORETICAL_HOURS = [];

    await arrival_limited.forEach((element) => {
        //Determiner le temps restant
        let now = new Date();
        let current_time = (now.getHours()*60)+now.getMinutes();
        let RemainMinutes = element.TheoricArrivalTime - current_time;

        //determiner le tripId
        let id = element.VehicleJourneyId;
        let dir;
        let tripId;
        function setTripInfo(id){
            const vehicleJourney = arrivals.Data.VehicleJourneys.find((journey) => journey.Id === id);

            if (vehicleJourney) {
               tripId = vehicleJourney.OperatorJourneyId;
               dir = vehicleJourney.JourneyDestination;
            }else{
                tripId =  null; // If no matching journey found
                dir = null;
            }
        }

        setTripInfo(id);
        let color;
        let LineInfo;
        function setLineInfo(id){
            const line = arrivals.Data.Lines.find((line) => line.Id === id);

            if (line) {
                   color = line.Color;
                    LineInfo =  line.Number;

            }else{
                color = null;
                LineInfo = null;
            }
        }

        setLineInfo(element.LineId);

        THEORETICAL_HOURS.push({
            tr: tripId,
            ln: LineInfo,
            rm: RemainMinutes,
            direction: dir,
            color:color,
            rt : false
        })
    })

    async function filterLimited(hours){
        let filtered = [];
        //console.log(hours)
       let  end_hour_in_minutes = () => {
            let now = new Date();
            let hours = now.getHours();
            let minutes = now.getMinutes();

            return hours*60 + minutes + 46;
       }
        console.log(end_hour_in_minutes())
        hours.forEach((element) => {
           if(element.TheoricArrivalTime <= end_hour_in_minutes() && element.TheoricArrivalTime != null && element.TheoricArrivalTime >= (end_hour_in_minutes()-44) ){
                //console.log(element);
                filtered.push(element);
            }
        })

        return filtered;
    }

    //console.log(THEORETICAL_HOURS);

    return THEORETICAL_HOURS;

}


//processData()

module.exports = {processData}
