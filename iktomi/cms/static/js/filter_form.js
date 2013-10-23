(function(){
  function FilterForm(form){
    this.form = form;
    form.store('filterForm', this);
    form.store('submitFilter', function(){
      var qs = form.toQueryString();
      qs = qs.replace(/[^&]+=\.?(?:&|$)/g, '').replace(/&$/, '');
      var url = form.getProperty('action') + '?' + qs;
      this.submit(url);
    }.bind(this));
    this.paginator();
    this.$events = {};
    this.changeUrl = !this.form.getParent('.popup');
    form.getElement('.sidefilter__submit').addEvent('click', this.onSubmitClick.bind(this));
  }
 
  FilterForm.prototype = {
    'submit': function(url){
      console.log('SUBMIT')
      if (this.changeUrl){
        history.pushState(null, null, url);
      }
      var form = this.form;
      new Request({
        'url': url + (url.indexOf('?') == -1? '?': '&') + '__ajax&__no_layout',
        'onSuccess': function(result){
          //if (this.changeUrl){
          //  window.current_url = url;
          //}
          var container = form.getParent('.stream').getElement('.stream-items');
          renderPage(result, container);
          this.fireEvent('load');
          var addButton = this.form.getParent('.content').getElement('.js-button-add');
          if(addButton){
            var qs = url.split('?')[1];
            var href = addButton.get('href').split('?')[0] + (qs? '?' + qs: '');
            addButton.set('href', href);
          }
        }.bind(this)
      }).get();
    },

    'paginator': function(){
      this.form.getParent('.stream').addEventListener('click', function(e){
        var link = e.target.tagName == 'A'? e.target: e.target.getParent('a');
        if (link && e.target.getParent('.pages')){
          this.submit(link.getAttribute('href'));
          e.preventDefault(); e.stopPropagation();
        }
      }.bind(this), false);
    },

    onSubmitClick: function(e){
      e.preventDefault();
      this.form.retrieve('submitFilter')();
    }
  }

  function liveSearch(input){
    var items = input.getParent('.stream').getElement('.items').getElements('.item');
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
  Blocks.register('locked-icon', function(el){
    if(window.sessionStorage[el.dataset.guid] == el.dataset.editSession){
      // Hide lock icon if the lock belongs to actual browser tab
      el.destroy();
    }
  });
})();
