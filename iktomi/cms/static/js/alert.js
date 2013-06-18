function alert(text, title){
  var popup = new Popup(undefined, {
    'close_button_on': false,
    'clickable_overlay': false
  }).setContent('<p>'+text+'</p>');
  if(title){popup.setTitle(title)};
  
  var btn = new Element('div', {'class':'buttons'}).adopt(
    new Element('a', {'class': 'button'}).adopt(
      new Element('span', {'text':'закрыть'})
    ).addEvent('click', function(){
      popup.destroy();
    })
  )
  popup.adopt(btn).show();
}
