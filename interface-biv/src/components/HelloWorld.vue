<template>
  <div class="main-container">

    <div style="display: flex;flex-direction: row; justify-content:space-evenly;align-content: center;">

      <div style="display: flex; justify-content: start; align-items: center; margin-left:50px">
        <img src="../../resources/LOGO-REZO-2048x1065.png" alt="" style="width: 100px; height: 50px"/>
      </div>

        <div style="display: flex; justify-content: center; align-items: center; flex-grow: 1; ">
          <h2 style="color: black">Gare Multimodale</h2>
        </div>

      <div style="display: flex; justify-content: center; align-items: center;background-color:#8f6adf;">
        <p style="color:white;padding: 50px; font-size:20px">{{ currentTime }}</p>
      </div>

    </div>

    <div class="table-container">
    <table class="my-table">
      <tbody>
      <tr v-for="(item,index) in hours" :key="index">

        <td><label class="lineTag">{{item.ln}}</label></td>
        <td><label>direction</label></td>
        <td>{{item.rm}}</td>

      </tr>
      </tbody>
    </table>

    </div>

  </div>
</template>

<script>

import axios from 'axios';

export default {
  created() {
    setInterval(() => {
      let date = new Date();
      this.currentTime = date.toLocaleTimeString();
    }, 1000)
  },

  mounted() {

    setInterval(() => {
      //faire l'appel api et intégrer les données
      axios.get("http://localhost:3000/api/bivrt")
          .then((response) => {

            let data = response.data;
            this.hours = (data);
            //Vue.set(this.hours,'hours',data);
          })
          .catch((error) => {
            console.error(error);
          });

    }, 5000);

  },
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data(){
    return {
      hours: [{ln:"L1", rm:"14"},{ln:"L2", rm:"1"},{ln:"L3", rm:"5"}],
      currentTime: ''
    }
  },
  methods:{
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.lineTag{
  font-weight:bold;
  border-radius: 7px;
  border: 2px #2c3e50 solid;
  padding-inline: 10px;
  padding-bottom: 3px;
  padding-top: 3px;
  background-color: #2c3e50;
  color:white;
  justify-content: start;
  width: auto;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.main-container{

}

.table-container {
  font-size: large;
  display: flex;
  justify-content: center;
}

.my-table {
  width: 100%;
  border-collapse: collapse;
}

.my-table th, .my-table td {
  padding: 25px;
  text-align: center;
  background-color: lightgrey;
}

.my-table td:first-child {
  width: 33%;
}

.my-table td:nth-child(2) {
  width: 33%;
}

.my-table td:nth-child(3) {
  width: 33%;
}
.my-table th {
  background-color: #f2f2f2;

}
.my-table td {
}
.my-table tr {
  border-bottom: 3px solid #fff;
}





</style>
