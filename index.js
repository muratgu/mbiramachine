// index.js

(async() => {  

  const nextid = (function () {
    let seed = 10000
    return function () {
      seed += 1
      return seed
    }
  })()

  function addTrack(parent, size, pan) {    

    const container = document.createElement("div");
    container.setAttribute('class', 'track');
    parent.appendChild(container);

    const elPlay = addCheckbox(container, "play");

    const elMute = addCheckbox(container, "mute");
    elMute.addEventListener('click', () => {
      if (looper) looper.mute(elMute.checked);
    });

    const elPiece = addSelect(container);
    addOption(elPiece, '', 'Select Piece');
    Object.keys(catalog.pieces).forEach(k => addOption(elPiece, k, catalog.pieces[k].name));    

    const elTuning = addSelect(container);
    addOption(elTuning, '', 'Select Tuning');
    Object.keys(catalog.tunings).filter(x => x!='hosho').forEach(k => addOption(elTuning, k, catalog.tunings[k].name));

    const elHosho = addCheckbox(container, "hosho");
    elHosho.addEventListener('click', () => {
      if (looper) looper.hosho(elHosho.checked);
    });

    const elTable = addTable(container, size);

    // render notes on table upon selection
    elPiece.addEventListener('change', (ev) => {
      const value = ev.target.value;
      const piece = catalog.pieces[value];
      const notes = piece.notes;
      elTable.querySelectorAll('span.cell').forEach(x => { x.textContent = '' });
      for(let i=0;i<notes.length;i++) {
        for(let j=0;j<notes[i].length;j++) {
          const bar = i+1;
          const note = notes[i][j];
          let key = note[0];
          const val = note[1];
          if (key == 'R') {
            key = (val == '1' || val == '2' || val == '3') ? 'RI':'RT'; 
          }
          const elCell = elTable.querySelector('.bar-'+bar+'.key-'+key);
          if (elCell) elCell.textContent = val;
        }
      }
    })

    let looper = null;
    return {
      start: function() {
        (async() => {          
          if (!elPlay.checked) return;
          if (elPiece.value == '') return;
          if (elTuning.value == '') return;
          looper = await mbira.makeLooper({ 
            piece: elPiece.value, 
            tuning: elTuning.value, 
            panning: pan, 
            hosho: elHosho.checked,
            onNote: function(seq, notes) {
              elTable.querySelectorAll('td.current').forEach(x => { x.classList.remove('current') })
              const bar = seq+1;
              const elBar = elTable.querySelector('.bar-'+bar);
              if (elBar) elBar.parentElement.classList.add('current');
              for(let i=0;i<notes.length;i++) {
                const note = notes[i];
                let key = note[0];
                const val = note[1];
                if (key == 'R') {
                  key = (val == '1' || val == '2' || val == '3') ? 'RI':'RT'; 
                }
                const elCell = elTable.querySelector('.cell.bar-'+bar+'.key-'+key);
                if (elCell) elCell.parentElement.classList.add('current');
              }
            }
          });
          if (looper) looper.start(1);
          if (looper) looper.mute(elMute.checked);
          elPlay.setAttribute('disabled', 'disabled');
          elPiece.setAttribute('disabled', 'disabled');
          elTuning.setAttribute('disabled', 'disabled');
        })();
      },
      stop: function() {
        if (looper) looper.stop();
        elPlay.removeAttribute('disabled');
        elPiece.removeAttribute('disabled');
        elTuning.removeAttribute('disabled');
        elTable.querySelectorAll('td.current').forEach(x => { x.classList.remove('current') })
      }      
    }
  }

  function addButton(container, label) {
    const el = document.createElement("button");
    el.appendChild(document.createTextNode(label));  
    container.appendChild(el);
    return el;
  }

  function addSelect(container) {
    const el = document.createElement("select");
    container.appendChild(el);
    return el;
  }

  function addOption (parent, value, label, selected) { 
    var el = document.createElement("option"); 
    el.setAttribute("value", value);
    if (selected) el.setAttribute("selected", "selected");
    el.appendChild(document.createTextNode(label));  
    parent.appendChild(el);
  }

  function addCheckbox(container, label) {
    const elInput = document.createElement("input");
    elInput.setAttribute("type", "checkbox");
    container.appendChild(elInput);    
    const id = nextid();
    elInput.setAttribute("id", id);
    elInput.setAttribute("name", id);
    const elLabel = document.createElement("label");
    elLabel.setAttribute("for", id);
    elLabel.appendChild(document.createTextNode(label));  
    container.appendChild(elLabel);  
    return elInput;  
  }
  
  function addSpan(container) {
    const el = document.createElement("span");
    container.appendChild(el);
    return el;
  }

  function addTable(container, size, division) {
    const keyNames = ['','H','RI','RT','L','B'];
    const numCols = size || 48;
    division = division || 12;
    const numRows = 6
    const el = document.createElement("table");
    container.appendChild(el);
    // rows
    for (let r=0;r<numRows;r++) {
      const elTr = document.createElement("tr");
      el.appendChild(elTr);
      // cols
      for (let c=0;c<numCols+1;c++) {
        const bar = c;
        const key = keyNames[r];
        const elTd = document.createElement("td");
        elTr.appendChild(elTd);
        if (bar>0 && bar % division == 0) elTd.classList.add('midbar');
        const elText = document.createElement("span");
        elTd.appendChild(elText);
        if (r == 0 && c > 0) { elText.textContent = c; elText.classList.add('bar-'+c); }
        if (r > 0 && c == 0) elText.textContent = key;
        if (r > 0 && c > 0) elText.classList.add('bar-' + bar, 'cell', 'key-' + key);
      }
    }
    return el;
  }

  const defaultTrackSize = 48;

  var catalog = Catalog();
  catalog.pieces = await catalog.load('./catalog.dat');

  var mbira = Mbira(Tone, catalog);

  var elTracks = document.createElement("tracks");

  var track1 = addTrack(elTracks, defaultTrackSize, -0.1);
  var track2 = addTrack(elTracks, defaultTrackSize, +0.1);

  var elMbira = document.querySelector("#mbira");
  elMbira.appendChild(elTracks);

  const elStart = addButton(elMbira, "start");
  const elPause = addButton(elMbira, "pause");
  elPause.addEventListener('click', () => {
    mbira.pause();
    elPause.textContent = elPause.textContent == 'pause' ? 'resume' : 'pause';
  })

  const elStop = addButton(elMbira, "stop");
  const elBpm = addSelect(elMbira);  
  const bpmList = {100: {name: "100 bpm"}, 120: {name: "120 bpm", selected: true}, 140: {name: "140 bpm"}};
  Object.keys(bpmList).forEach(k => addOption(elBpm, k, bpmList[k].name, bpmList[k].selected || false));  
  elBpm.addEventListener('change', (ev) => {
    const value = ev.target.value;
    mbira.bpm(value);
  })

  var _stopHandler = null;
    const handleStop = (callback) => {
      if (_stopHandler) elStop.removeEventListener('click', _stopHandler);
      _stopHandler = callback;
      elStop.addEventListener('click', _stopHandler);
    }
  
  const handlePlay = () => {
    if (_stopHandler) _stopHandler();
    
    (async() => {
      track1.start(); 
      track2.start();
      mbira.start({bpm: elBpm.value || "120"});  
      elPause.textContent = 'pause';

      handleStop(() => {
        track1.stop();
        track2.stop();
        mbira.stop();  
        elPause.textContent = 'pause';
      })      

    })();
  }

  elStart.removeEventListener('click', handlePlay);
  elStart.addEventListener('click', handlePlay);  

})();
