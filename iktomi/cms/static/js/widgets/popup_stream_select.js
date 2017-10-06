function add_url_params(url, params, replace_params){
  var p = '';
  for(var name in params){
    if(replace_params){
      var r = new RegExp(name + '=[^&#$]+',"gi")

      if(r.test(url)) {
        url = url.replace(r, '');
        url = url.replace(/&+/g, '&').replace(/\?&+/g, '?');
      }
      p += name + '=' + params[name] + '&';


    } else {
      if(params[name]!==false){
        p += (new RegExp(name + '=' + params[name],"i").test(url)) ? '' : (name + '=' + params[name] + '&');
      }
    }
  }
  p = p.replace(/&$/,'');
  return url + (/\?/.test(url) ? ('&'+p) : ('?'+p))
}

var PopupStreamSelect = new Class({

  Implements: [Options, Events],

  options: {
    container: null,
    title: null,
    url: null,
    create_url: null,
    input_name: null,
    sortable: true,
    unshift: false,
    rel: null,
    allow_delete: true
  },

  _select_items: [],
  _selected_items: [],
  _input: null,
  _items_div: null,
  _multiple: false,


  initialize: function(readonly, options) {
    this.setOptions(options);
    this.container = $(this.options.container);
    this.container.store('widget', this);
    this.inputPlace = this.container.getElement('.input-place');
    this.readonly = readonly;
    this.btn = $(this.options.container + '-btn');
    this.createBtns = this.container.getElements('[rel=create]');
    this.createBtns.addEvent('click', this.createBtnClick.bind(this))
    this.popup = new Popup();
    this.setup();
    if (! this.readonly ){
      this.showControls();
    }

    this.options.sortable = this.options.sortable && this._multiple;

    if (this.options.sortable){
      this._makeDragable();
    }
  },

  createBtnClick: function(e){
    e.preventDefault();
    e.stopPropagation();
    this.load(e.target.get('href'));
    return false;
  },

  hasValue: function(v) {
    return this.getInput().value == v;
  },

  postSetup: function() {
    if (this.getItemsDiv().getFirst()) {
      if (! this.readonly ){
        this.addControls();
      }
      this.makeLinksExternal(this.getItemsDiv().getFirst());
    }
  },

  showControls: function() {
    if (this.btn) {
      this.btn.removeClass('hide');
    }
    this.createBtns.removeClass('hide');
  },

  addControls: function() {
    var row = this.getItemsDiv().getFirst();
    if (row) {
      if (row.getLast() && row.getLast().hasClass('w-control-cell')) {
        return;
      }
      if (this.options.allow_delete){
        var removeBtn = new Element('td').adopt(
          new Element('button', {
            'class': 'button button-tiny icon-delete',
            'type': 'button'
          }).addEvent('click', this.reset.bind(this))
        );
        row.adopt(removeBtn);
      }
    }
  },


  getLabel: function() {
    return this.container.getElement('.input-place label');
  },

  getInput: function() {
    return this.container.getElement('.input-place input');
  },

  getItemsDiv: function() {
    if (!this._items_div) {
      this._items_div = $(this.options.container + '-div');
    }
    return this._items_div;
  },

  setup: function() {

    if (this.btn) {
      this.btn.addEvent('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.show();
      }.bind(this));
    }
    this.popup.contentEl.addEvent('load', this.patchItemForm.bind(this));
    this.popup.contentEl.addEvent('load', this.popup.onWindowResize.bind(this.popup));

    this.popup.contentEl.addEvent('click', function(e){
        var a = e.target.match('a[data-id]') ?
                    e.target:
                    e.target.getParent('a[data-id]');
        if (a){
            e.preventDefault();
            e.stopPropagation();
            var item = a.getParent('.item');
            this.onItemClicked(item, a.dataset.id);
        }
    }.bind(this), true);

    this.postSetup();
    this.setState();
  },

  show: function(callback, url) {
    this.popup.setTitle(this.options.title);
    this.load(url || this.options.url, callback);
  },

  load: function(url, callback) {
    this.popup.show_loader();
    url = add_url_params(url, {'__popup':'', '__multiple':this._multiple});
    new Request({
      'url': url,
      'onSuccess': function(result) {
        renderPage(result, this.popup.contentEl);
        this.onContentRecieved(result);
        if (callback) {
          callback();
        }
      }.bind(this)
    }).get();
  },

  patchItemForm: function(){
    // create popup magic is here!
    var frm = this.popup.contentEl.getElement('.item-form');
    if (frm){
      frm.retrieve('ItemForm')._callback_hook = function(result, callback) {
        /* вызывается при успешном сохранении нового объекта */
        if (result.item_id && this._selected_items.indexOf(result.item_id) < 0) {
          this._select_items.push(result.item_id);
          // Show only created item in stream after redirection
          var urlWithId = this.options.url +
                            (this.options.url.indexOf('?') == -1? '?': '&') +
                            'id='+result.item_id;
          this.show(callback, urlWithId);
        }
      }.bind(this);
    }
  },

  onContentRecieved: function(result) {
    this.popup.hide_loader();
    var stream = this.popup.contentEl.getElement('.stream');
    if (stream) {
      var id = this._select_items.pop();
      if(id){
          var item = this.popup.el.getElement('.itemlist .item a[data-id='+id+']').getParent('.item');
          this.onItemClicked(item, id);
      }
      this.markSelectedItems();
    }
    this.attachContentEvents();
    this.popup.show();
    var liveSearch = this.popup.el.getElement('label[class=livesearch]');
    if(liveSearch){
        liveSearch.getElement('input').focus();
    }
  },

  addSelectAllButtons: function(html, scripts, redirect) {
    var selectButton = new Element('a', {'href':'javascript:void(0)',
                                         'text':'выбрать все',
                                         'class':'button'});
    var deselectButton = new Element('a', {'href':'javascript:void(0)',
                                         'text':'убрать выбор текущих',
                                         'class':'button'});

    selectButton.addEvent('click', function(e) {
        this.popup.contentEl.getElements('.stream-items .item').each(function(item) {
            var id = item.getElement('a').dataset.id;
            if (this._selected_items.indexOf(id) == -1) {
                this.add(item, id);
            }
        }.bind(this));
    }.bind(this));

    deselectButton.addEvent('click', function(e) {
        this.popup.contentEl.getElements('.stream-items .item').each(function(item) {
            var id = item.getElement('a').dataset.id;
            if (this._selected_items.indexOf(id) != -1) {
                this.remove(id);
            }
        }.bind(this));
    }.bind(this));

    this.popup.contentEl.adopt(selectButton, deselectButton);
  },

  markSelectedItems: function() {
    //console.log('Mark selected items')
    this.popup.el.getElements('.itemlist .item').each(function(item) {
      var link = item.getElement('a[data-id]');
      if (link) {
        var id = link.dataset.id;
        if (this.hasValue(id)) {
          item.addClass('selected');
        }
      }
    }.bind(this));
  },

  submitItemForm: function(frm){
    this.popup.show_loader();
    var url = frm.get('action');
    url = add_url_params(url, {'__popup':'', '__multiple':this._multiple, '__ajax': ''});
    new Request.IFRAME({
      'url': url,
      'onSuccess': function(result) {
        this.onContentRecieved(result);
      }.bind(this)
    }).post(frm);
  },

  attachContentEvents: function() {
    // XXX be careful! Called multiple times on each form
    // XXX
    var frm = this.popup.el.getElement('.filter-form');
    if (frm) {
      frm.retrieve('filterForm').removeEvents('load').addEvent('load', function(){
        this.attachContentEvents();
        this.markSelectedItems();
      }.bind(this));
    }

    // XXX get id from ItemForm and add to the list
  },

  reset: function() {
    this.getInput().value = '';
    this.getLabel().set('text', '');
    this.getItemsDiv().empty();
    delete this._input;
    delete this._items_div;
  },

  onItemClicked: function(item, id) {
    this.getInput().value = id;
    this.getLabel().set('text', item.dataset.title||'');

    var clone = item.clone();
    clone.getElements('input,select,textarea').destroy();
    this.makeLinksExternal(clone);
    this.getItemsDiv().empty().adopt(clone);
    this.popup.hide();
    this.addControls();

    this.onChange();
  },

  onChange: function(){
    this.setState();
    this.fireEvent('change', this.container);

    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("change", true, true);
    this.container.dispatchEvent(evt);
  },

  makeLinksExternal: function(el) {
    if (this.options.rel === null){
      el.getElements('a').each(function(a){
          if (!a.get('rel')){
              a.setProperty('target', '_blank');
          }
      })
    } else {
      el.getElements('a').setProperty('rel', this.options.rel);
    }
  },

  setState: function(el){
    var empty = !this.container.getElement('.w-popup-stream-select-items tr');
    this.container.toggleClass('empty', empty);
  }//,

  //onFilterSubmitClicked: function() {
  //  var frm = this.popup.el.getElement('.filter-form');
  //  var url = this.options.url + (/\?/.test(this.options.url) ? '&' : '?' ) + frm.toQueryString();
  //  this.load(url);
  //},

  //onPaginatorClicked: function(url) {
  //  this.load(url);
  //}

});


