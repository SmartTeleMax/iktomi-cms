(function(){
  function FilterForm(form){
    this.form = form;
    form.store('filterForm', this);
    form.store('submitFilter', function(){
      var url = form.getProperty('action') + '?' + form.toQueryString();
      this.submit(url);
    }.bind(this));
    this.paginator();
    this.$events = {};
    this.change_url = !this.form.getParent('.popup');
  }
 
  FilterForm.prototype = {
    'submit': function(url){
      console.log('SUBMIT')
      if (this.change_url){
        history.pushState(null, null, url);
      }
      var form = this.form;
      new Request.JSON({
        'url': url + (url.indexOf('?') == -1? '?': '&') + '__ajax&__no_layout',
        'onSuccess': function(result){
          if (this.change_url){
            window.current_url = url;
          }
          var container = form.getParent('.container').getElement('.stream-items');
          renderPage(result, container);
          this.fireEvent('load');
        }.bind(this)//,
        //'onFailure': function(e){
        //  flash('Ошибка при загрузке страницы: '+e.status, 'failure', 10*1000)
        //}
      }).get();
    },

    'paginator': function(){
      this.form.getParent('.container').addEventListener('click', function(e){
        var link = e.target.tagName == 'A'? e.target: e.target.getParent('a');
        if (link && e.target.getParent('.pages')){
          this.submit(link.getAttribute('href'));
          e.stop();
        }
      }.bind(this), false);
    }
  }

  function liveSearch(input){
    var items = input.getParent('.streamcontainer').getElement('.items').getElements('.item');
    items.each(function(item) {
      var texts = [];
      item.getElements('*').each(function(el) {
        var txts = Array.from(el.childNodes).filter(function(node) {
          return node.nodeType == document.TEXT_NODE;
        }).map(function(node){
          return node.data.toLowerCase().trim();
        })
        texts.append(txts);
      });
      texts = texts.join(' ');
      item.store('grep', function(value) {
        var words = value.split(/\s+?/).filter(function(x) { return x; });
        for(var i=0, l=words.length; i<l; i++) {
          if (! texts.test(words[i].toLowerCase())) {
            return false;
          }
        }
        return true;
      });
    });
    var _value = null; 
    function search(value) {
      if (!value) {
        items.setStyle('display', 'table-row');
      } else {
        items.each(function(item) {
          if (item.retrieve('grep')(value)) {
            item.setStyle('display', 'table-row');
          } else {
            item.setStyle('display', 'none');
          }
        });
      }
    }
    function onKeySmth(e) {
      if (this.value != _value) {
        _value = this.value;
        search(this.value);
      }
    }
    input.addEventListener('keydown', onKeySmth, false);
    input.addEventListener('keyup', onKeySmth, false);
    input.addEventListener('change', onKeySmth, false);
  }

  $extend(FilterForm.prototype, Events.prototype);

  Blocks.register('filter-form', function(elem){
    new FilterForm(elem);
  });
  Blocks.register('live-search', liveSearch);
})();
