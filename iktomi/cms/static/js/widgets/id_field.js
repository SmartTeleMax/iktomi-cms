(function(){
  function IdField(el){
    el.getElement('button').addEvent('click', function(){
      if (this.getParent('.popup')){
        this.getParent('form').retrieve('submitFilter')();
        return;
      }
      var value = el.getElement('input').value;
      if (value){
        var url = el.dataset.url.replace('ID', value) + window.location.search;
        loadPage(url);
      }
    });
  }

  Blocks.register('id-field', IdField);
})();
