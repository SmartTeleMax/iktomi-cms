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
