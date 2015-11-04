(function(window, undefined){     

var DEBUG = false
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
    'X',
    'R1','R2','R3','R4','R5','R6','R7','R8','R9','R10','R11',
    'L1','L2','L3','L4','L5','L6','L7','L8',
    'B1','B2','B3','B4','B5','B6','B7','B8',
    ]

var effectOptions = [
    // Impulse responses - each one represents a unique linear effect.
    { 'name':'No Effect', 'url':'undefined', 'isLoaded': 'true',                 'dryMix':1, 'wetMix':0   },
    { 'name':'Spring Reverb', 'url':'impulse-responses/feedback-spring.wav',     'dryMix':1, 'wetMix':1   },
    { 'name':'Telephone', 'url':'impulse-responses/filter-telephone.wav',        'dryMix':0, 'wetMix':1.2 },
    { 'name':'Lopass', 'url':'impulse-responses/filter-lopass160.wav',           'dryMix':0, 'wetMix':0.5 },
    { 'name':'Kitchen', 'url':'impulse-responses/kitchen-true-stereo.wav',       'dryMix':1, 'wetMix':1   },
    { 'name':'Cinema Room', 'url':'impulse-responses/cinema-room.wav',           'dryMix':1, 'wetMix':1   },
    { 'name':'Living-Bedroom', 'url':'impulse-responses/living-bedroom-leveled.wav', 'dryMix':1, 'wetMix':1 },
    { 'name':'Dining Room', 'url':'impulse-responses/dining-room.wav',           'dryMix':1, 'wetMix':1   },
    { 'name':'Medium Hall', 'url':'impulse-responses/matrix-reverb2.wav',        'dryMix':1, 'wetMix':1   },
    { 'name':'Large Hall', 'url':'impulse-responses/spatialized4.wav',           'dryMix':1, 'wetMix':0.5 },
    { 'name':'Warehouse', 'url':'impulse-responses/cardiod-rear-levelled.wav',   'dryMix':1, 'wetMix':1   },
    { 'name':'Diffuse', 'url':'impulse-responses/diffusor3.wav',                 'dryMix':1, 'wetMix':1   },
    { 'name':'Binaural Hall', 'url':'impulse-responses/s2_r4_bd.wav',            'dryMix':1, 'wetMix':0.5 },
    { 'name':'Huge', 'url':'impulse-responses/matrix-reverb6.wav',               'dryMix':1, 'wetMix':0.7 },
]

var kitOptions = [ 
    { name: 'Nyamaropa_B' }, 
    { name: 'Gandanga_B' }, 
    { name: 'Dambatsoko_E' },
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
    this.id = idealize(this.name)

    log('Beat: name=' +this.name)
    log('Beat: id=' +this.id)

    this.defaultKitName = options.kitName
    this.pitch = options.pitch || 0
    this.volume = options.volume || 1.0  
    this.tempo = options.tempo || 60
    this.swingFactor = options.swingFactor || 0
    this.effectMix = options.effectMix || 0.5
    this.tab = options.tab || []
    this.isLoaded = false

    Beat.prototype.setTab = function (tab) {
        this.tab = tab;
        return this;
    }

    Beat.prototype.load = function () {
        onBeatLoaded(this);
        return this;
    }
}

function idealize(name) {
    return name.replace(/\s/g, '-').toLowerCase()
}

function onBeatLoaded(beat) {
    log('onBeatLoaded: id=' +beat.id)

    beat.isLoaded = true     
    if (areAllLoaded(beatList)) {
        onAssetLoaded()
        showBeats(beatList)
    }                 
}

function Kit(options) {
    this.name = options.name
    this.id = idealize(this.name)

    log('Kit: name=' +this.name)
    log('Kit: id=' +this.id)

    this.pathName = 'sounds/' 
    this.buffer = {}
    this.pitch = options.pitch || 0
    this.startedLoading = false
    this.isLoaded = false
    this.keys = options.keys || keyCodes
    this.keysLoaded = []
    
    Kit.prototype.areAllKeysLoaded = function () {
        if (!this.keysLoaded) return false;
        return this.keysLoaded.length == this.keys.length
    }

    Kit.prototype.load = function() {
        if (this.startedLoading) { return }
            
        this.startedLoading = true

        for(var i in this.keys) {
            this.loadKey(this.keys[i], false)  
        }
    }

    Kit.prototype.loadKey = function(keyCode, mixToMono) {
        var url = this.pathName + this.id + '_' + keyCode + '.mp3'    
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
    
    kit.keysLoaded.push(keyCode)
    if (kit.areAllKeysLoaded()) {
        onKitLoaded(kit)
    }
}

function onKitLoaded(kit) {
    log('onKitLoaded: id=' +kit.id)

    kit.isLoaded = true
    if (areAllLoaded(kitList)) {     
        onAssetLoaded()
        showKits(kitList);                   
    }
}

function Effect(options) {
    this.name = options.name
    this.id = idealize(this.name)

    log('Effect: name=' +this.name)
    log('Effect: id=' +this.id)

    this.url = options.url
    this.startedLoading = false
    this.isLoaded = options.isLoaded
    this.dryMix = options.dryMix;
    this.wetMix = options.wetMix;
    this.buffer = 0
}

Effect.prototype.load = function() {
    log('Effect.load: id=' +this.id)
    
    if (this.isLoaded) return;

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
            function(buffer) { 
                asset.buffer = buffer
                onEffectLoaded(asset) 
            },            
            function() { 
                onEffectLoadFailed(asset) 
            }
        );
    }

    request.send()
}

