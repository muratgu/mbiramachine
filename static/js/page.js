$(function () {
    var TAG = 'Page'
    var DEBUG = false

    var log = function (s) { if(DEBUG && console && console.log) console.log(s) }
    var error = function (s, e) { if (console && console.log) console.log(s); console.log(e) }

    var mbiraTone
    var selectedKitId
    var selectedTabId
    var selectedBpm = 100
    var selectedTempo = '8n'

    /* EVENT HANDLERS */
    var mbiraSelectKit = (id) => {
        selectedKitId = id
        mbiraLoad()
    }
    var mbiraSelectTab = (id) => {
        log('id='+id)
        selectedTabId = id
        mbiraLoad()
    }
    var mbiraSelectBpm = (id) => {
        selectedBpm = id
        if (mbiraTone) { mbiraTone.setBpm(selectedBpm) }
    }
    var mbiraStart = () => {
        mbiraStop()
        mbiraLoad()
        if (mbiraTone) mbiraTone.start()
        $('#mbira-start').prop('disabled', true).prop('checked', 'checked');
        $('#mbira-stop').prop('disabled', false).prop('checked', '');
    }
    var mbiraStop = () => {
        if (mbiraTone) mbiraTone.stop()
        $('#mbira-start').prop('disabled', false).prop('checked', '');
        $('#mbira-stop').prop('disabled', true).prop('checked', 'checked');
        $('#mbira-time').html('');
    }
    var mbiraLoad = () => {
        mbiraStop()
        mbiraLoading()
        if (mbiraTone) {
            mbiraTone.load({
                kitId: selectedKitId,
                tabId: selectedTabId,
                bpm: selectedBpm,
                tempo: selectedTempo,
                start: "0",
                onKeysPlayedCallback: handleKeysPlayed,
            }, function(){
                // ready to play
                mbiraLoaded()
            })
        }
    }
    var mbiraLoading = () => {
        $('#mbira-start').prop('disabled', true).prop('checked', '');
        $('#mbira-stop').prop('disabled', true).prop('checked', '');
    }
    var mbiraLoaded = () => {
        $('#mbira-start').prop('disabled', false).prop('checked', '');
        $('#mbira-stop').prop('disabled', true).prop('checked', '');
    }
    var handleKeysPlayed = (keys) => {
        log(keys)
    }

    /* SETUP */
    var bindEvents = function() {
        $('#mbira-controls input').change(function() { $(this).attr('id') == 'mbira-start' ? mbiraStart() : mbiraStop() });
        $('#mbira-kits').prop('disabled', false)
        $('#mbira-tabs').prop('disabled', false)
        $('#mbira-bpm').prop('disabled', false)
    }   
    
    var loadOptions = () => {
        //if (window.innerWidth > 600) {
        //    loadOptionsAsButtons();
        //} else {
            loadOptionsAsDropdowns();
        //}
    }

    var loadOptionsAsButtons = function(){
        var makeButton = (id, name) => {
            return [
                $("<input type='radio' />").attr('id', id),
                $("<label class='button' type='radio' />").attr('for', id).text(name)
            ]
        }
        var kitSelector = $("<div class='button-group round toggle' disabled='disabled'></div>");
        mbiraTone.getKitList().forEach(x=> {
            makeButton(x.id, x.name).forEach(e => e.attr('name','r-group-kit').appendTo(kitSelector));
        })
        kitSelector.appendTo($('#mbira-kits'));
        $('#mbira-kits input').change(function() { mbiraSelectKit($(this).attr('id')) });

        var bpmSelector = $("<div class='button-group round toggle' disabled='disabled'></div>");
        mbiraTone.getBpmList().forEach(x=> {            
            makeButton(x.id, x.name).forEach(e => e.attr('name','r-group-bpm').appendTo(bpmSelector));
        })
        bpmSelector.appendTo($('#mbira-bpm'));
        $('#mbira-bpm input').change(function() { mbiraSelectBpm($(this).attr('id')) });

        var tabSelector = $("<div class='button-group round toggle' disabled='disabled'></div>");
        mbiraTone.getTabList().forEach(x=> {
            makeButton(x.id, x.name).forEach(e => e.attr('name','r-group-tab').appendTo(tabSelector));            
        })
        tabSelector.appendTo($('#mbira-tabs'));
        $('#mbira-tabs input').change(function() { mbiraSelectTab($(this).attr('id')) });
    }

    var loadOptionsAsDropdowns = function(){
        var kitSelector = $("<select></select>");
        $("<option name='select'>Select Kit</option>").appendTo(kitSelector);
        mbiraTone.getKitList().forEach(x=> {
            $("<option />").val(x.id).text(x.name).appendTo(kitSelector);            
        })
        kitSelector.appendTo($('#mbira-kits'));
        $('#mbira-kits select').change(function() { mbiraSelectKit($(this).val()) } );

        var bpmSelector = $("<select></select>");
        $("<option name='select'>Select Bpm</option>").appendTo(bpmSelector);
        mbiraTone.getBpmList().forEach(x=> {            
            $("<option />").val(x.id).text(x.name).appendTo(bpmSelector);            
        })
        bpmSelector.appendTo($('#mbira-bpm'));
        $('#mbira-bpm select').change(function() { mbiraSelectBpm($(this).val()) } );

        var tabSelector = $("<select></select>");
        $("<option name='select'>Select Piece</option>").appendTo(tabSelector);
        mbiraTone.getTabList().forEach(x=> {
            $("<option />").val(x.id).text(x.name).appendTo(tabSelector);            
        })
        tabSelector.appendTo($('#mbira-tabs'));
        $('#mbira-tabs select').change(function() { mbiraSelectTab($(this).val()) } );
    }

    var showLoading = function() {
        $('.content').hide()
        $('.preloader').show()
    }
    var hideLoading = function() {
        $('.preloader').fadeOut("slow")
        $('.content').show()
    }
    var initalize = function () {
        showLoading()
        mbiraTone = MbiraTone(function() {
            loadOptions()
            bindEvents()
            $("#mbira-bpm").val(selectedBpm);
            log(TAG+': mbiraTone: ready')
            hideLoading()
        })
    }

    initalize()
});