/* mbira-tone.js
 * (C) Murat Gungoraydinoglu
 * requires jquery.js
 * requires tone.js
 */
var MbiraTone = function(onReadyCallback){
    const TAG = 'MbiraTone'
    const DEBUG = true
    var debugWarned = false

    const INSTRUMENT_FILE_PATH = 'static/js/instruments.json'
    const SOUND_FILE_DIR = 'sounds'
    const SOUND_FILE_EXT = '.mp3'
    const HOSHO_KIT_ID = 'hosho'
    const HOSHO_KEY_CODE = 'X'
    const TEMPO_RELATIVE = "8n"
    const SHOW_KIT = false
    const BPM_DEFAULT = 100
    const TEMPO_DEFAULT = "8n"
    const DELAY_DEFAULT = "1m"

    const log = function (s) {
        if (!console || !console.log) return 
        if (!debugWarned) { 
            console.log('DEBUG is ' + (DEBUG ? 'on' : 'off'))
            debugWarned = true
        }
        if (DEBUG) console.log(s) 
    }
    const error = function (s, e) { if (console && console.log) console.log(s); console.log(e) }

    if (!Array.prototype.flatMap) {
        Array.prototype.flatMap = function(lambda) {
        return Array.prototype.concat.apply([], this.map(lambda));
        }
    }

    var module = {}
    var _schedule = null
    var _scheduleForMeasure = null
    
    var _instruments = null
    var setInstruments = value => {
        _instruments = value
    }

    var _tablatures = {
        "nhemamusasa_kushaura": { 
            "name": "Nhemamusasa Kushaura",
            "text": `
             L3 / R2 X / B3 / R5 / L4 X / R2 / B5 / R4 X / L4 / R3 / B7 X / R5 /
             L3 / R2 X / B3 / R5 / L5 X / R3 / B6 / R5 X / L4 / R3 / B7 X / R6 /
             L2 / R3 X / B4 / R6 / L5 X / R3 / B6 / R5 X / L4 / R3 / B7 X / R5 /
             L3 / R2 X / B3 / R5 / L4 X / R2 / B5 / R4 X / L2 / R2 / L1 X / R5 /
        `},
        "nhemamusasa_kutsinhira": { 
            "name": "Nhemamusasa Kutsinhira",             
            "text": `
             L3 R2 / B3 / R5 / L4 / B3 R5 / / L3 R3 / B3 / R5 / L4 / B3 R5 / / 
             L3 R3 / B3 / R6 / L5 / B6 R5 / / L3 R3 / B3 / R5 / L4 / B5 R5 / /
             L2 R2 / B4 / R5 / L5 / B6 R4 / / L2 R2 / B4 / R6 / L5 / B6 R6 / /
             L3 R2 / B3 / R5 / L4 / B5 R4 / / L2 R2 / L1 / R4 / L2 / L1 R4 / / 
        `},
        "karigamombe_kushaura": { 
            "name": "Karigamombe Kushaura",
            "text": `
             R2 L1 / R6 / R2 L2 / R6 / R1 L5 / R4 / R1 L5 / R4 / R1 L4 / R4 / R1 L4 / R4 /
             R2 L1 / R6 / R2 L2 / R6 / R2 L3 / R5 / R2 L3 / R5 / R1 L4 / R4 / R1 L4 / R4 /
             R3 L4 / R5 / R3 L4 / R5 / R2 L3 / R5 / R2 L3 / R5 / R1 L4 / R4 / R1 L4 / R4 /
             R2 L1 / R6 / R2 L2 / R6 / R1 L5 / R4 / R1 L5 / R4 / R3 L2 / R6 / R3 L2 / R6 /
        `},
        "karigamombe_kutsinhira": { 
            "name": "Karigamombe Kutsinhira",
            "text": `
             R2 / L1 / R6 B1 / / R4 R1 B6 / L2 / R4 R1 / L1 / R7 B5    / / R7 L1 / L5 /
             R2 / L1 / R6 B4 / / R5 B6    / B5 / R5    / L1 / R4 R1 B2 / / R4 R1 / B2 /
             R3 / B5 / R3 B1 / / R5 B6    / B5 / R5    / L1 / R4 R1 B2 / / R4 R1 / B2 /
             R2 / B4 / R2 B1 / / R4 R1 B6 / B2 / R4 R1 / B6 / R3 B4    / / R3 B7 / B4 /
        `},
        "kuzanga_kushaura_5": { 
            "name": "Kuzanga Kushaura 5",
            "text": `
             R5 L3 / B3 / R5 / L4 / R2 B5 / R4 / L4 / R3 B1 / /
             R5 L3 / B3 / R5 / L5 / R3 B6 / R5 / L4 / R3 B1 / /
             R6 L2 / B4 / R6 / L5 / R3 B6 / R6 / L2 / R2 B1 / /
             R4 L2 / B4 / R4 / L4 / R2 B5 / R4 / L2 / R2 B1 / /
        `},
        "kuzanga_kutsinhira_5": { 
            "name": "Kuzanga Kutsinhira 5",
            "text": `
             R5 L3 / B3 / R5 / L4 / R2 B5 / R4 / L4 / R3 B1 /
             R5 L3 / B3 / R5 / L5 / R3 B6 / R5 / L4 / R3 B1 /
             R6 L2 / B4 / R6 / L5 / R3 B6 / R6 / L2 / R2 B1 /
             R4 L2 / B4 / R4 / L4 / R2 B5 / R4 / L2 / R2 B1 /
        `},
        "nyamaropa_kushaura": { 
            "name": "Nyamaropa Kushaura",
            "text": `
             R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R4 / L2 / R3 B4 / /
             R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R2 / L4 / R4 B5 / /
             R2 L1 / B1 / R2 / L1 / R2 B1 / / R5 L3 / B3 / R5 / L4 / R4 B5 / /
             R3 L4 / B7 / R3 / L4 / R3 B7 / / R5 L3 / B3 / R5 / L4 / R4 B5 / /
        `},
        "nyamaropa_kutsinhira": { 
            "name": "Nyamaropa Kutsinhira",
            "text": `
             R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R4 / L2 / R3 B4 / /
             R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R2 / L4 / R4 B5 / /
             R2 L1 / B1 / R2 / L1 / R2 B1 / / R5 L3 / B3 / R5 / L4 / R4 B5 / /
             R3 L4 / B7 / R3 / L4 / R3 B7 / / R5 L3 / B3 / R5 / L4 / R4 B5 / /
        `},
        "mahororo_kushaura_1": { 
            "name": "Mahororo Kushaura 1",
            "text": `
             L2 / X / R2 / / X R1 R4 / / L4 / X / R2 / / X R1 R4 / / 
             L2 / X / R2 / / X L3 R5 / / L4 / X / R2 / / X R1 R4 / / 
             L4 / X / R3 / / X L3 R5 / / L4 / X / R2 / / X R1 R4 / / 
             L2 / X / R2 / / X R1 R4 / / L2 / X / R3 / / X R1 R4 / /
        `},
        "mahororo_kushaura_2": { 
            "name": "Mahororo Kushaura 2",
            "text": `
             L2 / X R2 / B1 / R4 R1 / X B2 / R4 / L4 / X R2 / B1 / R4 R1 / X B2 / R4 / 
             L2 / X R2 / B1 / R5    / X L4 / R5 / L1 / X R2 / L6 / R4 R1 / X B2 / R4 / 
             L4 / X R3 / B7 / R5    / X L4 / R5 / L1 / X R2 / L6 / R4 R1 / X L2 / R4 / 
             L2 / X R2 / B1 / R4 R1 / X B2 / R4 / L2 / X R3 / B4 / R4 R1 / X B2 / R4 /
        `},
        "shumba_kushaura_1": { 
            "name": "Shumba Kushaura 1",
            "text": `
             B5 / X R4 R1 L2 / / R4 R1 B5 / X L2 / R4 R1 / B2 / X R3 L4 / / R2 B2 / X B1 / R2 / 
             B5 / X R4 R1 L2 / / R4 R1 B5 / X L2 / R4 R1 / B4 / X R4 L5 / / R2 B2 / X B1 / R2 / 
             B3 / X R5 R2 L3 / / R5 R2 B3 / X L3 / R5 R2 / B4 / X R4 L5 / / R3 B4 / X L7 / R3 / 
             B3 / X    R2 L3 / / R9    B3 / X L3 / R9    / B5 / X R8 B5 / / R7 B4 / X B3 / R5 /
        `},
        "chamunika": { 
            "name": "Chamunika",
            "text": `
             R6 R2 L2 / X L1 / R6 R2 / L2 / X R6 R2 B4 / / R5 R2 L3 / X R5 R2 B3 / / R4 R1 L4 / X B5 / / 
             R3 L4    / X B7 / R3    / L4 / X R3 B5    / / R2 L3    / X R2 B3    / / R4 R1 L4 / X B5 / / 
             R6 R2 L2 / X L1 / R6 R2 / L2 / X R6 R2 B4 / / R4 R1 L5 / X B6       / / R3    L2 / X B4 / / 
             R2 L2    / X L1 / R2    / L2 / X R2 B4    / / R4 R1 L5 / X L6       / / R4 R1 L4 / X B5 / /
        `},
        "bukatiende_kushaura_1": { 
            "name": "Bukatiende Kushaura 1",
            "text": `
             X R3 B7 / L4 / R7 / X R3 B7 / L3 / R5 / X B3 / R9 / L5 / X R8 B6 / L5 / R5 /
             X R3 B7 / L4 / R7 / X R3 B7 / L3 / R5 / X B3 / R9 / L4 / X R7 B5 / L4 / R4 /
             X R2 L1 / L2 / R6 / X R2 L1 / / R4 R1 / X B6 / R9 / L4 / X R7 B5 / L4 / R4 /
             X R2 L1 / L2 / R6 / X R2 L1 / L3 / R5 / X B3 / R9 / L4 / X R7 B5 / L4 / R4 /
        `},
        "bukatiende_kushaura_2": { 
            "name": "Bukatiende Kushaura 2",
            "text": `
             X R7 L4 / / R3 / X R7 L4 / / R2 / X R5 L3 / / L5 / X R5    / L5 / / 
             X R7 L4 / / R3 / X R7 L4 / / R2 / X R5 L3 / / L4 / X R4 R1 / R4 / / 
             X R6 L2 / / R2 / X R6 L2 / / R2 / X R6 L2 / / L5 / X R4 R1 / L4 / / 
             X R6 L2 / / R2 / X R6 L2 / / R2 / X R5 L3 / / L4 / X R4 R1 / L4 / / 
        `},
        "bukatiende_kutsinhira_1": { 
            "name": "Bukatiende Kutsinhira 1",
            "text": `
             X L4 / R3 B7 / B5 / X R3 / L3 / R5 L1 / X B3 / R2 / L5 / X R8 B6 / B3 / R8 / 
             X L4 / R7 B7 / B5 / X R7 / L3 / R6 L1 / X B3 / R5 / L4 / X R4 B5 / B2 / R3 /
             X L2 / R2 L1 / B1 / X R2 / L5 / R9 B6 / X B2 / R8 / L4 / X R7 B5 / B2 / R7 /
             X L2 / R6 L1 / B1 / X R6 / L3 / R5 L1 / X B3 / R5 / L4 / X R4 B5 / B2 / R4 /
        `},
        "bukatiende_kushaura_solo_3": { 
            "name": "Bukatiende Kushaura Solo 3",
            "text": `
             X R2 L1 / L2 / R2 / X L1 / R4 R1    / L5 / X R4 / L5 / R4 R1 / X L4 / R4 / L4 / 
             X R2 L1 / L2 / R2 / X L1 / R5 R2 L3 / L6 / X R5 / L6 / R4 R1 / X L4 / R4 / L4 / 
             X R3 B7 / L4 / R3 / X B7 / R5 R2 L3 / L6 / X R5 / L6 / R5 R2 / X L5 / R5 / L5 / 
             X R3 B7 / L4 / R3 / X B7 / R5 R2 L3 / L6 / X R5 / L6 / R4 R1 / X L4 / R4 / L4 / 
        `},
        "bukatiende_kushaura_solo_4": { 
            "name": "Bukatiende Kushaura Solo 4",
            "text": `
             X R2 L1 / L2 / R2 / X L1 / R4 R1    / L5 / X R9 / L5 / R8    / X L4 / R7 / L4 / 
             X R6 L1 / L2 / R6 / X L1 / R5 R2 L3 / L6 / X R5 / L6 / R4 R1 / X L4 / R4 / L4 / 
             X R3 B7 / L4 / R3 / X B7 / R5 R2 L3 / L6 / X R9 / L6 / R9    / X L5 / R8 / L5 / 
             X R7 B7 / L4 / R7 / X B7 / R6 L3    / L6 / X R5 / L6 / R4 R1 / X L4 / R4 / L4 / 
        `},
        "bukatiende_kushaura_solo_5": { 
            "name": "Bukatiende Kushaura Solo 5",
            "text": `
             X R2 L1 / L2 / R6 / X L1 / R4 R1    / L5 / X R8 / L5 / R4 R1 / X L4 / R7 / L4 / 
             X R2 L1 / L2 / R6 / X L1 / R5 R2 L3 / L6 / X R9 / L6 / R4 R1 / X L4 / R7 / L4 / 
             X R3 B7 / L4 / R7 / X B7 / R5 R2 L3 / L6 / X R9 / L6 / R5 R2 / X L5 / R8 / L5 / 
             X R3 B7 / L4 / R7 / X B7 / R5 R2 L3 / L6 / X R9 / L6 / R4 R1 / X L4 / R7 / L4 / 
        `}, 
        "bukatiende_kushaura_solo_6": { 
            "name": "Bukatiende Kushaura Solo 6",
            "text": `
             X L2 / R2 L1 / L1 / X R2 / L5 / R4 R1 B6 / X B6 / R4 R1 / L4 / X R4 R1 B5 / B5 / R4 R1 / 
             X L2 / R2 B4 / B4 / X R2 / L3 / R5 R2 B3 / X B3 / R5 R2 / L4 / X R4 R1 B5 / B5 / R4 R1 / 
             X L4 / R3 B1 / B1 / X R3 / L3 / R5 R2 B3 / X B3 / R5 R2 / L5 / X R5    B6 / B3 / R5    / 
             X L4 / R3 B1 / B1 / X R3 / L3 / R5 R2 B3 / X B3 / R5 R2 / L4 / X R4 R1 B5 / B2 / R4 R1 /
        `}, 
        "bukatiende_kushaura_2a": { 
            "name": "Bukatiende Kushaura 2a",
            "text": `
             X R2 L1 / L2 / R2 / X L1 / R1    / L5 / X R4 / L5 / R1    / X L4 / R4 / L4 / 
             X R2 L1 / L2 / R2 / X L1 / R2 L3 / L6 / X R2 / L6 / R1    / X L4 / R4 / L4 / 
             X R3 B7 / L4 / R3 / X L7 / R2 L3 / L6 / X R2 / L6 / R2 L3 / X L5 / R5 / L5 / 
             X R3 B7 / L4 / R3 / X L7 / R2 L3 / L6 / X R2 / L6 / R1    / X L4 / R4 / L4 / 
        `},
        "bukatiende_kushaura_2b": { 
            "name": "Bukatiende Kushaura 2b",
            "text": `
             X R2 L1 / L2 / R2 / X L1 / R4 R1    / L5 / X R4 / L5 / R7    / X L4 / R7 / L4 / 
             X R6 L1 / L2 / R6 / X L1 / R7 L3    / L6 / X R5 / L6 / R4 R1 / X L4 / R4 / L4 / 
             X R3 B7 / L4 / R3 / X L7 / R5 R2 L3 / L6 / X R5 / L6 / R8 L3 / X L5 / R8 / L5 / 
             X R7 B7 / L4 / R7 / X L7 / R6 L3    / L6 / X R5 / L6 / R4 R1 / X L4 / R4 / L4 / 
        `},
        "dande_kutsinhira_1": {
            "name": "Dande Kutsinhira 1",
            "text": `
             R7 R3 / X L3 / R5 R2 B3 / / X R5 R2 L1 / B3 / R5 R2 / X L5 / R5    B6 / / X    R3 L4 / B1 /
                R3 / X L3 /    R2 B3 / / X    R2 L1 / B3 /    R2 / X L4 / R4 R1 B5 / / X    R2 L1 / B0 /
                R2 / X L5 / R4 R1 B2 / / X R4 R1 L5 / B2 / R4 R1 / X L4 / R7 R2 B5 / / X R7 R2 L1 / B1 /
             R6 R2 / X L3 / R5 R2 B3 / / X R5 R2 L1 / B3 / R5 R2 / X L4 / R7 R3 B5 / / X R7 R3 L7 / B0 /
            `
        },
        "chipembere_1": {
            "name": "Chipembere 1",
            "text": `
             R1 / R4 B5 / L4 / R2 L1 / L6 / R2 / R1 / R4 B5 / L4 / R2 L1 / L6 / R2 /
             R1 / R4 B5 / L4 / R3 B7 / R3 / R5 / L3 / R3 B5 / L4 / R2 L1 / L6 / R2 /
             R1 / R4 B5 / L4 / R2 L1 / L6 / R2 / R1 / R4 B2 / L2 / R4 B6 / L5 / R4 /
             B7 / R3    / L2 / R2 L1 / L6 / R2 / R1 / R4 B2 / L2 / R4 B6 / L6 / R4 /
            `
        },
        "dangurangu_v1": {
            "name": "Dangurangu 1",
            "text": `
             R5 L3 / X L5 / R8 / L3 / X R8 L5 / R3 / R8 L3 / X L5 / R8 / L3 / X R7 L4 / R3 /
             R6 L2 / X L5 / R6 / L2 / X R6 L5 / R3 / R5 L3 / X L4 / R7 / R1 / X R6 L2 / R2 /
             R5 L3 / X L4 / R4 / L6 / X R2    / L6 / R4 R1 / X L2 / R6 / R1 / X R6 L2 / R2 /
             R5 L3 / X L4 / R4 / L6 / X R2    / L6 / R5 L3 / X L4 / R3 / L3 / X R2 L2 / R2 /
            `
        },
        "dangurangu_v2": {
            "name": "Dangurangu 2",
            "text": `
             R5 L3 / X L5 / R5 / L3 / X R5 L5 / R3 / R5 L3 / X L5 / R5 / L3 / X R7 L4 / R3 /
             R6 L2 / X L5 / R6 / L2 / X R6 L5 / R3 / R5 L3 / X L4 / R4 / R1 / X R6 L2 / R2 /
             R5 L3 / X L4 / R4 / L6 / X R2    / L6 / R4 R1 / X L2 / R6 / R1 / X R6 L2 / R2 /
             R5 L3 / X L4 / R4 / L6 / X R2    / L6 / R5 L3 / X L4 / R3 / L3 / X R2 L2 / R2 /
            `
        }
    }
    var _kits = {}
    var _tabs = {}
    var _onBufferLoadCallback = null

    var _canvas = $('#mbira-instrument')[0]
    var _ctx = _canvas && _canvas.getContext('2d')
    var _kitKeyPaths //current kit key paths
    var _kitImage //current mbira image

    var getInstrumentImageFileName = function(id) {
        if (_instruments && _instruments[id])
            return _instruments[id].image
    }

    var getInstrumentPathsForKeys = function(id) {
        if (_instruments && _instruments[id]) {
            return _instruments[id].keys
        }
    }

    var loadTabs = function () {
        log('loadTabs')
        getTabList().forEach(tab => {
            var id = tab.id
            _tabs[id] = _tablatures[id].text.split('/').map(x => x.trim().split(' '))
            _tabs[id].pop() // remove the extraneous note
        })
    }

    var loadKitSamples = function (onLoadedCallback) {
        _onBufferLoadCallback = onLoadedCallback
        getKitList().forEach(kit => {
            var id = kit.id
            var keys = Object.keys(_instruments[id].keys)
            var urls = {}
            keys.forEach(x => {
                urls[x] = SOUND_FILE_DIR +
                   '/' + (x == HOSHO_KEY_CODE ? HOSHO_KIT_ID : id) +
                   '_' + x + SOUND_FILE_EXT
            })
            _kits[id] = new Tone.MultiPlayer({ urls : urls }).toMaster()
        })
    }

    var getKitList = function() {
        if (_instruments) {
            return Object.keys(_instruments).map(x=> { 
                return {'id': x, 'name': _instruments[x].name } 
            })
        }
        return []
    }

    var getTabList = function() {
        if (_tablatures) {
            return Object.keys(_tablatures).map(x=> { 
                return {'id': x, 'name': _tablatures[x].name } 
            })
        }
        return []
    }

    var getBpmList = function() {
        var bpms = [ 40, 50, 60, 80, 90, 100, 120, 140, 160 ]
        return bpms.map(x => { 
            return {'id': x, 'name': x+' bpm' } 
        })
    }

    var showKit  = function(id) {
        if (!SHOW_KIT) return;
        if (!_ctx) return
        if (id) {
            if (id == 'same' && _kitImage) {
                _ctx.drawImage(_kitImage, 0, 0)
            } else {
                _kitKeyPaths = getInstrumentPathsForKeys(id)
                _kitImage = new Image()
                _kitImage.onload = function() {
                    _ctx.clearRect(0, 0, _canvas.width, _canvas.height)
                    _ctx.drawImage(_kitImage, 0, 0)
                }
                _kitImage.src = './images/'+getInstrumentImageFileName(id)
            }
        } else {
            _ctx.clearRect(0, 0, _canvas.width, _canvas.height)
            _kitImage = null
        }
    }

    var showKeys = function(keys) {
        if(!SHOW_KIT) return;
        keys.forEach(x=> {
            showKey(x)
        })
    }
    var showKey = function(key) {
        if (!key) return
        if (key == HOSHO_KEY_CODE) return
        var kp = _kitKeyPaths[key]
        if (kp) {
            var p = kp.split(' ')
            var x = p[0]
            var y = p[1]
            var r = p[2] || (key[0]=='R' ? 10 : key[0]=='L' ? 13 : 15)
            var fillStyle = p[3] ||
                ( key[0]=='R' ? '#cc001188'
                : key[0]=='L' ? '#11cc0088'
                              : '#01baef88')
            var strokeStyle = '#eeeeee88'
            _ctx.beginPath()
            _ctx.strokeStyle = strokeStyle
            _ctx.arc(x, y, r, 0, 2*Math.PI)
            _ctx.stroke()
            _ctx.fillStyle = fillStyle
            _ctx.fill()
        }
    }
    
    Tone.Buffer.on('load', function(){
        if (_onBufferLoadCallback) _onBufferLoadCallback()
    })

    var clearSchedule = function() {
        Tone.Transport.clear(_schedule)
        Tone.Transport.clear(_scheduleForMeasure)
    }

    var schedulePlayer = function(options) {
        var kitId = options.kitId
        var kit = options.kit
        var tab = options.tab
        var bpm = options.bpm  
        var tempo = options.tempo // relative to bpm
        var start = options.start
        var onKeysPlayedCallback = options.onKeysPlayedCallback
        var onMeasureCallback = options.onMeasureCallback
        var tab_index = 0

        clearSchedule()

        _scheduleForMeasure = Tone.Transport.scheduleRepeat(function(time){
            if (onMeasureCallback) onMeasureCallback(time)
        }, "8n", 0)

        _schedule = Tone.Transport.scheduleRepeat(function(time){
            if (tab_index == tab.length) tab_index = 0
            var keys = tab[tab_index]            
            if (onKeysPlayedCallback) onKeysPlayedCallback(keys)
            showKeys(keys)
            keys.filter(x => x > ' ')
                .forEach(x => {
                    try{
                        kit.start(x, time)
                    } catch (ex) {
                        error('cannot play key', ex)
                    }
                })
            tab_index++
            setTimeout(function(){
                showKit(kitId)            
            }, 300)
        }, tempo, start)
        setBpm(bpm)
    }

    var load = function(options, onReadyToPlayCallback) {
        options = options || {}
        if (options.kitId) {
            showKit(options.kitId)
        }
        if (options.kitId && options.tabId) {
            schedulePlayer({
                kitId: options.kitId,
                kit: _kits[options.kitId],
                tab: _tabs[options.tabId],
                bpm: options.bpm || BPM_DEFAULT,   
                tempo: options.tempo || TEMPO_DEFAULT, // relative to bpm
                start: options.start || DELAY_DEFAULT, // one measure
                onKeysPlayedCallback: options.onKeysPlayedCallback,
                onMeasureCallback: options.onMeasureCallback
            })
            if (onReadyToPlayCallback) onReadyToPlayCallback();
        }
    }

    var start = function() {
        Tone.Transport.start()
    }

    var stop = function() {
        clearSchedule()
        Tone.Transport.stop()
        showKit('same')
    }

    var setBpm = function(bpm) {
        log('setBpm='+bpm)
        Tone.Transport.bpm.rampTo(bpm, 4);
    }

    var initialize = function() {
        log('initialize')
        fetch(INSTRUMENT_FILE_PATH)
          .then(res => res.json())
          .then(data => {
            setInstruments(data);
            loadTabs()
            loadKitSamples(() => {
              module.initialized = true
              if (onReadyCallback) onReadyCallback()
            })
          }).catch( e => { 
            error('Falied to initialize', e) 
          })
    }

    module.getKitList = getKitList
    module.getTabList = getTabList
    module.getBpmList = getBpmList
    module.getInstrumentImageFileName = getInstrumentImageFileName
    module.getInstrumentPathsForKeys = getInstrumentPathsForKeys
    module.load = load
    module.start = start
    module.stop = stop
    module.setBpm = setBpm
    module.initialized = false

    initialize()

    return module
}
