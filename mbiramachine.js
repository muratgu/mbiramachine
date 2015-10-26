
var DEBUG = true
var debugWarning = false

function log(msg) {
    if (!debugWarning) {
        console.log('DEBUG is ' + (DEBUG ? 'on' : 'off'))
        debugWarning = true
    }
    if (DEBUG) {
        console.log(msg)
    }
}

if (!window.hasOwnProperty('AudioContext') && window.hasOwnProperty('webkitAudioContext'))
    window.AudioContext = webkitAudioContext

var keyCodes = [
    'X','X2','X3',
    'R1','R2','R3','R4','R5','R6','R7','R8','R9','R10','R11',
    'L1','L2','L3','L4','L5','L6','L7','L8',
    'B1','B2','B3','B4','B5','B6','B7','B8',
    ]


var effectOptions = [
    // Impulse responses - each one represents a unique linear effect.
    {'name':'No Effect', 'url':'undefined', 'isLoaded': 'true', 'dryMix':1, 'wetMix':0},
    {'name':'Spring Reverb', 'url':'impulse-responses/feedback-spring.wav',     'dryMix':1, 'wetMix':1},
    {'name':'Space Oddity', 'url':'impulse-responses/filter-rhythm3.wav',       'dryMix':1, 'wetMix':0.7},
    {'name':'Telephone Filter', 'url':'impulse-responses/filter-telephone.wav', 'dryMix':0, 'wetMix':1.2},
    {'name':'Lopass Filter', 'url':'impulse-responses/filter-lopass160.wav',    'dryMix':0, 'wetMix':0.5},
    {'name':'Cosmic Ping', 'url':'impulse-responses/cosmic-ping-long.wav',      'dryMix':0, 'wetMix':0.9},
    {'name':'Kitchen', 'url':'impulse-responses/kitchen-true-stereo.wav', 'dryMix':1, 'wetMix':1},
    {'name':'Cinema Room', 'url':'impulse-responses/cinema-room.wav', 'dryMix':1, 'wetMix':1},
    {'name':'Living-Bedroom', 'url':'impulse-responses/living-bedroom-leveled.wav', 'dryMix':1, 'wetMix':1},
    {'name':'Dining Room', 'url':'impulse-responses/dining-room.wav', 'dryMix':1, 'wetMix':1},
    {'name':'Medium Hall 1', 'url':'impulse-responses/matrix-reverb2.wav',      'dryMix':1, 'wetMix':1},
    {'name':'Medium Hall 2', 'url':'impulse-responses/matrix-reverb3.wav',      'dryMix':1, 'wetMix':1},
    {'name':'Large Hall', 'url':'impulse-responses/spatialized4.wav',           'dryMix':1, 'wetMix':0.5},
    {'name':'Peculiar', 'url':'impulse-responses/peculiar-backwards.wav',       'dryMix':1, 'wetMix':1},
    {'name':'Backslap', 'url':'impulse-responses/backslap1.wav',                'dryMix':1, 'wetMix':1},
    {'name':'Warehouse', 'url':'impulse-responses/cardiod-rear-levelled.wav', 'dryMix':1, 'wetMix':1},
    {'name':'Diffusor', 'url':'impulse-responses/diffusor3.wav',                'dryMix':1, 'wetMix':1},
    {'name':'Binaural Hall', 'url':'impulse-responses/s2_r4_bd.wav',   'dryMix':1, 'wetMix':0.5},
    {'name':'Huge', 'url':'impulse-responses/matrix-reverb6.wav',               'dryMix':1, 'wetMix':0.7},
]

var kitOptions= [ 
    { name: 'nyamaropa_b' }, 
    { name: 'gandanga_b' }, 
    { name: 'dambatsoko_e' },
]

var timeoutId

var effectList
var kitList
var beatList

var theBeat
var currentKit

var NUM_LED = 6
var kMinTempo = 30
var kMaxTempo = 120
var kMaxSwing = .08
var noteTime = 0.0
var tabIndex = 0
var effectDryMix = 1.0
var effectWetMix = 1.0

