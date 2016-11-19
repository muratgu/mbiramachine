/* mbira-tone.js 
 * (C) Murat Gungoraydinoglu
 * requires jquery.js
 * requires tone.js
 */
var MbiraTone = function(parent){
    var TAG = 'MbiraTone'
    var DEBUG = parent && parent.DEBUG 
    var module = {}
    var soundFilePath = './sounds'
    var soundFileExt = '.mp3'
    var hoshoKitName = 'hosho'
    var hoshoKey = 'X'


    var log = function (s) { 
        if(DEBUG && console && console.log) console.log(s) 
    }
    var error = function (s, e) { 
        if (console && console.log) console.log(s); console.log(e) 
    }

    parent.log = log
    parent.error = error

    log(TAG+': module initializing')

    var tabTexts = {
        'nyamaropa_kushaura' : `
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R4 / L2 / R3 B4 / /
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R4 L5 / B2 / R2 / L4 / R4 B5 / /
            R2 L1 / B1 / R2 / L1 / R2 B1 / / R5 L3 / B3 / R5 / L4 / R4 B5 / /
            R3 L4 / B7 / R3 / L4 / R3 B7 / / R5 L3 / B3 / R5 / L4 / R4 B5 / 
            `
    }
    
    var kits = { }

    var tabs = { }

    // define flatMap is missing
    if (!Array.prototype.flatMap) {
        Array.prototype.flatMap = function(lambda) { 
        return Array.prototype.concat.apply([], this.map(lambda)); 
        }
    }

    var isUnique = function (value, index, self) { 
        return self.indexOf(value) === index;
    }

    var loadTab = function (tabName) {
        log(TAG+': loadTab: tabName='+tabName)
        if (!tabs[tabName]) {
            var tabText = tabTexts[tabName]
            if (!tabText) {
                throw new Error('unknown tab name='+tabName)
            }
            tabs[tabName] = tabText.split('/').map(x => x.trim().split(' '))
        }
        return tabs[tabName]
    }

    var loadKit = function (kitName) {
        log(TAG+': loadKit: kitName='+kitName)
        if (!kits[kitName]) {
            var keys = [
                'X','R1','R2','R3','R4','R5','R6','R7','R8',
                   ,'L1','L2','L3','L4','L5','L6','L7','L8',
               'B0','B1','B2','B3','B4','B5','B6','B7','B8',                
            ]
            var urls = {}
            keys.forEach(x => { 
                urls[x] = sound_file = soundFilePath +
                   '/' + (x == hoshoKey ? hoshoKitName : kitName) +
                   '_' + x + soundFileExt 
            })
            kits[kitName] = new Tone.MultiPlayer({ urls : urls }).toMaster();
        }
        return kits[kitName]
    }
    

    var schedulePlayer = function(kit, tab, tempo, start, onKeysPlayed) {
        log(TAG+': schedulePlayer, tempo='+tempo+', start='+start)
        var tab_index = 0
        Tone.Transport.scheduleRepeat(function(time){
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
    }

    var load = function(options, callback) { 
        log(TAG+': load: options=' + options)
        log(options)
        options = options || {}
        var tabName = options.tabName || 'nyamaropa_kushaura'
        var kitName = options.kitName || 'dambatsoko_e'
        var tempo = options.tempo || "8n" // 8th of a note
        var start = options.start || "1m" // one measure        
        module.onBufferLoadCallback = callback
        var tab = loadTab(tabName)
        var kit = loadKit(kitName)
        schedulePlayer(kit, tab, tempo, start, options.onKeysPlayed)
    }

    var start = function() { Tone.Transport.start() }
    var stop = function() { Tone.Transport.stop() }
    
    Tone.Buffer.on('load', function(){
        log(TAG+': Tone.Buffer.onload')
        if (module.onBufferLoadCallback) module.onBufferLoadCallback() 
    })

    module.onBufferLoadCallback = null
    module.load = load
    module.start = start
    module.stop = stop
    
    log(TAG+': module initialized')

    return module
}