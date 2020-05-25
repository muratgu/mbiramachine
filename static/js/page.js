$(function () {
    var TAG = 'Page'
    var DEBUG = false

    var log = function (s) { if(DEBUG && console && console.log) console.log(s) }
    var error = function (s, e) { if (console && console.log) console.log(s); console.log(e) }

    var mbiraTone
    var selectedKitId
    var selectedTabId
    var selectedBpm = 60
    var selectedTempo = '8n'

    /* EVENT HANDLERS */
    var handleMbiraKitSelected = function(id) {
        selectedKitId = id
        handleMbiraLoad()
    }
    var handleMbiraTabSelected = function(id) {
        selectedTabId = id
        handleMbiraLoad()
    }
    var handleMbiraBpmSelected = function(id) {
        selectedBpm = id
        if (mbiraTone) {
            mbiraTone.setBpm(selectedBpm)
        }
    }
    var handleMbiraStart = function () {
        mbiraTone.stop()
        handleMbiraLoad()
        if (mbiraTone) mbiraTone.start()
        $('#mbira-start').prop('disabled', true);
        $('#mbira-stop').prop('disabled', false);
    }
    var handleMbiraStop= function () {
        if (mbiraTone) mbiraTone.stop()
        $('#mbira-start').prop('disabled', false);
        $('#mbira-stop').prop('disabled', true);
        $('#mbira-time').html('');
    }
    var handleMbiraLoad = function () {
        handleMbiraStop()
        handleMbiraLoading()
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
                handleMbiraLoaded()
            })
        }
    }
    var handleMbiraLoading = function () {
        $('#mbira-start').prop('disabled', true);
        $('#mbira-stop').prop('disabled', true);
    }
    var handleMbiraLoaded = function () {
        $('#mbira-start').prop('disabled', false);
        $('#mbira-stop').prop('disabled', true);
    }
    var handleKeysPlayed = function(keys) {
        log(keys)
    }

    /* SETUP */
    var bindEvents = function() {
        $('#mbira-controls input:radio').change(function() { $(this).attr('id') == 'mbira-start' ? handleMbiraStart() : handleMbiraStop() });
        $('#mbira-kits input:radio').change(function() { handleMbiraKitSelected($(this).attr('id')) });
        $('#mbira-tabs input:radio').change(function() { handleMbiraTabSelected($(this).attr('id')) });
        $('#mbira-bpm input:radio').change(function() { handleMbiraBpmSelected($(this).attr('id')) });
        $('#mbira-kits').prop('disabled', false)
        $('#mbira-tabs').prop('disabled', false)
        $('#mbira-bpm').prop('disabled', false)
    }
    var loadOptions = function(){
        mbiraTone.getKitList().forEach(x=> {
            $('#mbira-kits').append($("<input type='radio' name='r-group-kit' />").attr('id', x.id));
            $('#mbira-kits').append($("<label class='button' type='radio' name='r-group-kit' />").attr('for', x.id).text(x.name));
        })
        mbiraTone.getBpmList().forEach(x=> {            
            $('#mbira-bpm').append($("<input type='radio' name='r-group-bpm' />").attr('id', x.id));
            $('#mbira-bpm').append($("<label class='button' type='radio' name='r-group-bpm' />").attr('for', x.id).text(x.name));
        })
        mbiraTone.getTabList().forEach(x=> {
            $('#mbira-tabs').append($("<input type='radio' name='r-group-tab' />").attr('id', x.id));
            $('#mbira-tabs').append($("<label class='button' type='radio' name='r-group-tab' />").attr('for', x.id).text(x.name));
        })
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
            $("#mbira-bpm").val(80);
            log(TAG+': mbiraTone: ready')
            hideLoading()
        })
    }

    initalize()
});