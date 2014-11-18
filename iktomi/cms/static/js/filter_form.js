(function(){
  function FilterForm(form){
    this.form = form;
    this.$events = {}; // XXX is not copied
    form.store('filterForm', this);
    form.store('submitFilter', this.submit.bind(this));
    this.paginator();
    this.$events = {};
    this.changeUrl = !this.form.getParent('.popup');
    form.getElement('.sidefilter__submit').addEvent('click', this.onSubmitClick.bind(this));
    form.getElement('.sidefilter__clear').addEvent('click', this.onClearClick.bind(this));
    form.getElement('.sidefilter-close').addEvent('click', function(e){
      this.form.getParent('.sidefilter').toggleClass('is-open');
    }.bind(this));
    form.getElement('.sidefilter-tags').addEvent('click', function(e){
      this.form.getParent('.sidefilter').toggleClass('is-open');
    }.bind(this));

    this.setFilters();

    //form.getParent('.sidefilter').addEvent('click', function(){
    //  this.form.getParent('.sidefilter').addClass('is-open');
    //}.bind(this));
  }
 
  FilterForm.prototype = {
    'getSubmitUrl': function() {
      var qs = this.form.toQueryString();
      qs = qs.replace(/[^&]+=\.?(?:&|$)/g, '').replace(/&$/, '');
      return this.form.getProperty('action') + '?' + qs;
    },
    'submit': function(url){
      url = (url === undefined? this.getSubmitUrl(): url);

      var form = this.form;
      new Request({
        'url': url + (url.indexOf('?') == -1? '?': '&') + '__ajax&__no_layout',
        'onSuccess': function(result){
          if (this.changeUrl){
            history.pushState(null, null, url);
          }
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
          this.form.getParent('.sidefilter').removeClass('is-open');
          this.setFilters();

        }.bind(this)
      }).get();
    },

    'setFilters': function(){
      var tags = this.form.getElement('.sidefilter-tags');
      tags.empty();

      var inputs = this.form.getElements('input,select,textarea').each(function(el){
        var label = null;
        if (! el.get('value') || ! el.name || el.name == 'sort') { return; }

        if (el.tagName == 'INPUT') {
          if (el.type == 'checkbox' || el.type=='radio'){
            if (! el.checked){ return; }
            if (el.id){
              var labelElement = document.getElement('label[for="'+el.id+'"]');
              label = label || (labelElement? labelElement.get('text'): null);
            }
          }
          if (el.type == 'text'){
            label = el.get('value');
          }
        }
        if (el.tagName == 'TEXTAREA'){
          label = el.get('value');
        }
        if (el.tagName == 'SELECT') {
          var labelElement = el.getElement('option[value="'+el.get('value')+'"]');
          label = label ||  (labelElement? labelElement.get('text'): null);
        }
        if (!label){
          label = el.get('name') + '=' + el.get('value');
        }
        tags.appendChild(new Element('span', {'text': label}));
      });
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
    },

    onClearClick: function(e) {
      e.preventDefault();
      this.form.getElements('.w-popup-stream-select').each(function(item) {
          item.getElements('input').each(function(item) {
              item.destroy();
          });
          item.getElements('.item').each(function(item) {
              item.destroy();
          });
      });

      this.form.reset();
      this.form.retrieve('submitFilter')();
    }
  };

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

  FilterForm.implement(Events.prototype);

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
