/**
 * Created with PyCharm.
 * User: pavel
 * Date: 5/8/13
 * Time: 6:22 PM
 * To change this template use File | Settings | File Templates.
 */

function flash(text, className, timeout){
  className = className || '';
  timeout = timeout || (className == 'failure' ? 6000 : 3000);
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

function flashAll(data){
    for (var j=0; j<data.length; j++){
        flash(data[j][0], data[j][1]);
    }
}

Blocks.register('flashmessage', function(elem) {
    flash(elem.dataset.text, elem.dataset.category, elem.dataset.timeout);
});

(function(){
  // XXX hack to add callback to all Ajax events
  // May be wrong
  var tempSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.send = function() {
    tempSend.apply(this, arguments);

    this.addEventListener('readystatechange', function(){
        if(this.readyState == 4) {
            if (this.responseText && this.responseText[0] == '{') {
                var resp;
                try {
                    resp = JSON.parse(this.responseText);
                } catch (e) {
                    return;
                }

                if (resp._flashmessages) {
                    flashAll(resp._flashmessages);
                }
            }
        }
    }.bind(this));
  }
})();