var leftKeyPan = -4.0
var rightKeyPan = 4.0
var hoshoKeyPan = 0.0

var convolver
var compressor
var masterGainNode
var effectLevelNode
var startTime
var lastDrawTime = -1

var mouseCapture = null;
var mouseCaptureOffset = 0;

function Beat(options) {
    this.name = options.name
    this.defaultKitName = options.kitName
    this.pitch = options.pitch || 0
    this.volume = options.volume || 1.0  
    this.tempo = options.tempo || 60
    this.swingFactor = options.swingFactor || 0
    this.effectMix = options.effectMix || 0.5
    this.tab = options.tab || []

    Beat.prototype.setTab = function (tab) {
        this.tab = tab;
        return this;
    }

    Beat.prototype.load = function () {
        onBeatLoaded(this);
        return this;
    }
}

function Kit(options) {
    this.name = options.name
    this.pathName = 'sounds/' 
    this.buffer = {}
    this.pitch = options.pitch || 0
    this.startedLoading = false
    this.isLoaded = false
    this.keys = options.keys || keyCodes
    this.keyLoadCount = 0
    
    Kit.prototype.areAllKeysLoaded = function () {
        return this.keyLoadCount == this.keys.length
    }

    Kit.prototype.load = function() {
        if (this.startedLoading) { return }
            
        this.startedLoading = true

        for(var i in this.keys) {
            this.loadKey(this.keys[i], false)  
        }
    }

    Kit.prototype.loadKey = function(keyCode, mixToMono) {
        var url = this.pathName + this.name + '_' + keyCode + '.mp3'    
        if (keyCode[0] == 'X') { // hosho beats are shared
            url = this.pathName + 'hosho_' + keyCode + '.mp3';
        }
        var request = new XMLHttpRequest()
        request.open('GET', url, true)
        request.responseType = 'arraybuffer'
        var kit = this
        request.onload = function() {
            context.decodeAudioData(
                request.response,
                function(buffer) { // success
                    kit.buffer[keyCode] = buffer
                    onKitKeyLoaded(kit, keyCode)                    
                },            
                function(buffer) { // error
                    log('kit key missing: ' + keyCode)
                    kit.buffer[keyCode] = 0
                    onKitKeyLoaded(kit, keyCode) 
                }
            )
        }
        request.send()
    }
}

function onKitKeyLoaded(kit, keyCode) {
    log('onKitKeyLoaded: key=' +keyCode)
    
    kit.keyLoadCount++
    if (kit.areAllKeysLoaded()) {
        onKitLoaded(kit)
    }
}

function onKitLoaded(kit) {
    log('onKitLoaded: name=' +kit.name)

    kit.isLoaded = true     
    addToKitList(kit)                   
    showPlayAvailable()    
}

function addToKitList(kit) {
    log('addToKitList: name=' + kit.name)

    var elList = document.getElementById('kitlist')   
    var elItem = document.createElement('li')
    elItem.innerHTML = kit.name
    elList.appendChild(elItem)
    elItem.addEventListener('mousedown', handleKitMouseDown, true)
}

function onBeatLoaded(beat) {
    log('onBeatLoaded: name=' +beat.name)

    beat.isLoaded = true     
    addToBeatList(beat)                   
}

function addToBeatList(beat) {
    log('addToBeatList: name=' + beat.name)
    
    var elList = document.getElementById('beatlist')
    var elItem = document.createElement('li')
    elItem.innerHTML = beat.name
    elList.appendChild(elItem)
    elItem.addEventListener('mousedown', handleBeatMouseDown, true)
}

function addToEffectList(effect) {
    log('addToEffectList: name=' + effect.name)
    
    var elList = document.getElementById('effectlist')
    var elItem = document.createElement('li')
    elItem.innerHTML = effect.name
    elList.appendChild(elItem)
    elItem.addEventListener('mousedown', handleEffectMouseDown, true)
}