function onEffectLoaded(effect) {
    log('onEffectLoaded: id=' +effect.id)

    effect.isLoaded = true
    if (areAllLoaded(effectList)) {
        onAssetLoaded()
        showEffects(effectList)
    }
}

function onEffectLoadFailed(effect) {
    log('onEffectLoadFailed: id=' +effect.id) 

    throw Error('onEffectLoadFailed: id=' +effect.id)        
}

function onAssetLoaded() {
    log('onAssetLoaded')

    if (areAllLoaded(effectList)
        && areAllLoaded(beatList)
        && areAllLoaded(kitList)) {
        startDemo()
    }
}

function initBeatList() {
    log('initBeatList')

    beatList = {}
    beatList.name = 'beatList'
    beatList.items = [
    new Beat({ 
        name: 'Nhemamusasa Kushaura', 
        tab: [
        'L3 X3','R2 X','B3 X2','R5 X3','L4 X','R2 X2','B5 X3','R4 X','L4 X2','R3 X3','B7 X','R5 X2',
        'L3 X3','R2 X','B3 X2','R5 X3','L5 X','R3 X2','B6 X3','R5 X','L4 X2','R3 X3','B7 X','R6 X2',
        'L2 X3','R3 X','B4 X2','R6 X3','L5 X','R3 X2','B6 X3','R5 X','L4 X2','R3 X3','B7 X','R5 X2',
        'L3 X3','R2 X','B3 X2','R5 X3','L4 X','R2 X2','B5 X3','R4 X','L2 X2','R2 X3','L1 X','R5 X2'
        ]}),
    new Beat({ 
        name: 'Karigamombe Kushaura',
        tab: [
        'R2 L1','R6','R2 L2','R6','R1 L5','R4','R1 L5','R4','R1 L4','R4','R1 L4','R4',
        'R2 L1','R6','R2 L2','R6','R2 L3','R5','R2 L3','R5','R1 L4','R4','R1 L4','R4',
        'R3 L4','R5','R3 L4','R5','R2 L3','R5','R2 L3','R5','R1 L4','R4','R1 L4','R4',
        'R2 L1','R6','R2 L2','R6','R1 L5','R4','R1 L5','R4','R3 L2','R6','R3 L2','R6'
        ]}),
    new Beat({ 
        name: 'Karigamombe Kutsinhira',
        tab: [
        'R2','L1','R6 B1','','R4 R1 B6','L2','R4 R1','L1','R7 B5'   ,'','R7 L1','L5',
        'R2','L1','R6 B4','','R5 B6'   ,'B5','R5'   ,'L1','R4 R1 B2','','R4 R1','B2',
        'R3','B5','R3 B1','','R5 B6'   ,'B5','R5'   ,'L1','R4 R1 B2','','R4 R1','B2',
        'R2','B4','R2 B1','','R4 R1 B6','B2','R4 R1','B6','R3 B4'   ,'','R3 B7','B4'
        ]}),
    new Beat({ 
        name: 'Kuzanga 5',
        tab: [
        'R5 L3','B3','R5','L4','R2 B5','R4','L4','R3 B1','',
        'R5 L3','B3','R5','L5','R3 B6','R5','L4','R3 B1','',
        'R6 L2','B4','R6','L5','R3 B6','R6','L2','R2 B1','',
        'R4 L2','B4','R4','L4','R2 B5','R4','L2','R2 B1',''
        ]}),
    new Beat({ 
        name: 'Kuzanga 5 Kutsinhira',
        tab: [
        '','R5 L3','B3','R5','L4','R2 B5','R4','L4','R3 B1',
        '','R5 L3','B3','R5','L5','R3 B6','R5','L4','R3 B1',
        '','R6 L2','B4','R6','L5','R3 B6','R6','L2','R2 B1',
        '','R4 L2','B4','R4','L4','R2 B5','R4','L2','R2 B1'
        ]}),
    new Beat({ 
        name: 'Nyamaropa Kushaura',
        tab: [
        'R2 L1','B1','R2','L1','R2 B1','','R4 L5','B2','R4','L2','R3 B4', '',
        'R2 L1','B1','R2','L1','R2 B1','','R4 L5','B2','R2','L4','R4 B5', '',
        'R2 L1','B1','R2','L1','R2 B1','','R5 L3','B3','R5','L4','R4 B5', '',
        'R3 L4','B7','R3','L4','R3 B7','','R5 L3','B3','R5','L4','R4 B5', ''
        ]}),
    new Beat({ 
        name: 'Nyamaropa Kutsinhira',
        tab: [
        '','R2 L1','B1','R2','L1','R2 B1','','R4 L5','B2','R4','L2','R3 B4', 
        '','R2 L1','B1','R2','L1','R2 B1','','R4 L5','B2','R2','L4','R4 B5', 
        '','R2 L1','B1','R2','L1','R2 B1','','R5 L3','B3','R5','L4','R4 B5', 
        '','R3 L4','B7','R3','L4','R3 B7','','R5 L3','B3','R5','L4','R4 B5' 
        ]}),
    new Beat({ 
        name: 'Mahororo Kushaura',
        tab: [
        'L2','X','R2','','R1 R4 X','','L4','X','R2','','R1 R4 X','', 
        'L2','X','R2','','L3 R5 X','','L4','X','R2','','R1 R4 X','', 
        'L4','X','R3','','L3 R5 X','','L4','X','R2','','R1 R4 X','', 
        'L2','X','R2','','R1 R4 X','','L2','X','R3','','R1 R4 X','', 
        ]}),
    new Beat({ 
        name: 'Shumba Kushaura 1',
        tab: [
        'B5','X R4 R1 L2','','R4 R1 B5','X L2','R4 R1','B2','X R3 L4','','R2 B2','X B1','R2', 
        'B5','X R4 R1 L2','','R4 R1 B5','X L2','R4 R1','B4','X R4 L5','','R2 B2','X B1','R2', 
        'B3','X R5 R2 L3','','R5 R2 B3','X L3','R5 R2','B4','X R4 L5','','R3 B4','X L7','R3', 
        'B3','X    R2 L3','','R9    B3','X L3','R9'   ,'B5','X R8 B5','','R7 B4','X B3','R5', 
        ]}),
    new Beat({ 
        name: 'Chamunika',
        tab: [
        'R6 R2 L2', 'X L1', 'R6 R2', 'L2', 'X R6 R2 B4', '', 'R5 R2 L3', 'X R5 R2 B3', '', 'R4 R1 L4', 'X B5', '', 
        'R3    L4', 'X B7', 'R3'   , 'L4', 'X R3    B5', '', 'R2    L3', 'X R2    B3', '', 'R4 R1 L4', 'X B5', '', 
        'R6 R2 L2', 'X L1', 'R6 R2', 'L2', 'X R6 R2 B4', '', 'R4 R1 L5', 'X       B6', '', 'R3    L2', 'X B4', '', 
        'R2    L2', 'X L1', 'R2'   , 'L2', 'X R2    B4', '', 'R4 R1 L5', 'X       L6', '', 'R4 R1 L4', 'X B5', '', 
        ]}),
    new Beat({ 
        name: 'Bukatiende Kushaura 1',
        tab: [
        'X R3 B7', 'L4', 'R7', 'X R3 B7', 'L3', 'R5   ', 'X B3', 'R9', 'L5', 'X R8 B6', 'L5', 'R5',
        'X R3 B7', 'L4', 'R7', 'X R3 B7', 'L3', 'R5   ', 'X B3', 'R9', 'L4', 'X R7 B5', 'L4', 'R4',
        'X R2 L1', 'L2', 'R6', 'X R2 L1', '  ', 'R4 R1', 'X B6', 'R9', 'L4', 'X R7 B5', 'L4', 'R4', 
        'X R2 L1', 'L2', 'R6', 'X R2 L1', 'L3', 'R5   ', 'X B3', 'R9', 'L4', 'X R7 B5', 'L4', 'R4',
        ]}),
    new Beat({ 
        name: 'Bukatiende Kushaura 2',
        tab: [
        'X R7 L4', '', 'R3', 'X R7 L4', '', 'R2', 'X R5 L3', '', 'L5', 'X R5   ', 'L5', '', 
        'X R7 L4', '', 'R3', 'X R7 L4', '', 'R2', 'X R5 L3', '', 'L4', 'X R4 R1', 'R4', '', 
        'X R6 L2', '', 'R2', 'X R6 L2', '', 'R2', 'X R6 L2', '', 'L5', 'X R4 R1', 'L4', '', 
        'X R6 L2', '', 'R2', 'X R6 L2', '', 'R2', 'X R5 L3', '', 'L4', 'X R4 R1', 'L4', '', 
        ]}),
    new Beat({ 
        name: 'Bukatiende Kutsinhira 1',
        tab: [
        'X L4', 'R3 B7', 'B5', 'X R3', 'L3', 'R5 L1', 'X B3', 'R2', 'L5', 'X R8 B6', 'B3', 'R8', 
        'X L4', 'R7 B7', 'B5', 'X R7', 'L3', 'R6 L1', 'X B3', 'R5', 'L4', 'X R4 B5', 'B2', 'R3',
        'X L2', 'R2 L1', 'B1', 'X R2', 'L5', 'R9 B6', 'X B2', 'R8', 'L4', 'X R7 B5', 'B2', 'R7',
        'X L2', 'R6 L1', 'B1', 'X R6', 'L3', 'R5 L1', 'X B3', 'R5', 'L4', 'X R4 B5', 'B2', 'R4',
        ]}),
    new Beat({ 
        name: 'Bukatiende Kushaura Solo 3',
        tab: [
        'X R2 L1', 'L2', 'R2', 'X L1', 'R4 R1   ', 'L5', 'X R4', 'L5', 'R4 R1', 'X L4', 'R4', 'L4', 
        'X R2 L1', 'L2', 'R2', 'X L1', 'R5 R2 L3', 'L6', 'X R5', 'L6', 'R4 R1', 'X L4', 'R4', 'L4', 
        'X R3 B7', 'L4', 'R3', 'X B7', 'R5 R2 L3', 'L6', 'X R5', 'L6', 'R5 R2', 'X L5', 'R5', 'L5', 
        'X R3 B7', 'L4', 'R3', 'X B7', 'R5 R2 L3', 'L6', 'X R5', 'L6', 'R4 R1', 'X L4', 'R4', 'L4', 
        ]}),
    new Beat({ 
        name: 'Bukatiende Kushaura Solo 4',
        tab: [
        'X R2 L1', 'L2', 'R2', 'X L1', 'R4 R1   ', 'L5', 'X R9', 'L5', 'R8   ', 'X L4', 'R7', 'L4', 
        'X R6 L1', 'L2', 'R6', 'X L1', 'R5 R2 L3', 'L6', 'X R5', 'L6', 'R4 R1', 'X L4', 'R4', 'L4', 
        'X R3 B7', 'L4', 'R3', 'X B7', 'R5 R2 L3', 'L6', 'X R9', 'L6', 'R9   ', 'X L5', 'R8', 'L5', 
        'X R7 B7', 'L4', 'R7', 'X B7', 'R6 L3   ', 'L6', 'X R5', 'L6', 'R4 R1', 'X L4', 'R4', 'L4', 
        ]}),
    new Beat({ 
        name: 'Bukatiende Kushaura Solo 5',
        tab: [
        'X R2 L1', 'L2', 'R6', 'X L1', 'R4 R1',    'L5', 'X R8', 'L5', 'R4 R1', 'X L4', 'R7', 'L4', 
        'X R2 L1', 'L2', 'R6', 'X L1', 'R5 R2 L3', 'L6', 'X R9', 'L6', 'R4 R1', 'X L4', 'R7', 'L4', 
        'X R3 B7', 'L4', 'R7', 'X B7', 'R5 R2 L3', 'L6', 'X R9', 'L6', 'R5 R2', 'X L5', 'R8', 'L5', 
        'X R3 B7', 'L4', 'R7', 'X B7', 'R5 R2 L3', 'L6', 'X R9', 'L6', 'R4 R1', 'X L4', 'R7', 'L4', 
        ]}), 
    new Beat({ 
        name: 'Bukatiende Kushaura Solo 6',
        tab: [
        'X L2', 'R2 L1', 'L1', 'X R2', 'L5', 'R4 R1 B6', 'X B6', 'R4 R1', 'L4', 'X R4 R1 B5', 'B5', 'R4 R1', 
        'X L2', 'R2 B4', 'B4', 'X R2', 'L3', 'R5 R2 B3', 'X B3', 'R5 R2', 'L4', 'X R4 R1 B5', 'B5', 'R4 R1', 
        'X L4', 'R3 B1', 'B1', 'X R3', 'L3', 'R5 R2 B3', 'X B3', 'R5 R2', 'L5', 'X R5    B6', 'B3', 'R5   ', 
        'X L4', 'R3 B1', 'B1', 'X R3', 'L3', 'R5 R2 B3', 'X B3', 'R5 R2', 'L4', 'X R4 R1 B5', 'B2', 'R4 R1', 
        ]}),        
    ]
}

