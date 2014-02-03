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
    $('flashmessages').addEvent('click', function(e){
      if (e.target.tagName == 'BUTTON' && e.target.hasClass('close')){
        var tooltip = e.target.getParent('.flashmessage');
        var timeouts = JSON.parse(tooltip.dataset.timeouts);
        for (var i=timeouts.length; i--;){
          window.clearTimeout(timeouts[i]);
        }
        tooltip.destroy();
      }
    });
  }

  var tooltip = $('flashmessages').getElements('.flashmessage.show').filter(function(el){
    return el.getElement('span').get('text') == text;
  })[0];

  if (tooltip){
    var count = tooltip.getElement('ins').get('text');
    tooltip.getElement('ins').set('text', parseInt(count, 10)+1).setStyle('display', '');

    var oldTimeouts = JSON.parse(tooltip.dataset.timeouts);
    for (var i=oldTimeouts.length; i--;){
      window.clearTimeout(oldTimeouts[i]);
    }
    var timeouts = [];
  } else {
    tooltip = new Element('div', {
      'class': 'flashmessage '+ className
    }).adopt(
      new Element('span', {'text': text}),
      new Element('ins', {'text': 0, 'style': 'display:none'})
    ).inject('flashmessages');

    if (timeout > 5000){
      new Element('button', {'class': 'close'}).inject(tooltip, 'top');
    }

    var timeouts = [
      window.setTimeout(function(){
        tooltip.addClass('show'); // animate
      }, 1)
    ]
  }

  timeouts.push(
    window.setTimeout(function(){
      tooltip.removeClass('show'); // reverse animate
    }, timeout-300)
  );
  timeouts.push(
    window.setTimeout(function(){
      tooltip.destroy();
    }, timeout)
  );

  tooltip.dataset.timeouts = JSON.stringify(timeouts);

}

function flashAll(){
  var allCookies = document.cookie.split(';');

  for (var i = allCookies.length; i--;) {
    var c = allCookies[i].trim();
    if (c.substr(0, 10) ==  'flash-msg-') {
      var c_name = c.split('=')[0];
      // Hack to workaround bad cookie processing
      var cookie = Cookie.read(c_name).replace(/^"|"$/g, '');
      if (cookie.charAt(0) == '\\'){ cookie = eval('"'+cookie+'"'); }

      var data = JSON.decode(cookie);
      Cookie.dispose(c_name);

      // ugly hack for double escaped string
      if (typeof(data) == 'string' && data.charAt(0) == '[') {
        data = JSON.decode(data);
      }

      for (var j=0; j<data.length; j++){
        flash(data[j][0], data[j][1], data[j][1]=='failure'?6000:undefined);
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
