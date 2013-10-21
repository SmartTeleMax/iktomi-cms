Blocks.register('item-trays', function(el){
  el.addEvent('click:relay(.trays__tray__remove)', function(){
    var tray = this.getParent('.trays__tray');
    new Request.JSON({
      url: el.dataset.deleteUrl,
      onSuccess: function(result){
        if (result.success){
          tray.remove();
        } else {
          console.warn(result.errors);
          flash('Не удалось удалить из лотка', 'failure');
        }
      }.bind(this)
    }).post({'id': tray.dataset.id});
  });

  var popupEl = window.trayPopup.contentEl.getElement('.tray-popup');
  el.getElement('.trays__add').addEvent('click', function(){
    popupEl.dataset.objectId = el.dataset.objectId;
    popupEl.dataset.streamName = el.dataset.streamName;
    popupEl.dataset.formId = el.getParent('form').id;
    popupEl.getElement('.tray-popup__comment').set('value', '');
    window.trayPopup.show();
  });

});


Blocks.register('tray-popup', function(el){
  var trayPopup = window.trayPopup = new Popup('tray-popup', {
    'injectTo': document.body,
    'empty_on_hide': false
  });
  trayPopup.adopt(el.setStyle('display', ''));


  function put(url, data){
    data.comment = el.getElement('.tray-popup__comment').get('value');
    var trays = $(el.dataset.formId).getElement('.trays');
    new Request.JSON({
      url: url,
      onSuccess: function(result){
        if (result.success){
          trays.getElements('.trays__tray[data-id="'+result.id+'"]').destroy();

          var div = new Element('div', {'class': 'trays__tray',
                                        'data-id': result.id}).adopt(
                          new Element('a', {'href': el.dataset.trayUrl.replace('TRAY_ID', result.tray_id),
                                            'text': result.title}));
          if (data.comment){
            new Element('div', {'class': 'trays__comment-hellip'}).adopt(
              new Element('div', {'class': 'trays__comment', 'text': data.comment})).inject(div);
          }
          new Element('button', {'type': 'button',
                                 'class': 'trays__tray__remove',
                                 'html': '&times'}).inject(div);
          div.inject(trays.getElement('.trays__list'));
        } else {
          console.warn(result.errors);
          flash('Не удалось положить в лоток', 'failure');
        }
      }.bind(this)
    }).post(data);
    window.trayPopup.hide();
  }

  function putToSelf(){
    put(el.dataset.myUrl, {'object_id': el.dataset.objectId,
                           'stream_name': el.dataset.streamName});
  }

  function putToUser(){
    var user_id = el.getElement('.tray-popup__user').get('value');
    put(el.dataset.userUrl, {'object_id': el.dataset.objectId,
                             'stream_name': el.dataset.streamName,
                             'user': user_id });
  }

  el.getElement('.tray-popup__to-self').addEvent('click', putToSelf);
  el.getElement('.tray-popup__to-user').addEvent('click', putToUser);
});
