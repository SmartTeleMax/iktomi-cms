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
    unshift: false
  },

  _input: null,
  _items_div: null,
  _multiple: false,


  initialize: function(readonly, options) {
    this.setOptions(options);
    this.container = $(this.options.container);
    this.container.store('widget', this);
    this.readonly = readonly;
    this.btn = $(this.options.container + '-btn');
    // XXX disabled
    if (this.options.create_url) {
      this.createBtn = $(this.options.container + '-create');
      this.createBtn.addEvent('click', function(){
        this.load(this.options.create_url);
        return false;
      }.bind(this))

    } else {
      this.createBtn = null;
    }
    this.popup = new Popup();
    this.setup();
    if (! this.readonly ){
      this.showControls();
    }
  },

  hasValue: function(v) {
    return this.getInput().value == v;
  },

  postSetup: function() {
    if (this.getItemsDiv().getFirst()) {
      if (! this.readonly ){
        this.addRemoveButton();
      }
      this.makeLinksExternal(this.getItemsDiv().getFirst());
    }
  },

  showControls: function() {
    if (this.btn) {
      this.btn.removeClass('hide');
    }
    if (this.createBtn) {
      this.createBtn.removeClass('hide');
    }
  },

  addRemoveButton: function() {
    var row = this.getItemsDiv().getFirst();
    if (row) {
      if (row.getLast() && row.getLast().hasClass('w-control-cell')) {
        return;
      }
      var removeBtn = new Element('td').adopt(new Element('a', {'class': 'remove'}));
      removeBtn.getFirst().addEvent('click', this.reset.bind(this));
      row.adopt(removeBtn);
    }
  },

  getInput: function() {
    if (!this._input) {
      if ($(this.options.container + '-input')) {
        this._input = $(this.options.container + '-input');
      } else {
        this._input = new Element('input', {type: 'hidden', name: this.options.input_name});
        this._input.inject(this.container);
      }
    }
    return this._input;
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

    this.postSetup();

  },

  show: function() {
    this.popup.setTitle(this.options.title);
    this.load(this.options.url);
  },

  load: function(url) {
    this.popup.show_loader();
    url = add_url_params(url, {'__popup':'', '__multiple':this._multiple});
    new Request.JSON({
      'url': url,
      'onSuccess': function(result) {
        this.onContentRecieved(result);
      }.bind(this)
    }).get();
  },

  onContentRecieved: function(result, redirect) {
    this.popup.hide_loader();
    this.popup.setContent(result.html);
    Blocks.init(this.popup.contentEl);

    this.attachContentEvents();
    this.markSelectedItems();
    this.popup.show();

    console.log('popup loaded', result);
    //var redirect_url = $('redirect_url');

    //if(redirect && redirect_url){
    //  XXX what is this?!
    //  var items = this.popup.contentEl.getElements('.item');
    //  items.each(function(item){

    //    var id = item.getElement('a[rel]').get('rel').replace(/^(id:)/, '');
    //    var click = true;
    //    for(var i in this._selected_items){
    //      if(this._selected_items[i]==id){
    //        click = false;
    //      }
    //    }
    //    if(click){
    //      this.onItemClicked(item, id)
    //    }
    //  }.bind(this));
    //  if(redirect_url){
    //    this.load(redirect_url.get('value'));
    //  }
    //  return
    //}

  },

  markSelectedItems: function() {
    console.log('Mark selecteed items')
    this.popup.el.getElements('.itemlist .item').each(function(item) {
      var link = item.getElement('a[rel^=id]');
      if (link) {
        var id = link.getProperty('rel').replace(/^(id:)/, '');
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
        this.onContentRecieved(result, true);
      }.bind(this)
    }).post(frm)
  },

  attachContentEvents: function() {
    // XXX be careful! Called multiple times on each form

    this.popup.el.getElements('.itemlist .item').each(function(item) {

      item.getElements('a[rel]').each(function(a) {

        a.addEvent('click', function(e) {
          e.preventDefault();
        e.stopPropagation();
          this.onItemClicked(item, a.getProperty('rel').match(/^id:(.*)+/)[1]);
        }.bind(this));

      }.bind(this));

    }.bind(this));

    // XXX
    var frm = this.popup.el.getElement('.filter-form');
    if (frm) {
      frm.retrieve('filterForm').removeEvents('load').addEvent('load', function(){
        console.log('loaded new content')
        this.attachContentEvents();
        this.markSelectedItems();
      }.bind(this));
    }

    // XXX get id from ItemForm and add to the list
  },

  reset: function() {
    this.getInput().dispose();
    this.getItemsDiv().empty();
    delete this._input;
    delete this._items_div;

    this.fireEvent('change', this.container);

  },

  onItemClicked: function(item, id) {
    this.getInput().value = id;
    var clone = item.clone();
    this.makeLinksExternal(clone);
    this.getItemsDiv().empty().adopt(clone);
    this.popup.hide();
    this.addRemoveButton();

    this.fireEvent('change', this.container);

  },

  makeLinksExternal: function(el) {
    el.getElements('a').setProperty('target', '_blank');
  },

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
    if (!this.readonly) {
      this.addRemoveButton();
    }

    this.addEvent('reorder', this.redrawOrderClasses);
    this.addEvent('reorder', this.updateReorderedMapping);

  },

  updateReorderedMapping: function() {
    var inputs = this._inputs, index = 0;
    this._map = {}, this._rows = [], this._inputs = [];
    this.getItemsDiv().getChildren('.item').each(function(row) {
      var id = row.getElements('a').getProperty('rel').filter(function(rel) {
        return /^id:\d+$/.test(rel);
      }).getLast();
      if (id) {
        id = parseInt(id.replace('id:', ''));
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
    var index = 0;
    this.getItemsDiv().getElements('.item').each(function(row) {
      row.removeClass('odd').removeClass('even');
      row.addClass(++index % 2 ? 'odd' : 'even');
    });
  },

  hasValue: function(v) {
    return this._selected_items.indexOf(v) != -1;
  },

  addRemoveButton: function() {
    this.getItemsDiv().getChildren().each(function(row) {

      if (row.getLast() && row.getLast().hasClass('w-control-cell')) {
        return;
      }

      var
      sortTd = new Element('td', {'class': 'w-control-cell'}),
      upBtn = new Element('a', {'class': 'up-btn', html: '&uarr;', href: '#up'}),
      downBtn = new Element('a', {'class': 'down-btn', html: '&darr;', href: '#down'});

      upBtn.addEvent('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        with (row) {
          if (getPrevious()) {
            inject(getPrevious(), 'before');
          }
        }
        this.fireEvent('reorder', row);
      }.bind(this));

      downBtn.addEvent('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        with (row) {
          if (getNext()) {
            inject(getNext(), 'after');

          }
        }
        this.fireEvent('reorder', row);
      }.bind(this));

      sortTd.adopt(upBtn, downBtn);
      row.adopt(sortTd);

      var removeBtn = new Element('td', {'class': 'w-control-cell'});
      removeBtn.adopt(new Element('a', {'class': 'remove'}));
      var id = this._selected_items[this._rows.indexOf(row)];
      removeBtn.getFirst().addEvent('click', function(e) {
        this.remove(id);
      }.bind(this));

      row.adopt(removeBtn);

    }.bind(this));
  },

  reset: function() {
    new Elements(this._inputs).dispose();
    this._inputs = [];
    this._map = {};
    this._rows = [];
    this.getItemsDiv().empty();
    this._selected_items = [];

    this.fireEvent('change', this.container);

  },

  getInput: function(index) {
    if (index >= this._inputs.length) {
      var input = new Element('input', {type: 'hidden', name: this.options.input_name});
      this._inputs.push(input);
      input.inject(this.container);
    }
    return this._inputs[index];
  },

  add: function(item, id) {
    var row = item.clone();
    this.makeLinksExternal(row);
    if (this.options.unshift) {
      for (key in this._map) {
        this._map[key] = this._map[key] + 1;
      }
      this._map[id] = 0;
      if (this._inputs.length > 0) {
        var input = new Element('input', {type: 'hidden', name: this.options.input_name, value: id});
        input.inject(this._inputs[0], 'before');
        this._inputs.unshift(input);
      } else {
        this.getInput(0).value = id;
      }
      this._selected_items.unshift(id);
      this._rows.unshift(row);
      row.inject(this.getItemsDiv(), 'top');
    } else {
      this._map[id] = this._inputs.length;
      this.getInput(this._map[id]).value = id;
      this._selected_items.push(id);
      this._rows.push(row);
      this.getItemsDiv().adopt(row);
    }

    this.addRemoveButton();
    item.addClass('selected');

    this.fireEvent('change', this.container);

  },

  remove: function(id) {
    var
    link, item,
    index = this._map[id],
    remove = (function() {
      this.getInput(index).dispose();
      this._rows[index].dispose();
      delete this._inputs[index];
      delete this._selected_items[index];
      delete this._rows[index];
      this.fireEvent('change', this.container);
    }).bind(this);

    if (this.popup.el.getStyle('display') == 'block') {
      link = this.popup.el.getElement('a[rel=id:' + id + ']');
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
  }

});

Blocks.register('popup-stream-select', function(el){
  if (el.dataset.multiple){
    new PopupStreamSelectMultiple(!!el.dataset.readonly,
                                  JSON.parse(el.dataset.config));
  } else {
    new PopupStreamSelect(el.dataset.readonly && false,
                          JSON.parse(el.dataset.config));
  }
});
