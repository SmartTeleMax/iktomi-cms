(function(){
  function menu(elem){
    if(! elem.getParent('.popup')){
      $$('.navigation li.active').removeClass('active');
      var filterQuery = location.search.substr(1).split('&');
      var menuItems = $$('.navigation [data-endpoint="'+elem.dataset.menu+'"]');
      menuItems = menuItems.filter(function(element){
       if(element.tagName == 'A'){
         var links = [element];
       }else{
         var links = Array.prototype.slice.call(element.getElementsByTagName('A'));
       }
       return links.some(function(link){
          var linkFilters = (link.get('href').split('?')[1] || '').split('&');
          return filterQuery.some(function(filter){
            return linkFilters.indexOf(filter) >= 0;
          })
        });
      });
      if(menuItems.length > 0){
        menuItems.forEach(function(item){
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
    if(item){
      if (item.tagName == 'LI'){
          item.addClass('active');
      }
      item.getParents('li').addClass('active');
    }
  }

  function title(elem){
    console.warn('DEPRECATED title block, use <title> tag instead');
    if(! elem.getParent('.popup')){
      document.querySelector('title').set('html', elem.dataset.title);
      elem.destroy();
    }
  }

  Blocks.register('menu', menu);
  Blocks.register('title', title);
})();
