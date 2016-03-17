(function(){
  function LiveSearch(input){
    this.input = input;
    this.input.store('widget', this);
    this.filterForm = input.getParent('.stream').getElement('.filter-form');

    this.searchInput = this.filterForm.getElement(this.filterForm.dataset.searchInput) ||
                       this.filterForm.getElement('input[name=search]') ||
                       this.filterForm.getElement('input[name=title]');
    this.processSearchItems();
    window.setTimeout(function() {
        var h = this.processSearchItems.bind(this);
        this.filterForm.retrieve('filterForm').addEvent('load', h);
    }.bind(this), 1);
    this._value = null; 
    this._submitTimeout = null;


    this.input.addEventListener('input', this.onInput.bind(this), false);
    //input.addEventListener('keydown', onKeySmth, false);
    //input.addEventListener('keyup', onKeySmth, false);
  }


  LiveSearch.prototype = {

    processSearchItems: function(){
      if (this.searchInput) { return; }
      var items = this.input.getParent('.stream').getElements('.items .item');
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
    },

    search: function() {
      if (this.searchInput){
          this.searchInput.value = this.input.value;
          this.filterForm.retrieve('filterForm').submit();
      } else {
          var value = this.input.value;
          var items = this.input.getParent('.stream').getElements('.items .item');
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
    },

    setFilters: function(){
      var livesearch = this.input.getParent('.livesearch');
      livesearch.getElements('span').destroy();
      var tagsPlace = this.input;

      var inputs = this.filterForm.getElements('input,select,textarea').each(function(el){
        var label = null;

        if (el == this.searchInput) {
          this.input.value = this.input.value || this.searchInput.value;
          this.adjustInput();
          return;
        }

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
        new Element('span', {'text': label}).inject(tagsPlace, 'before');
      }.bind(this));
    },

    adjustInput: function(){
      this.input.setStyle('width', 150); 
      this.input.setStyle('width', Math.max(150, this.input.scrollWidth)); 
    },

    onInput: function(e) {
      if (this._submitTimeout) { window.clearTimeout(this._submitTimeout); }

      var timeout = this.searchInput? 500: 200;
      this._submitTimeout = window.setTimeout(this.search.bind(this), timeout);
      this.adjustInput();
      //if (this.input.value.length > 50) { debugger }
      //if (this.value != _value) {
      //  _value = this.value;
      //  search(this.value);
      //}
    }
  }
  Blocks.register('live-search', function(input) { new LiveSearch(input) });
})();
