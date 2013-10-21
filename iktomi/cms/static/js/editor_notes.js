(function(){
    
  function EditorNotes(el){
    el.getElement('.editor-notes__add').addEvent('click', function(){
      this.style.display = 'none';
      el.getElement('.editor-notes__dropdown').addClass('show');
    });

    el.getElement('.editor-notes__submit').addEvent('click', function(){
      var text = el.getElement('textarea').get('value');
      if (!text) { return; }
      el.getElement('.editor-notes__add').style.display = '';
      el.getElement('.editor-notes__dropdown').removeClass('show');
      new Request.JSON({
          url: el.dataset.url,
          onSuccess: function(result){
            if (result.success){
              var userName = document.getElement('.links__link.user b').get('text');
              var comment = new Element('div', {'class': 'editor-notes__item'}).adopt(
                new Element('p', {'class': 'editor-notes__author'}).set('text', userName),
                new Element('p', {'class': 'editor-notes__body'}).set('text', text)
              );

              comment.inject(el.getElement('.editor-notes__dropdown'), 'before');
              el.getElement('textarea').set('value', '');
            } else {
              el.getElement('.editor-notes__add').style.display = 'none';
              el.getElement('.editor-notes__dropdown').addClass('show');
            }
          }
      }).post({stream_name: el.dataset.streamName,
               object_id: el.dataset.objectId,
               body: text
               });
    });
  }

  Blocks.register('editor-notes', EditorNotes);
})();
