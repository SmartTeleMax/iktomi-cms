Blocks.register('item-trays', function(el){
  el.addEvent('click:relay(.trays__tray__remove)', function(){
    var tray = this.getParent('.trays__tray');
    new Request.JSON({
      url: el.dataset.deleteUrl,
      onSuccess: function(result){
        if (result.success){
          tray.destroy();
        } else {
          console.warn(result.errors);
          flash('Не удалось удалить из папки', 'failure');
        }
      }.bind(this)
    }).post({'id': tray.dataset.id});
  });

  var popupEl = window.trayPopup.contentEl.getElement('.tray-popup');
  el.getElement('.trays__add').addEvent('click', function(){
    popupEl.dataset.objectId = el.dataset.objectId;
    popupEl.dataset.streamName = el.dataset.streamName;
    popupEl.dataset.formId = el.getParent('form').getProperty('id');
    popupEl.getElement('.tray-popup__comment').set('value', '');
    window.trayPopup.show();
  });

});

Blocks.register('tray', function(el){
  el.addEvent('click:relay(.tray__remove)', function(){
    new Request.JSON({
      url: el.dataset.deleteUrl,
      onSuccess: function(result){
        if (result.success){
          this.getParent('tr').destroy();
        } else {
          console.warn(result.errors);
          flash('Не удалось удалить из папки', 'failure');
        }
      }.bind(this)
    }).post({'id': this.dataset.id});
  });

});




Blocks.register('tray-popup', function(el){
  // trayPopup is assigned to window object because it is created once
  // and then we should use only this particular popup.
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
          console.warn(result.errors || result.error);
          flash(result.error || 'Не удалось положить в папку', 'failure');
        }
      }.bind(this)
    }).post(data);
    window.trayPopup.hide();
  }

  function putToUser(){
    var user_id = el.getElement('.tray-popup__user').get('value');
    put(el.dataset.userUrl, {'object_id': el.dataset.objectId,
                             'stream_name': el.dataset.streamName,
                             'user': user_id });
  }

  el.getElement('.tray-popup__to-user').addEvent('click', putToUser);
  $('app-content').addEvent('pre-render', function(e){
    var count = e.body.getElement('.tray-count');
    count = count && count.get('text');
    if (count) {
      $('app-content').getElement('.tray-count').set('text', count);
    }
  })
});
