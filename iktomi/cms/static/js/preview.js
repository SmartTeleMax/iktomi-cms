function unpublishedItems(items){
  new Element('a', {
    'href': 'javascript:void(0)',
    'html': 'На странице имеются <br> неопубликованные объекты'
  }).setStyles({
    'line-height': '13px',
    'display': 'inline-block',
    'text-align': 'center',
    'margin-right': '20px'
  }).addEvent('click', function(){
    var text = '<h2>Имеются неопубликованные объекты:</h2><ul>'
    for (var i=items.length; i--;){
      text += "<li>" + items[i].title + "</li>";
    }
    text += '</ul>';
    alert(text);
  }).inject(document.getElement('.buttons'), 'top');
}


Blocks.register('preview-width', function(el){
  el.addEvent('click', function(e){
    var target = e.target;
    if (target.tagName == 'LI' && !target.hasClass('active')){
      var iframe = target.getParent('form').getNext('iframe');
      iframe.setStyle('width', target.dataset.width || '100%');
      el.getElement('.active').dataset.device = target.dataset.device;
    }
  })
})
