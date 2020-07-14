let Mbira = (Tone, Catalog) => {

    let defaultBpm = 120;
    let volume = -10;

    const panRight = new Tone.Panner(0.1);
    const panLeft = new Tone.Panner(-0.1);
    const panFarRight = new Tone.Panner(1);
    const panFarLeft = new Tone.Panner(-1);

    Tone.Transport.bpm.value = defaultBpm;

    const makeLoop = (player, notes, onNote) => {
        return new Tone.Sequence(function(time, seq){            
            if (onNote && typeof(onNote)==='function') onNote(seq, notes[seq]);
            notes[seq].forEach((v,i)=>{
                let keys = v=='1'?player.leftKeys:v=='2'?player.rightKeys:v[0]=='R'?player.rightKeys:player.leftKeys;
                keys.get(v).start(time, 0, "8n", 0, Math.random()*0.5+0.5);  
            })
        }, [...Array(notes.length).keys()], "8n");
    }

    const loadKeys = (keyMap) => {
        return new Promise ((resolve, reject) => {
            const player = new Tone.Players(keyMap, {
                "volume" : volume
                ,"fadeOut" : "1n"
                ,"onload" : () => {
                    resolve(player);
                }
            })
        });
    }

    const loadPlayer = async (tuning, panning) => {
        panning = panning || 0;
        let player = {};

        player.tuning = tuning;

        player.volume = new Tone.Volume(volume)

        player.leftKeys = await loadKeys(Catalog.tunings[tuning].left);
        player.leftKeys.chain(player.volume, new Tone.Panner(-0.1+panning), Tone.Master);

        player.rightKeys = await loadKeys(Catalog.tunings[tuning].right);
        player.rightKeys.chain(player.volume, new Tone.Panner(0.1+panning), Tone.Master);
        
        return player;    
    }

    const makeLooper = async (options) => {
        options = options || {};
        const piece = options.piece;
        const tuning = options.tuning;
        const panning = options.panning || 0;
        const hoshoOn = options.hosho || false;
        const onNote = options.onNote || null;
        const player = await loadPlayer(tuning, panning);
        const hoshoPlayer = await loadPlayer("hosho", panning);
        const loop = makeLoop(player, Catalog.pieces[piece].notes, onNote);
        const hoshoLoop = makeLoop(hoshoPlayer, Catalog.pieces[piece].hosho);
        hoshoPlayer.volume.mute = !hoshoOn;
        return {
            start: (at) => {
                at = at || "0";
                loop.start(at);
                hoshoLoop.start(at);
            },
            stop: (at) => {
                at = at || 0;
                loop.stop(at);
                hoshoLoop.stop(at);
            },
            hosho: (isOn) => {
                hoshoPlayer.volume.mute = !isOn;
            },
            mute: (isMuted) => {
                player.volume.mute = isMuted;                    
            }
        }
    }

    const start = (options) => {
        options = options || {};
        const bpm = options.bpm || defaultBpm;
        Tone.Transport.bpm.value = bpm;
        Tone.Transport.start();    
    }

    const stop = () => {
        Tone.Transport.stop();
    }

    const pause = () => {
        if (Tone.Transport.state == 'paused') {
            Tone.Transport.start();
        } else {
            Tone.Transport.pause();
        }
    }

    const bpm = (value) => {
        Tone.Transport.bpm.rampTo(value, 4);
    }

    return {
        makeLooper
        , start
        , stop
        , pause
        , bpm
    }

}