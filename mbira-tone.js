/* mbira-tone.js
 * (C) Murat Gungoraydinoglu
 * requires jquery.js
 * requires tone.js
 */
var MbiraTone = function(onReadyCallback){
    const TAG = 'MbiraTone'
    const DEBUG = true

    const INSTRUMENT_FILE_PATH = './instruments.json'
    const SOUND_FILE_DIR = './sounds'
    const SOUND_FILE_EXT = '.mp3'
    const HOSHO_KIT_NAME = 'hosho'
    const HOSHO_KEY_CODE = 'X'

    const log = function (s) { if(DEBUG && console && console.log) console.log(s) }
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
        'nyamaropa_kushaura' : `
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R4 / L2 / R3 B4 / /
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R2 / L4 / R4 B5 / /
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R5 L3 / B3 / R5 / L4 / R4 B5 / /
            R3 L4 / B7 / R3 / L4 / R3 B7 / / R5 L3 / B3 / R5 / L4 / R4 B5 /
        `,
        'shumba kushaura 1':`
            B5 / X R4 R1 L2 / / R4 R1 B5 / X L2 / R4 R1 / B2 / X R3 L4 / / R2 B2 / X B1 / R2 /
            B5 / X R4 R1 L2 / / R4 R1 B5 / X L2 / R4 R1 / B4 / X R4 L5 / / R2 B2 / X B1 / R2 /
            B3 / X R5 R2 L3 / / R5 R2 B3 / X L3 / R5 R2 / B4 / X R4 L5 / / R3 B4 / X L7 / R3 /
            B3 / X    R2 L3 / / R9    B3 / X L3 / R9    / B5 / X R8 B5 / / R7 B4 / X B3 / R5
        `
    }

    var _canvas = $('#mbira-instrument')[0]
    var _ctx = _canvas && _canvas.getContext('2d')
    var _kitName //current kit name
    var _kitKeyPaths //current kits key paths
    var _kitImage //current mbira image

    var getInstrumentImageFileName = function(name) {
        if (_instruments && _instruments[name])
            return _instruments[name].image
    }

    var getInstrumentPathsForKeys = function(name) {
        if (_instruments && _instruments[name]) {
            return _instruments[name].keys
        }
    }

    var loadTabs = function () {
        getTabNames().forEach(name => {
            _tabs[name] = _tabTexts[name].split('/').map(x => x.trim().split(' '))
        })
    }

    var loadKitSamples = function (onLoadedCallback) {
        _onBufferLoadCallback = onLoadedCallback
        getKitNames().forEach(name => {
            var keys = Object.keys(_instruments[name].keys)
            var urls = {}
            keys.forEach(x => {
                urls[x] = SOUND_FILE_DIR +
                   '/' + (x == HOSHO_KEY_CODE ? HOSHO_KIT_NAME : name) +
                   '_' + x + SOUND_FILE_EXT
            })
            _kits[name] = new Tone.MultiPlayer({ urls : urls }).toMaster()
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

    var showKit  = function(name) {
        if (!_ctx) return
        name = name || _kitName
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
        var tempo = options.tempo
        var start = options.start
        var onKeysPlayedCallback = options.onKeysPlayedCallback
        var tab_index = 0
        if (_schedule != null) {
            Tone.Transport.clear(_schedule)
        }
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
        if (options.kitName) {
            showKit(options.kitName)
        }
        if (options.kitName && options.tabName) {
            schedulePlayer({
                kit: _kits[options.kitName],
                tab: _tabs[options.tabName],
                tempo: options.tempo || "8n", // 8th of a note
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

    module.getKitNames = getKitNames
    module.getTabNames = getTabNames
    module.getInstrumentImageFileName = getInstrumentImageFileName
    module.getInstrumentPathsForKeys = getInstrumentPathsForKeys
    module.load = load
    module.start = start
    module.stop = stop
    module.initialized = false

    initialize()

    return module
}