function Effect(options) {
    log('Effect: name=' +options.name)

    this.name = options.name
    this.url = options.url
    this.startedLoading = false
    this.isLoaded_ = options.isLoaded
    this.dryMix = options.dryMix;
    this.wetMix = options.wetMix;
    this.buffer = 0
}

Effect.prototype.isLoaded = function() {
    return this.isLoaded_
}

Effect.prototype.load = function() {
    log('Effect.load: name=' +this.name)

    if (this.startedLoading) { return }
    
    this.startedLoading = true

    var request = new XMLHttpRequest()
    request.open('GET', this.url, true)
    request.responseType = 'arraybuffer'
    this.request = request
    
    var asset = this

    request.onload = function() {
        context.decodeAudioData(
            request.response,
            function(buffer) { onEffectLoaded(asset, buffer) },            
            function(buffer) { onEffectLoadFailed(asset) }
        );
    }

    request.send()
}

function onEffectLoaded(effect, buffer) {
    log('onEffectLoaded: name=' +effect.name)

    effect.buffer = buffer
    effect.isLoaded_ = true
    addToEffectList(effect)
}

function onEffectLoadFailed(effect) {
    log('onEffectLoadFailed: name=' +effect.name) 
    throw Error('onEffectLoadFailed: name=' +effect.name)        
}

