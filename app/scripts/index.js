/* eslint no-var: 1 */
/* eslint-env es6 */
/* eslint-env browser */
(function () {
  'use strict';

  let state = {
    haveData: false,
    api: {
      baseURL: 'https://api.mesowest.net/v2/stations/timeseries?',
      args: {
        obtimezone: 'local',
        units: 'english',
        vars: 'air_temp',
        start: '201706200600', // The day you think it might hit 100 deg.
        end: '201706210600',
        recent: 60,
        token: '', // Put your API token here.
        stid: 'kslc' // Change this to your local weather station.  See mesowest.utah.edu for station codes.
      }
    }
  };

  let store = {};

  doSomething();
  let worker = setInterval(doSomething, 60000);

  function doSomething () {
    fetchData(state.api.baseURL, state.api.args, (data) => {
      // console.log('data', data);
      const airTemp = data.STATION[0].OBSERVATIONS.air_temp_set_1;
      const last = airTemp.length - 1;

      const tmp = max(data.STATION[0].OBSERVATIONS.air_temp_set_1);
      const maxAirTemp = tmp[0];
      const maxAirTempTime = data.STATION[0].OBSERVATIONS.date_time[tmp[1]];
      const currentAirTemp = data.STATION[0].OBSERVATIONS.air_temp_set_1[last];

      // console.log(maxAirTemp, maxAirTempTime, currentAirTemp, tmp);

      const airTempThreshold = 100;
      const isHot = maxAirTemp > airTempThreshold;
      const isHotMessage = maxAirTemp > airTempThreshold
        ? '<red>Sure is!</red></b>'
        : '<blue>Not yet.</blue>';
      document.getElementById('is-hot').innerHTML = isHotMessage;

      if (isHot) {
        document.getElementById('is-hot').innerHTML =
          isHotMessage +
          `&nbsp;<br/>${state.api.args.stid.toUpperCase()} hit ${maxAirTemp}<sup>&deg;</sup>F 
          at ${(new Date(maxAirTempTime).toLocaleString()).split(', ')[1]}`;
      }
      document.getElementById('current-temp').innerHTML =
        'Currently ' + currentAirTemp + '&nbsp;<sup>&deg;</sup>F';

      fetchData('./guessTimes.json', {}, (data) => {
        let table = document.getElementById('players-table');
        table.innerHTML = '';

        let row = table.insertRow(-1);
        row.insertCell(-1).innerHTML = 'Still in';
        row.insertCell(-1).innerHTML = 'Busted!';

        let potentialWinners = [];
        let potentialWinnersDt = [];

        Object.keys(data).map((k) => {
          let playersTime = new Date(data[k]) - new Date(maxAirTempTime);
          let row = table.insertRow(-1);

          // A player who is closest without going over the maxAirTempTime wins.
          if (isHot) {
            row.insertCell(-1).innerHTML = playersTime <= 0
              ? k + ' (' + (new Date(data[k]).toLocaleString()).split(', ')[1] + ')'
              : '';
            row.insertCell(-1).innerHTML = playersTime > 0 ? k : '';
          } else {
            row.insertCell(-1).innerHTML =
              k + ' (' + (new Date(data[k]).toLocaleString()).split(', ')[1] + ')';
            row.insertCell(-1).innerHTML = '';
          }

          if (isHot && playersTime < 0) {
            potentialWinners.push(k);
            potentialWinnersDt.push(playersTime);
          }
        });

        if (isHot && potentialWinners.length > 0) {
          clearInterval(worker);
          document.getElementById('winner').innerHTML =
            '<red>' + potentialWinners[max(potentialWinnersDt)[1]] + ' WINS!</red>';
        }
      });
    });
  }

  function max (numArray) {
    const value = Math.max.apply(null, numArray);
    return [value, numArray.lastIndexOf(value)];
  }

  function serializeURLArgs (obj) {
    let str = ['?'];
    for (let p in obj) {
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
      }
    }
    return str.join('&');
  }

  function fetchData (baseURL = '', args = {}, callback) {
    state.api.requestURL = baseURL + serializeURLArgs(args);
    fetch(state.api.requestURL)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        store.data = data;
        state.haveData = true;
        const callbackType = typeof callback;
        if (callbackType === 'function') {
          callback(store.data);
        }
        if (callbackType === 'object') {
          callback.map(function (k) {
            k(store.data);
          });
        }
      });
  }
})();