var PopupStreamSelectMultiple = new Class({

  Binds: ['redrawOrderClasses', 'updateReorderedMapping'],
  Extends: PopupStreamSelect,

  _selected_items: [],
  _inputs: [],
  _labels: [],
  _map: {},
  _rows: [],
  _multiple: true,

  postSetup: function() {
    var i = 1;
    while($(this.options.container + '-input-' + i)) {
      var input = $(this.options.container + '-input-' + i);
      this._inputs.push(input);
      this._selected_items.push(input.value);
      this._map[input.value] = i - 1;
      var row = this.getItemsDiv().getChildren()[i-1];
      this.makeLinksExternal(row)
      this._rows.push(row);
      i++;
    }
    this._inputCounter = i;

    if (!this.readonly) {
      this.addControls();
    }

    this.addEvent('reorder', this.redrawOrderClasses);
    this.addEvent('reorder', this.updateReorderedMapping);

  },

  updateReorderedMapping: function() {
    var inputs = this._inputs, index = 0;
    this._map = {}, this._rows = [], this._inputs = [];
    this.getItemsDiv().getChildren('.item').each(function(row) {
      var link = row.getElement('a[data-id]');
      if (link) {
        var id = parseInt(link.dataset.id, 10);
        this._map[id] = index;
        inputs.each(function(input) {
          if (input.value == id ) {
            input.inject(input.getParent());
            this._inputs.push(input);
          }
        }.bind(this));
        this._rows.push(row);
        index++;
      }
    }.bind(this));
  },

  redrawOrderClasses: function(row) {
    // XXX make on CSS
    var index = 0;
    this.getItemsDiv().getElements('.item').each(function(row) {
      row.removeClass('odd').removeClass('even');
      row.addClass(++index % 2 ? 'odd' : 'even');
    });
  },

  hasValue: function(v) {
    return this._selected_items.indexOf(v) != -1;
  },

  _createOrderButtons: function(row) {
    var sortTd = new Element('td', {'class': 'w-control-cell'});
    var upBtn = new Element('a', {'class': 'up-btn', html: '&uarr;', href: '#up'});
    var downBtn = new Element('a', {'class': 'down-btn', html: '&darr;', href: '#down'});

    upBtn.addEvent('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var offset1 = row.offsetTop;
      if (row.getPrevious()) {
        row.inject(row.getPrevious(), 'before');
      }
      this.fireEvent('reorder', row);
      scrollAfterSort(row, offset1);
    }.bind(this));

    downBtn.addEvent('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var offset1 = row.offsetTop;
      if (row.getNext()) {
        row.inject(row.getNext(), 'after');
      }
      this.fireEvent('reorder', row);
      scrollAfterSort(row, offset1);
    }.bind(this));

    sortTd.adopt(upBtn, downBtn);
    return sortTd;
  },

  _addOrderButtons: function(row) {
    if (this.options.sortable){
      row.adopt(this._createOrderButtons(row));
    }
  },

  _createRemoveButton: function(row) {
    var removeBtn = new Element('td', {'class': 'w-control-cell'});
    removeBtn.adopt(new Element('button', {'type': 'button', 'class': 'button button-tiny icon-delete'}));
    var id = this._selected_items[this._rows.indexOf(row)];
    removeBtn.getFirst().addEvent('click', function(e) {
      this.remove(id);
    }.bind(this));
    return removeBtn;
  },

  _addRemoveButton: function(row) {
    row.adopt(this._createRemoveButton(row));
  },

  _addControls: function(row) {
    if (row.getLast() && row.getLast().hasClass('w-control-cell')) {
      return;
    }

    this._addOrderButtons(row);
    if(this.options.allow_delete){
      this._addRemoveButton(row);
    }
  },

  addControls: function() {
    this.getItemsDiv().getChildren().each(this._addControls.bind(this));
  },

  reset: function() {
    new Elements(this._inputs).destroy();
    this._inputs = [];
    this._rows = [];
    this.getItemsDiv().empty();
    this._selected_items = [];

    this.onChange();

  },

  newInput: function(item, value){

      var input = new Element('input', {type: 'checkbox',
                                        checked: 'checked',
                                        name: this.options.input_name,
                                        id: this.container.id + '-input-' + (this._inputCounter++) });
      input.value = value || '';

      new Element('label', {'for': input.id,
                            'text': item.dataset.title || ''
                            }).inject(this.container.getElement('.input-place'));
      return input;
  },

  getInput: function(index) {
    return this._inputs[index];
  },
  getIndexById: function(id) {
    // Return index of first element in _inputs with given id. Return -1 if not found.
    for (var i = 0; i < this._inputs.length; i++) {
      if (this._inputs[i].value === id) {
        return i;
      }
    }
  },
  getLabel: function(index) {
    return this.container.getElement('label[for="'+this.getInput(index).id+'"]');
  },

  add: function(item, id) {
    var row = item.clone();
    this.makeLinksExternal(row);
    if (this.options.unshift && this._inputs.length > 0) {
      // add to the first position
      var input = this.newInput(item, id);
      input.inject(this._inputs[0], 'before');
      this._inputs.unshift(input);
      this._selected_items.unshift(id);
      this._rows.unshift(row);
      row.inject(this.getItemsDiv(), 'top');
    } else {
      // add to the end
      var input = this.newInput(item, id);
      input.inject(this.inputPlace);
      this._inputs.push(input);
      this._selected_items.push(id);
      this._rows.push(row);
      this.getItemsDiv().adopt(row);
    }

    this.addControls();
    item.addClass('selected');

    this.onChange();

  },

  remove: function(id) {
    var
    link, item,
    index = this.getIndexById(id),
    remove = (function() {
      var input = this.getInput(index);
      this.container.getElement('label[for="'+input.id+'"]').destroy();
      input.destroy();
      this._rows[index].destroy();
      this._inputs.splice(index, 1);
      _sel_item_index = this._selected_items.indexOf(input.value)
      this._selected_items.splice(_sel_item_index, 1);
      this._rows.splice(index, 1);
      this.onChange();
    }).bind(this);

    if (this.popup.el.getStyle('display') == 'block') {
      link = this.popup.el.getElement('a[data-id=' + id + ']');
      if (link) {
        item = link.getParent('.item');
        item.removeClass('selected');
      }
      remove();
    } else {
      new Fx.Tween(this._rows[index], {
        property: 'opacity',
        onComplete: remove.bind(this),
        duration: 300
      }).start(0);
    }

  },

  onItemClicked: function(item, id) {
    if (this._selected_items.indexOf(id) == -1) {
      this.add(item, id);
    } else {
      this.remove(id);
    }
  },

  _makeDragable: function() {
    var tbody = $(this.options.container+'-div');
    tbody.addClass('dragable');
    this._sortable = new Sortables(tbody, {

      onStart: function(row, clone) {
        row.addClass('dragged');
      },
      onComplete: function(row) {
        row.removeClass('dragged');
        this.fireEvent('reorder', row);
      }.bind(this)

    });
  },

  onContentRecieved: function(result) {
    this.popup.hide_loader();
    var stream = this.popup.contentEl.getElement('.stream');
    if (stream) {
      var id = this._select_items.pop();
      while(id) {
        var item = this.popup.el.getElement('.itemlist .item a[data-id='+id+']').getParent('.item');
        if (this._selected_items.indexOf(''+id) == -1) {
          this.add(item, ''+id);
        } else{
          this.remove(''+id);
          this.add(item, ''+id);
        }
        id = this._select_items.pop();
      }

      this.markSelectedItems();
      this.addSelectAllButtons();
    }
    this.attachContentEvents();
    this.popup.show();
    var liveSearch = this.popup.el.getElement('label[class=livesearch]');
    if(liveSearch){
        liveSearch.getElement('input').focus();
    }
  },

});

Blocks.register('popup-stream-select', function(el){
  if (el.dataset.multiple){
    new PopupStreamSelectMultiple(!!el.dataset.readonly,
                                  JSON.parse(el.dataset.config));
  } else {
    new PopupStreamSelect(!!el.dataset.readonly,
                          JSON.parse(el.dataset.config));
  }
});