function initBeatList() {
    log('initBeatList')

    beatList = [
    new Beat({ 
        name: 'nhemamusasa kushaura', 
        tab: [
        'L3 X3','R2 X','B3 X2','R5 X3','L4 X','R2 X2','B5 X3','R4 X','L4 X2','R3 X3','B7 X','R5 X2',
        'L3 X3','R2 X','B3 X2','R5 X3','L5 X','R3 X2','B6 X3','R5 X','L4 X2','R3 X3','B7 X','R6 X2',
        'L2 X3','R3 X','B4 X2','R6 X3','L5 X','R3 X2','B6 X3','R5 X','L4 X2','R3 X3','B7 X','R5 X2',
        'L3 X3','R2 X','B3 X2','R5 X3','L4 X','R2 X2','B5 X3','R4 X','L2 X2','R2 X3','L1 X','R5 X2'
        ]}),
    new Beat({ 
        name: 'karigamombe kushaura',
        tab: [
        'R2 L1','R6','R2 L2','R6','R1 L5','R4','R1 L5','R4','R1 L4','R4','R1 L4','R4',
        'R2 L1','R6','R2 L2','R6','R2 L3','R5','R2 L3','R5','R1 L4','R4','R1 L4','R4',
        'R3 L4','R5','R3 L4','R5','R2 L3','R5','R2 L3','R5','R1 L4','R4','R1 L4','R4',
        'R2 L1','R6','R2 L2','R6','R1 L5','R4','R1 L5','R4','R3 L2','R6','R3 L2','R6'
        ]}),
    new Beat({ 
        name: 'karigamombe kutsinhira',
        tab: [
        'R2','L1','R6 B1','','R4 R1 B6','L2','R4 R1','L1','R7 B5'   ,'','R7 L1','L5',
        'R2','L1','R6 B4','','R5 B6'   ,'B5','R5'   ,'L1','R4 R1 B2','','R4 R1','B2',
        'R3','B5','R3 B1','','R5 B6'   ,'B5','R5'   ,'L1','R4 R1 B2','','R4 R1','B2',
        'R2','B4','R2 B1','','R4 R1 B6','B2','R4 R1','B6','R3 B4'   ,'','R3 B7','B4'
        ]}),
    new Beat({ 
        name: 'kuzanga variation 5',
        tab: [
        'R5 L3','B3','R5','L4','R2 B5','R4','L4','R3 B1','',
        'R5 L3','B3','R5','L5','R3 B6','R5','L4','R3 B1','',
        'R6 L2','B4','R6','L5','R3 B6','R6','L2','R2 B1','',
        'R4 L2','B4','R4','L4','R2 B5','R4','L2','R2 B1',''
        ]}),
    new Beat({ 
        name: 'kuzanga variation 5 kutsinhira',
        tab: [
        '','R5 L3','B3','R5','L4','R2 B5','R4','L4','R3 B1',
        '','R5 L3','B3','R5','L5','R3 B6','R5','L4','R3 B1',
        '','R6 L2','B4','R6','L5','R3 B6','R6','L2','R2 B1',
        '','R4 L2','B4','R4','L4','R2 B5','R4','L2','R2 B1'
        ]}),
    new Beat({ 
        name: 'nyamaropa kushaura',
        tab: [
        'R2 L1','B1','R2','L1','R2 B1','','R4 L5','B2','R4','L2','R3 B4', '',
        'R2 L1','B1','R2','L1','R2 B1','','R4 L5','B2','R2','L4','R4 B5', '',
        'R2 L1','B1','R2','L1','R2 B1','','R5 L3','B3','R5','L4','R4 B5', '',
        'R3 L4','B7','R3','L4','R3 B7','','R5 L3','B3','R5','L4','R4 B5', ''
        ]}),
    new Beat({ 
        name: 'nyamaropa kutsinhira',
        tab: [
        '','R2 L1','B1','R2','L1','R2 B1','','R4 L5','B2','R4','L2','R3 B4', 
        '','R2 L1','B1','R2','L1','R2 B1','','R4 L5','B2','R2','L4','R4 B5', 
        '','R2 L1','B1','R2','L1','R2 B1','','R5 L3','B3','R5','L4','R4 B5', 
        '','R3 L4','B7','R3','L4','R3 B7','','R5 L3','B3','R5','L4','R4 B5' 
        ]}),
    new Beat({ 
        name: 'mahororo kushaura',
        tab: [
        'L2','X','R2','','R1 R4 X','','L4','X','R2','','R1 R4 X','', 
        'L2','X','R2','','L3 R5 X','','L4','X','R2','','R1 R4 X','', 
        'L4','X','R3','','L3 R5 X','','L4','X','R2','','R1 R4 X','', 
        'L2','X','R2','','R1 R4 X','','L2','X','R3','','R1 R4 X','', 
        ]}),
    new Beat({ 
        name: 'shumba kushaura 1',
        tab: [
        'B5','X R4 R1 L2','','R4 R1 B5','X L2','R4 R1','B2','X R3 L4','','R2 B2','X B1','R2', 
        'B5','X R4 R1 L2','','R4 R1 B5','X L2','R4 R1','B4','X R4 L5','','R2 B2','X B1','R2', 
        'B3','X R5 R2 L3','','R5 R2 B3','X L3','R5 R2','B4','X R4 L5','','R3 B4','X L7','R3', 
        'B3','X    R2 L3','','R9    B3','X L3','R9'   ,'B5','X R8 B5','','R7 B4','X B3','R5', 
        ]}),
    new Beat({ 
        name: 'chamunika basic',
        tab: [
        'R6 R2 L2','X L1','R6 R2','L2','X R6 R2 B4','','R5 R2 L3','X R5 R2 B3','','R4 R1 L4','X B5','', 
        'R3 L4'   ,'X B7','R3'   ,'L4','X R3 B5'   ,'','R2 L3'   ,'X R2 B3'   ,'','R4 R1 L4','X B5','', 
        'R6 R2 L2','X L1','R6 R2','L2','X R6 R2 B4','','R4 R1 L5','X B6'      ,'','R3 L2'   ,'X B4','', 
        'R2 L2'   ,'X L1','R2'   ,'L2','X R2 B4'   ,'','R4 R1 L5','X L6'      ,'','R4 R1 L4','X B5','', 
        ]})
    ]
}

function initEffectList(){
    log('initEffectList')

    effectList = []

    for (i = 0; i < effectOptions.length; i++) {
        effectList[i] = new Effect(effectOptions[i])
    }
}

function initKitList(){
    log('initKitList')
    
    kitList = []

    for (i = 0; i < kitOptions.length; i++) {
        kitList[i] = new Kit(kitOptions[i])
        kitList[i].load()
    } 
}

function startLoadingBeats(){
    log('startLoadingBeats')

    for (i = 0; i < beatList.length; i++) {
        beatList[i].load()
    } 
}

