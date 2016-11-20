/* mbira-tone.js 
 * (C) Murat Gungoraydinoglu
 * requires jquery.js
 * requires tone.js
 */
var MbiraTone = function(callback){
    const TAG = 'MbiraTone'
    const DEBUG = true
    
    const instrumentFilePath = './instruments.json'
    const soundFilePath = './sounds'
    const soundFileExt = '.mp3'
    const hoshoKitName = 'hosho'
    const hoshoKey = 'X'

    const log = function (s) { if(DEBUG && console && console.log) console.log(s) }
    const error = function (s, e) { if (console && console.log) console.log(s); console.log(e) }   

    log(TAG+': module initializing')

    if (!Array.prototype.flatMap) {
        Array.prototype.flatMap = function(lambda) { 
        return Array.prototype.concat.apply([], this.map(lambda)); 
        }
    }

    var module = {}    
    var _schedule = null
    var _instruments = null    
    var _kits = {}
    var _tabs = {}
    var _onBufferLoadCallback = null
    var _tabTexts = {
        'nyamaropa_kushaura' : `
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R4 / L2 / R3 B4 / /
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R2 / L4 / R4 B5 / /
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R5 L3 / B3 / R5 / L4 / R4 B5 / /
            R3 L4 / B7 / R3 / L4 / R3 B7 / / R5 L3 / B3 / R5 / L4 / R4 B5 / 
            `
    }

    var getInstrumentImageFileName = function(name) {
        if (_instruments && _instruments[name] && _instruments[name].image)
            return _instruments[name].image
    }

    var getInstrumentPathsForKeys = function(name) {
        log(TAG+': getInstrumentPathsForKeys: name='+name)
        if (_instruments && _instruments[name]) {
            var keys = _instruments[name].keys
            Object.keys(keys).forEach(x=> {
                keys[x] = new Path2D(keys[x])
            })
            return keys
        }
    }
    
    var loadTabs = function () {
        getTabNames().forEach(tabName => {
            _tabs[tabName] = _tabTexts[tabName].split('/').map(x => x.trim().split(' '))
        })        
    }

    var loadKits = function (callback) {
        _onBufferLoadCallback = callback
        getKitNames().forEach(kitName => {
            var keys = Object.keys(_instruments[kitName].keys)
            var urls = {}
            keys.forEach(x => { 
                urls[x] = sound_file = soundFilePath +
                   '/' + (x == hoshoKey ? hoshoKitName : kitName) +
                   '_' + x + soundFileExt 
            })
            _kits[kitName] = new Tone.MultiPlayer({ urls : urls }).toMaster()
        })
    }
    
    var getKitNames = function() {
        if (_instruments) {
            return Object.keys(_instruments)
        }
    }

    var getTabNames = function() {
        if (_tabTexts) {
            return Object.keys(_tabTexts)
        }
    }

    var schedulePlayer = function(kit, tab, tempo, start, onKeysPlayed) {
        log(TAG+': schedulePlayer, tempo='+tempo+', start='+start)
        var tab_index = 0
        if (_schedule != null) {
            log(TAG+': schedulePlayer: clear='+_schedule)
            Tone.Transport.clear(_schedule)
        }
        _schedule = Tone.Transport.scheduleRepeat(function(time){
            if (tab_index == tab.length) tab_index = 0
            var keys = tab[tab_index]
            if (onKeysPlayed) onKeysPlayed(keys)
            tab[tab_index++]
                .filter(x => x > ' ')
                .forEach(x => {
                    try{
                        kit.start(x, time)
                    } catch (ex) {
                        error('cannot play key', ex)
                        Tone.Transport.stop()
                    }
                })            
        }, tempo, start)
        log(TAG+': schedulePlayer: _schedule='+_schedule)
    }

    var load = function(options) { 
        log(TAG+': load: options=' + options)
        log(options)
        options = options || {}
        var tabName = options.tabName 
        var kitName = options.kitName 
        var tempo = options.tempo || "8n" // 8th of a note
        var start = options.start || "1m" // one measure        
        var tab = _tabs[tabName]
        var kit = _kits[kitName]
        schedulePlayer(kit, tab, tempo, start, options.onKeysPlayed)
    }

    var start = function() { Tone.Transport.start() }
    var stop = function() { Tone.Transport.stop() }
    
    Tone.Buffer.on('load', function(){
        log(TAG+': Tone.Buffer.onload')
        if (_onBufferLoadCallback) _onBufferLoadCallback() // finally ready
    })

    module.getKitNames = getKitNames
    module.getTabNames = getTabNames
    module.getInstrumentImageFileName = getInstrumentImageFileName
    module.getInstrumentPathsForKeys = getInstrumentPathsForKeys
    module.load = load
    module.start = start
    module.stop = stop
 
    $.getJSON(instrumentFilePath, function(result) {
        _instruments = result
        loadTabs()
        loadKits(function(){
            log(TAG+': instruments loaded')
            log(Object.keys(_instruments))
            if (callback) callback() // ready
        })
    })

    return module
}