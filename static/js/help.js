(function(window, undefined){     
  
  var DEBUG = false;
  var API_URL = '/api/v1/';

  var Log = function(msg){
    if(DEBUG){
      console.log(msg);
    }
  } 
  
  $(document).ready(function(){
    Log('document.ready');
    $(document).on('ajaxStart', function(){
      Log('ajaxStart');
      $("#load-spinner").fadeIn('fast');
    });
    $(document).on('ajaxStop', function(){
      Log('ajaxStop');
      $("#load-spinner").fadeOut('fast');      
    });
    window.location.hash = ''; 
    respondToHash(window.location.hash);         
  });

  respondToHash = function(hash){
    Log("respondToHash("+hash+")");
    for(i in routes){
      var r = routes[i];
      if (hash.indexOf(r.hash)==0 && r.handler){
        getData(hash.slice(1), r.handler);
        return;
      }
    }        
  };

  getData = function(path, loader){
    Log('getData('+path+','+loader.name+')');
    $.getJSON( API_URL+path, { } )
      .done(function( json ) {
        $("#kn-list").empty();
        loader(json);
      })
      .fail(function( jqxhr, textStatus, error ) {
        var err = textStatus + ", " + error;
        Log( "Request Failed: " + err );
      });
  };

  loadAPIDoc = function(data){
    Log('loadAPIDoc()');
    Log(data);
    $("#caption").text("API Documentation");
    var source   = $("#apidoc-template").html();
    var template = Handlebars.compile(source);
    var context = data;
    var html    = template(context);
    $('#kn-list').html(html);
  };      

  routes = [
    {hash:'', handler: loadAPIDoc},        
  ];

})(window);