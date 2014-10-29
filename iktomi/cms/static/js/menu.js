(function(){
  function menu(elem){
    if(! elem.getParent('.popup')){
      $$('.navigation li.active').removeClass('active');
      var filter_query = location.search.substr(1).split('&');
      var menu_items = $$('.navigation [data-endpoint="'+elem.dataset.menu+'"]');
      menu_items = menu_items.filter(function(element){
       if(element.tagName == 'A'){
         var links = [element];
       }else{
         var links = [].slice.call(element.getElementsByTagName('A'));
       }
       return links.some(function(link){
          link_filters = (link.get('href').split('?')[1] || '').split('&');
          return filter_query.some(function(filter){
            return link_filters.indexOf(filter) >= 0;
          })
        });
      });
      if(menu_items){
        menu_items.forEach(function(item){
          makeActive(item);
        });
      }
      else{
        var active = document.getElement('.navigation [data-endpoint="'+elem.dataset.menu+'"]');
        makeActive(active);
      }
      
      elem.destroy()
    }
  }
    
  function makeActive(item){
    if (item.tagName == 'LI'){
        item.addClass('active');
      }
    item.getParents('li').addClass('active');
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
