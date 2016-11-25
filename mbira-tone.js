/* mbira-tone.js
 * (C) Murat Gungoraydinoglu
 * requires jquery.js
 * requires tone.js
 */
var MbiraTone = function(onReadyCallback){
    const TAG = 'MbiraTone'
    const DEBUG = true
    var debugWarned = false

    const INSTRUMENT_FILE_PATH = './instruments.json'
    const SOUND_FILE_DIR = './sounds'
    const SOUND_FILE_EXT = '.mp3'
    const HOSHO_KIT_ID = 'hosho'
    const HOSHO_KEY_CODE = 'X'
    const TEMPO_RELATIVE = "8n"

    const log = function (s) {
        if (!console || console.log) return 
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
    var _instruments = null
    var _kits = {}
    var _tabs = {}
    var _onBufferLoadCallback = null
    var _tabTexts = {
        'nyamaropa_kushaura': {
            'name': 'Nyamaropa Kushaura',
            'text': `
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R4 / L2 / R3 B4 / /
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R2 / L4 / R4 B5 / /
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R5 L3 / B3 / R5 / L4 / R4 B5 / /
            R3 L4 / B7 / R3 / L4 / R3 B7 / / R5 L3 / B3 / R5 / L4 / R4 B5 /
        `},
        'shumba kushaura 1': {
            'name': 'Shumba Kushaura 1',
            'text': `
            B5 / X R4 R1 L2 / / R4 R1 B5 / X L2 / R4 R1 / B2 / X R3 L4 / / R2 B2 / X B1 / R2 /
            B5 / X R4 R1 L2 / / R4 R1 B5 / X L2 / R4 R1 / B4 / X R4 L5 / / R2 B2 / X B1 / R2 /
            B3 / X R5 R2 L3 / / R5 R2 B3 / X L3 / R5 R2 / B4 / X R4 L5 / / R3 B4 / X L7 / R3 /
            B3 / X    R2 L3 / / R9    B3 / X L3 / R9    / B5 / X R8 B5 / / R7 B4 / X B3 / R5
        `}
    }    

    var _canvas = $('#mbira-instrument')[0]
    var _ctx = _canvas && _canvas.getContext('2d')
    var _kitId //current kit id
    var _kitKeyPaths //current kits key paths
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
        getTabList().forEach(tab => {
            var id = tab.id
            _tabs[id] = _tabTexts[id].text.split('/').map(x => x.trim().split(' '))
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
    }

    var getTabList = function() {
        if (_tabTexts) {
            return Object.keys(_tabTexts).map(x=> { 
                return {'id': x, 'name': _tabTexts[x].name } 
            })
        }
    }

    var getBpmList = function() {
        var bpms = [ 40, 50, 60, 80, 90, 100, 120 ]
        return bpms.map(x => { 
            return {'id': x, 'name': x+' bpm' } 
        })
    }

    var showKit  = function(id) {
        if (!_ctx) return
        id = id || _kitId
        if (id) {
            if (_kitImage && id == _kitId) {
                _ctx.drawImage(_kitImage, 0, 0)
            } else {
                _kitId = id
                _kitKeyPaths = getInstrumentPathsForKeys(_kitId)
                _kitImage = new Image()
                _kitImage.onload = function() {
                    _ctx.clearRect(0, 0, _canvas.width, _canvas.height)
                    _ctx.drawImage(_kitImage, 0, 0)
                }
                _kitImage.src = './images/'+getInstrumentImageFileName(_kitId)
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
                              : '#ae1fb888')
            var strokeStyle = '#eeeeee88'
            _ctx.beginPath()
            _ctx.strokeStyle = strokeStyle
            _ctx.arc(x, y, r, 0, 2*Math.PI)
            _ctx.stroke()
            _ctx.fillStyle = fillStyle
            _ctx.fill()
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

    Tone.Buffer.on('load', function(){
        if (_onBufferLoadCallback) _onBufferLoadCallback()
    })

    var schedulePlayer = function(options) {
        log(options)
        var kit = options.kit
        var tab = options.tab
        var bpm = options.bpm  
        var tempo = options.tempo // relative to bpm
        var start = options.start
        var onKeysPlayedCallback = options.onKeysPlayedCallback
        var tab_index = 0
        if (_schedule != null) {
            Tone.Transport.clear(_schedule)
        }
        setBpm(bpm)
        _schedule = Tone.Transport.scheduleRepeat(function(time){
            if (tab_index == tab.length) tab_index = 0
            showKit()
            var keys = tab[tab_index]
            if (onKeysPlayedCallback) onKeysPlayedCallback(keys)
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

    var load = function(options, onReadyToPlayCallback) {
        options = options || {}
        if (options.kitId) {
            showKit(options.kitId)
        }
        if (options.kitId && options.tabId) {
            schedulePlayer({
                kit: _kits[options.kitId],
                tab: _tabs[options.tabId],
                bpm: options.bpm || 60,   
                tempo: options.tempo || "8n", // relative to bpm
                start: options.start || "1m", // one measure
                onKeysPlayedCallback: options.onKeysPlayedCallback
            })
            if (onReadyToPlayCallback) onReadyToPlayCallback();
        }
    }

    var start = function() {
        Tone.Transport.start()
    }

    var stop = function() {
        Tone.Transport.stop();
        showKit()
    }

    var setBpm = function(bpm) {
        log('setBpm='+bpm)
        Tone.Transport.bpm.rampTo(bpm, 4);
    }

    var initialize = function() {
      $.getJSON(INSTRUMENT_FILE_PATH, function(result) {
          _instruments = result
          loadTabs()
          loadKitSamples(function(){
              module.initialized = true
              if (onReadyCallback) onReadyCallback()
          })
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