function initEffectList(){
    log('initEffectList')

    effectList = {}
    effectList.name = 'effectList'
    effectList.items = []

    for (var i in effectOptions) {
        effectList.items[i] = new Effect(effectOptions[i])
    }
}

function initKitList(){
    log('initKitList')
    
    kitList = {}
    kitList.name = 'kitList'
    kitList.items = []

    for (var i in kitOptions) {
        kitList.items[i] = new Kit(kitOptions[i])
    } 
}

function startLoadingBeats(){
    log('startLoadingBeats')

    show('loading beats')

    for (var i in beatList.items) {
        beatList.items[i].load()
    } 
}

function startLoadingKits(){
    log('startLoadingKits')

    show('loading kits')
    
    for (var i in kitList.items) {
        kitList.items[i].load()
    } 
}

function startLoadingEffects(){
    log('startLoadingEffects')

    show('loading effects')

    for (var i in effectList.items) {
        effectList.items[i].load()
    } 
}

function startLoadingAssets(){
    log('startLoadingAssets')

    initKitList()
    initBeatList()
    initEffectList()    
    
    startLoadingKits()
    startLoadingBeats()
    startLoadingEffects()
}

function init() {
    log('init')

    context = new AudioContext()

    startLoadingAssets()
    
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

    initControls();
}

