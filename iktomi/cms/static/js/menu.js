(function(){
  function menu(elem){
    if(! elem.getParent('.popup')){
      $$('.navigation li.active').removeClass('active');
      var active = document.getElement('.navigation [data-endpoint="'+elem.dataset.menu+'"]');
      if (active){
        if (active.tagName == 'LI'){
          active.addClass('active');
        }
        active.getParents('li').addClass('active');
      }
      elem.destroy()
    }
  }

  function title(elem){
    if(! elem.getParent('.popup')){
      document.querySelector('title').set('html', elem.dataset.title);
      elem.destroy();
    }
  }

  Blocks.register('menu', menu);
  Blocks.register('title', title);
})();