function startLoadingKits(){
    log('startLoadingKits')
    
    for (i = 0; i < kitList.length; i++) {
        kitList[i].load()
    } 
}

function startLoadingEffects(){
    log('startLoadingEffects')

    // Start at 1 to skip 'No Effect'
    for (i = 1; i < effectList.length; i++) {
        effectList[i].load()
    } 
}

function startLoadingAssets(){
    log('startLoadingAssets')

    initKitList()
    initEffectList()    
    initBeatList()

    startLoadingKits()
    startLoadingEffects()     
    startLoadingBeats()
}

function init() {
    log('init')

    startLoadingAssets()
    
    context = new AudioContext()

    var finalMixNode;
    if (context.createDynamicsCompressor) {
        // Create a dynamics compressor to sweeten the overall mix.
        compressor = context.createDynamicsCompressor()
        compressor.connect(context.destination)
        finalMixNode = compressor
    } else {
        // No compressor available in this implementation.
        finalMixNode = context.destination
    }

    // Create master volume.
    masterGainNode = context.createGain()
    masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
    masterGainNode.connect(finalMixNode)

    // Create effect volume.
    effectLevelNode = context.createGain()
    effectLevelNode.gain.value = 1.0; // effect level slider controls this
    effectLevelNode.connect(masterGainNode)

    // Create convolver for effect
    convolver = context.createConvolver()
    convolver.connect(effectLevelNode)

    selectBeat()
    
    initControls();
}

function initControls() {
    // sliders
    var effect_slider = document.getElementById('effect_slider')
    effect_slider.addEventListener('input', function(e) {
        setEffectLevel(effect_slider.value / 100.0)
    })

    // tool buttons
    document.getElementById('play').addEventListener('mousedown', startPlay, true)
    document.getElementById('stop').addEventListener('mousedown', stopPlay, true)
    document.getElementById('beatcombo').addEventListener('mousedown', handleBeatComboMouseDown, true)
    document.getElementById('kitcombo').addEventListener('mousedown', handleKitComboMouseDown, true)
    document.getElementById('effectcombo').addEventListener('mousedown', handleEffectComboMouseDown, true)
    document.getElementById('tempoinc').addEventListener('mousedown', increaseTempo, true)
    document.getElementById('tempodec').addEventListener('mousedown', decreaseTempo, true)
    
    document.body.addEventListener('mousedown', handleBodyMouseDown, true)
}

function advanceNote() {
    var secondsPerBeat = 60.0 / theBeat.tempo

    tabIndex++;
    if (tabIndex == theBeat.tab.length) {
        tabIndex = 0
    }

    // apply swing    
    if (tabIndex % 3) {
        noteTime += (0.25 + kMaxSwing * theBeat.swingFactor) * secondsPerBeat
    } else {
        noteTime += (0.25 - kMaxSwing * theBeat.swingFactor) * secondsPerBeat
    }
}

function playNote(buffer, sendGain, mainGain, playbackRate, noteTime, panX) {
    if (!buffer) return

    // Create the note
    var voice = context.createBufferSource()
    voice.buffer = buffer
    voice.playbackRate.value = playbackRate

    var panner = context.createPanner();
    panner.setPosition(panX, 0.0, 0.0);
    voice.connect(panner);

    var finalNode = panner;
   
    // Connect to dry mix
    var dryGainNode = context.createGain()
    dryGainNode.gain.value = mainGain * effectDryMix
    finalNode.connect(dryGainNode)
    dryGainNode.connect(masterGainNode)

    // Connect to wet mix
    var wetGainNode = context.createGain()
    wetGainNode.gain.value = sendGain
    finalNode.connect(wetGainNode)
    wetGainNode.connect(convolver)

    voice.start(noteTime)
}

