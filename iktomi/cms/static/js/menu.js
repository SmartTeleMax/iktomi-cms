(function(){
  function menu(elem){
    $$('.navigation li.active').removeClass('active');
    var active = document.getElement('.navigation li[data-endpoint="'+elem.dataset.menu+'"]');
    if (active){
      active.addClass('active');
      active.getParents('li').addClass('active');
    }
    elem.destroy()
  }

  function title(elem){
    document.querySelector('title').set('html', elem.dataset.title);
    elem.destroy();
  }

  Blocks.register('menu', menu);
  Blocks.register('title', title);
})();
