/**
 * Created with PyCharm.
 * User: pavel
 * Date: 5/8/13
 * Time: 6:22 PM
 * To change this template use File | Settings | File Templates.
 */
function flash(text, className, timeout){
  className = className || '';
  timeout = timeout || 3000;
  if (!$('flashmessages')) {
    new Element ('div', {id: "flashmessages"}).inject(document.body);
  }

  var tooltip = new Element('<div>', {
    'class': 'flashmessage '+ className,
    'text': text
  }).inject('flashmessages');

  var timeouts = [
    window.setTimeout(function(){
      tooltip.addClass('show'); // animate
    }, 1),
    window.setTimeout(function(){
      tooltip.removeClass('show'); // reverse animate
    }, timeout-300),
    window.setTimeout(function(){
      tooltip.destroy();
    }, timeout)
  ];

  if (timeout > 5000){
    new Element('button', {'class': 'close'}).addEvent('click', function(){
      for (var i=timeouts.length; i--;){
        window.clearTimeout(timeouts[i]);
      }
      tooltip.destroy();
    }).inject(tooltip, 'top');
  }
}

function flashAll(){
  var allCookies = document.cookie.split(';');
  for (var i = allCookies.length; i--;) {
      var name = allCookies[i].trim().split('=')[0];
      if (name.substr(0, 10) == 'flash-msg-'){
          var data = Cookie.read(name);
          Cookie.dispose(name, {'path': '/'});
          if(data){
              if (data.charAt(0) == '"'){
                  // XXX Hack
                  data = data.substr(1, data.length - 2);
              }
              var flashes = JSON.decode(data);
              for (var j=0; j<flashes.length; j++){
                  flash(flashes[j][0], flashes[j][1]);
              }
          }
      }
  }
}

(function(){
  // XXX hack to add callback to all Ajax events
  // May be wrong

  var tempSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.send = function() {
    tempSend.apply(this, arguments);
    this.addEventListener('readystatechange', function(){
        if(this.readyState == 4) {
            flashAll();
        }
    }.bind(this));
  }
})();
