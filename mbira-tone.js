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

    var _canvas = $('#mbira-instrument')[0]
    var _ctx = _canvas && _canvas.getContext('2d');
    var _kitName //current kit name
    var _kitKeyPaths //current kits key paths
    var _kitImage //current mbira image

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
        log(TAG+': loadTabs')
        getTabNames().forEach(name => {
            _tabs[name] = _tabTexts[name].split('/').map(x => x.trim().split(' '))
            
        })      
        log(_tabs)  
    }

    var loadKits = function (callback) {
        log(TAG+': loadKits')
        _onBufferLoadCallback = callback
        getKitNames().forEach(name => {
            var keys = Object.keys(_instruments[name].keys)
            var urls = {}
            keys.forEach(x => { 
                urls[x] = sound_file = soundFilePath +
                   '/' + (x == hoshoKey ? hoshoKitName : name) +
                   '_' + x + soundFileExt 
            })
            _kits[name] = new Tone.MultiPlayer({ urls : urls }).toMaster()
        })
        log(_kits) 
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

    var showKit  = function(name) {
        if (!_ctx) return
        if (name) {
            if (_kitImage && name == _kitName) {
                _ctx.drawImage(_kitImage, 0, 0)
            } else {
                _kitName = name
                _kitKeyPaths = getInstrumentPathsForKeys(_kitName)
                _kitImage = new Image()
                _kitImage.onload = function() {
                    _ctx.clearRect(0, 0, _canvas.width, _canvas.height)
                    _ctx.drawImage(_kitImage, 0, 0)
                }
                _kitImage.src = './images/'+getInstrumentImageFileName(_kitName)
            }
        } else {
            _ctx.clearRect(0, 0, _canvas.width, _canvas.height)
        }
    }

    var showKeys = function(keys) {
        keys.forEach(x=> {
            showKey(x)
        })
    }
    var showKey  =function(key) {
        var p = _kitKeyPaths[key]
        if (p) {
            _ctx.fillStyle = 'rgb(50, 50, 50)'
            _ctx.fill(p)
            fadeOutPath(p, 50, 50, 50)
        }
    }    

    var fadeOutPath = function(p, r, g, b) {
        var steps = 5,
            dr = (200 - r) / steps,
            dg = (200 - g) / steps,
            db = (200 - b) / steps,
            i = 0,
            interval = setInterval(function() {
                _ctx.fillStyle = 'rgb(' + Math.round(r + dr * i) + ','
                                       + Math.round(g + dg * i) + ','
                                       + Math.round(b + db * i) + ')';
                _ctx.fill(p);
                if(i++ > steps) {
                    clearInterval(interval);
                }
            }, 30);
    }

    var schedulePlayer = function(options) {
        log(TAG+': schedulePlayer')
        log(options)
        var kit = options.kit
        var tab = options.tab
        var tempo = options.tempo
        var start = options.start
        var onKeysPlayed = options.callback
        var tab_index = 0
        if (_schedule != null) {
            Tone.Transport.clear(_schedule)
        }
        _schedule = Tone.Transport.scheduleRepeat(function(time){
            if (tab_index == tab.length) tab_index = 0
            showKit() 
            var keys = tab[tab_index]
            if (onKeysPlayed) onKeysPlayed(keys)
            showKeys(keys)
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
    }

    var load = function(options, callbackReady) { 
        log(TAG+': load: options=' + options)
        log(options)
        options = options || {}
        if (options.kitName) {
            showKit(options.kitName)
        }
        if (options.tabName) {
            schedulePlayer({
                kit: _kits[options.kitName],
                tab: _tabs[options.tabName], 
                tempo: options.tempo || "8n", // 8th of a note
                start: options.start || "1m", // one measure 
                callback: options.onKeysPlayed
            })
            // ready to play
            if (callbackReady) callbackReady();
        }
    }

    var start = function() { 
        Tone.Transport.start() 
    }

    var stop = function() { 
        Tone.Transport.stop(); 
        showKit() 
    }
    
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