function initControls() {
    // tool buttons
    document.getElementById('play').addEventListener('mousedown', startPlay, true)
    document.getElementById('stop').addEventListener('mousedown', stopPlay, true)
    document.getElementById('tempoinc').addEventListener('mousedown', increaseTempo, true)
    document.getElementById('tempodec').addEventListener('mousedown', decreaseTempo, true)
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

function playNote(buffer, sendGain, mainGain, playbackRate, noteTime, pan, x, y, z) {
    // Create the note
    var voice = context.createBufferSource()
    voice.buffer = buffer
    voice.playbackRate.value = playbackRate

    var finalNode = voice

    if (pan) {
        var panner = context.createPanner();
        panner.setPosition(x, y, z);
        voice.connect(panner);
        finalNode = panner;
    }

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
                        var pan = false
                        var x = 0.0
                        if (keyCode[0] == 'L') { pan = true; x = -50.0; }
                        if (keyCode[0] == 'B') { pan = true; x = -50.0; }
                        if (keyCode[0] == 'R') { pan = true; x = 50.0; }
                        if (keyCode[0] == 'X') { pan = true; x = 50.0; }
                        var currentBuffer = currentKit.buffer[keyCode]
                        if(currentBuffer) {
                            playNote(currentBuffer, 1.0, theBeat.volume, theBeat.pitch, contextPlayTime, 
                                pan, x, 0.0, 0.0)
                        }
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

    timeoutId = setTimeout(function() {
        schedule()
    }, 0)
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

function selectBeat(id) {
    log('selectBeat: ' + id)

    stopPlay() // the beat has changed

    var beat = getItemById(beatList, id)

    if (!beat) { alert ('Beat not found: ' + id); return }

    log('selected beat: ' +beat.id)

    theBeat = beat

    selectKit(theBeat.defaultKitName)
    selectEffect(theBeat.defaultEffectName)
    selectEffectLevel(theBeat.effectMix)  
    selectTempo(theBeat.tempo)

    showPlayAvailable()

    $("#current-beat").text(theBeat.name)
}

function selectKit(id) {
    log('selectKit: ' +id)

    var kit = getItemById(kitList, id)

    if (!kit) { alert('kit ' +id+ ' not found!'); return }

    log('selected kit: ' +kit.id)

    currentKit = kit   

    $("#current-kit").text(currentKit.name)
}

function selectEffect(id) {
    log('selectEffect: ' + id)

    var effect = getItemById(effectList, id)
    
    if (!effect) { alert('Effect not found: ' +id); return }
    
    if (!effect.isLoaded) { alert('Effect ' +id+ ' still loading'); return }

    log('selected effect: ' +effect.id)

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

    $("#current-effect").text(effect.name)
}

function selectEffectLevel(value) {
    setEffectLevel(value);
}

function setEffectLevel(value) {
    if (!theBeat) { log('No beat'); return }

    theBeat.effectMix = value;
    // Factor in both the preset's effect level and the blending level (effectWetMix) stored in the effect itself.
    effectLevelNode.gain.value = theBeat.effectMix * effectWetMix;  
}

function getItemById(list, id) {
    // return the first one if no id specified
    if (!id && list.items.length > 0) {
        return list.items[0]
    }
    if (id.indexOf('/') > -1) {
        id = id.split('/')[1]
    }
    for (var i in list.items) {
        if (list.items[i].id === id) {
            return list.items[i]
        }
    } 
}

function areAllLoaded(list) {
    log('areAllLoaded?: ' + list.name)

    if (!list) return false
    if (!list.items) return false
    if (list.items.length == 0) return false;
    for (var i in list.items) {
        if (!list.items[i].isLoaded) {
            return false
        }
    } 
    log('areAllLoaded: ' + list.name + '=yes')
    return true;
}

function startPlay() {
    log('startPlay')

    noteTime = 0.0
    startTime = context.currentTime + 0.005
    schedule();

    document.getElementById('play').classList.add('playing')
    document.getElementById('stop').classList.add('playing')

    show('')
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

    show('')
}

function drawPlayhead(xindex) {
    var lastIndex = (xindex+NUM_LED-1) % NUM_LED

    var elNew = document.getElementById('LED_' + xindex)
    var elOld = document.getElementById('LED_' + lastIndex)
    
    elNew.src = 'images/LED_on.png'
    elOld.src = 'images/LED_off.png'
}

function showPlayAvailable() {
    log('showPlayAvailable')

    if (!theBeat) { return }

    var play = document.getElementById('play')
    play.src = 'images/btn_play.png'

    show('')
}

function startDemo() {
    log('startDemo')
    
    selectBeat()

    showPlayAvailable()
}

respondToHash = function(hash){
    log("respondToHash("+hash+")");
    for(var i in routes){
      var r = routes[i];
      if (hash.indexOf(r.hash)==0 && r.handler){
        r.handler(hash.slice(1));
        return;
      }
    }        
  };

showBeats = function(data){
    log("showBeats("+data.items.length+")")
    $("#caption-beats").text("Beats")
    var source   = $("#beats-template").html()
    var template = Handlebars.compile(source)
    var context = data
    var html    = template(context)
    $('#beat-list').html(html)
}

showKits = function(data){
    log("showKits("+data.items.length+")")
    $("#caption-kits").text("Kits")
    var source   = $("#kits-template").html()
    var template = Handlebars.compile(source)
    var context = data
    var html    = template(context)
    $('#kit-list').html(html)
}

showEffects = function(data){
    log("showEffects("+data.items.length+")")
    $("#caption-effects").text("Effects")
    var source   = $("#effects-template").html()
    var template = Handlebars.compile(source)
    var context = data
    var html    = template(context)
    $('#effect-list').html(html)
}

show = function(message) {
    $('#caption-message').text(message)
}

routes = [
    {hash:'#beat/', handler: selectBeat},
    {hash:'#beats/', handler: showBeats},
    {hash:'#kit/', handler: selectKit},
    {hash:'#kits/', handler: showKits},
    {hash:'#effect/', handler: selectEffect},
    {hash:'#effects/', handler: showEffects},
  ];

$(document).ready(function(){
    log('document.ready');

    init();

    $(window).on('hashchange', function() {
      log('hashchange');
      respondToHash(window.location.hash);             
    });  
})

})(window);