function schedule() {
    var currentTime = context.currentTime

    // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
    currentTime -= startTime

    while (noteTime < currentTime + 0.200) {
        // Convert noteTime to context time.
        var contextPlayTime = noteTime + startTime
            if(theBeat && theBeat.tab[tabIndex]) {
                var currentBufferCode = theBeat.tab[tabIndex].split(' ')
                for(var c in currentBufferCode) {
                    var keyCode = currentBufferCode[c]
                    if(keyCode > '') {
                        playNote(currentKit.buffer[keyCode], 1.0, theBeat.volume, theBeat.pitch, contextPlayTime, 
                            getBeatPanX(keyCode))
                    }
                }
            }

        // Attempt to synchronize drawing time with sound
        if (noteTime != lastDrawTime) {
            lastDrawTime = noteTime;
            drawPlayhead((tabIndex+NUM_LED-1) % NUM_LED)
        }

        advanceNote()
    }

    timeoutId = setTimeout('schedule()', 0)
}

function getBeatPanX(keyCode) {
    if (keyCode[0] == 'L' || keyCode[0] == 'B') { return leftKeyPan; }
    if (keyCode[0] == 'R') { return rightKeyPan; }
    if (keyCode[0] == 'X') { return hoshoKeyPan; }
    return 0.0 // no pan
}

function selectTempo(value) {
    log('selectTempo: value= ' +value)

    theBeat.tempo = Math.min(kMaxTempo, Math.max(kMinTempo, value));
    document.getElementById('tempo').innerHTML = theBeat.tempo
}

function increaseTempo() {
    selectTempo(theBeat.tempo + 1)
}

function decreaseTempo() {
    selectTempo(theBeat.tempo - 1)
}

function selectBeat(name) {
    log('selectBeat: ' + name)

    stopPlay() // the beat has changed

    var beat = getBeatByName(name)

    if (!beat) { alert ('Beat not found: ' + name); return }

    log('selected beat: ' +beat.name)

    theBeat = beat

    selectKit(theBeat.defaultKitName)
    selectEffect(theBeat.defaultEffectName)
    selectEffectLevel(theBeat.effectMix)  
    selectTempo(theBeat.tempo)

    showPlayAvailable()

    document.getElementById('beatname').innerHTML = theBeat.name
}

function selectKit(name) {
    log('selectKit: ' +name)

    var kit = getKitByName(name)

    if (!kit) { alert('kit ' +name+ ' not found!'); return }

    log('selected kit: ' +kit.name)

    currentKit = kit   

    document.getElementById('kitname').innerHTML = currentKit.name
}

function selectEffect(name) {
    log('selectEffect: ' + name)

    var effect = getEffectByName(name)
    
    if (!effect) { alert('Effect not found: ' +name); return }
    
    if (!effect.isLoaded()) { alert('Effect ' +name+ ' still loading'); return }

    log('selected effect: ' +effect.name)

    // the 'no effect' has no buffer
    if (effect.buffer) {        
        convolver.buffer = effect.buffer
    }

    effectDryMix = effect.dryMix
    effectWetMix = effect.wetMix

    if (theBeat) {
        theBeat.effect = effect
        // since they just explicitly chose an effect from the list.
        if (theBeat.effectMix == 0) 
            theBeat.effectMix = 0.5

        // Hack - if the effect is meant to be entirely wet (not unprocessed signal)
        // then put the effect level all the way up.
        if (effectDryMix == 0) 
            theBeat.effectMix = 1

        selectEffectLevel(theBeat.effectMix)
    }

    document.getElementById('effectname').innerHTML = effect.name
}

function selectEffectLevel(value) {
    document.getElementById('effect_slider').value = value * 100;
    setEffectLevel(value);
}

function setEffectLevel(value) {
    if (!theBeat) { log('No beat'); return }

    theBeat.effectMix = value;
    // Factor in both the preset's effect level and the blending level (effectWetMix) stored in the effect itself.
    effectLevelNode.gain.value = theBeat.effectMix * effectWetMix;  
}

function getBeatByName(name) {
    // return the first one if no name specified
    if (!name && beatList.length > 0) {
        return beatList[0]
    }
    for (i = 0; i < beatList.length; i++) {
        if (beatList[i].name === name) {
            return beatList[i]
        }
    } 
}

function getKitByName(name) {
    // return the first one if no name specified
    if (!name && kitList.length > 0) {
        return kitList[0]
    }
    for (i = 0; i < kitList.length; i++) {
        if (kitList[i].name === name) {
            return kitList[i]
        }
    } 
}

function getEffectByName(name) {    
    // return the first one if no name specified
    if (!name && effectList.length > 0) {
        return effectList[0]
    }

    for (i = 1; i < effectList.length; i++) {
        if (effectList[i].name === name) {
            return effectList[i]
        }
    } 
}

function startPlay() {
    log('startPlay')

    noteTime = 0.0
    startTime = context.currentTime + 0.005
    schedule();

    document.getElementById('play').classList.add('playing')
    document.getElementById('stop').classList.add('playing')
}

function stopPlay() {
    log('stopPlay')

    if (timeoutId) {
        clearTimeout(timeoutId)
    }        

    // turn off the LED
    var elOld = document.getElementById('LED_' + (tabIndex+NUM_LED-2) % NUM_LED)
    if(elOld) {
        elOld.src = 'images/LED_off.png'
    }

    tabIndex = 0

    document.getElementById('play').classList.remove('playing')
    document.getElementById('stop').classList.remove('playing')
}

function drawPlayhead(xindex) {
    var lastIndex = (xindex+NUM_LED-1) % NUM_LED

    var elNew = document.getElementById('LED_' + xindex)
    var elOld = document.getElementById('LED_' + lastIndex)
    
    elNew.src = 'images/LED_on.png'
    elOld.src = 'images/LED_off.png'
}

function handleBodyMouseDown(event) {
    var elBeatcombo = document.getElementById('beatcombo')
    var elKitcombo = document.getElementById('kitcombo')
    var elEffectcombo = document.getElementById('effectcombo')

    if (elBeatcombo.classList.contains('active') && !isDescendantOfId(event.target, 'beatcombo_container')) {
        elBeatcombo.classList.remove('active')
        if ( !isDescendantOfId(event.target, 'effectcombo_container') 
            && !isDescendantOfId(event.target, 'kitcombo_container') ) {
            event.stopPropagation()
        }
    }

    if (elKitcombo.classList.contains('active') && !isDescendantOfId(event.target, 'kitcombo_container')) {
        elKitcombo.classList.remove('active')
        if ( !isDescendantOfId(event.target, 'effectcombo_container') 
            && !isDescendantOfId(event.target, 'beatcombo_container') ) {
            event.stopPropagation()
        }
    }
    
    if (elEffectcombo.classList.contains('active') && !isDescendantOfId(event.target, 'effectcombo_container')) {
        elEffectcombo.classList.remove('active')
        if ( !isDescendantOfId(event.target, 'kitcombo_container') 
            && !isDescendantOfId(event.target, 'beatcombo_container') ) {
            event.stopPropagation()
        }
    }    
}

function isDescendantOfId(el, id) {
    if (!el.parentElement) { return false }
    if (el.parentElement.id == id) { return true }
    return isDescendantOfId(el.parentElement, id)
}

function handleBeatMouseDown(event) {
    var name = event.target.innerHTML
    selectBeat(name)
}

function handleKitMouseDown(event) {
    var name = event.target.innerHTML
    selectKit(name)
}

function handleEffectMouseDown(event) {
    var name = event.target.innerHTML
    selectEffect(name)
}

function handleBeatComboMouseDown(event) {
    document.getElementById('beatcombo').classList.toggle('active')
}

function handleKitComboMouseDown(event) {
    document.getElementById('kitcombo').classList.toggle('active')
}

function handleEffectComboMouseDown(event) {
    document.getElementById('effectcombo').classList.toggle('active')
}


function showPlayAvailable() {
    log('showPlayAvailable')

    if (!theBeat) { return }

    var play = document.getElementById('play')
    play.src = 'images/btn_play.png'
}

function startDemo() {
    log('startDemo')
    
    showPlayAvailable()
    //startPlay();
}

window.onload = function(){
    log('onLoad')

    init()
}
