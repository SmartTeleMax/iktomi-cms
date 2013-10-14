var FieldList = new Class({
  Implements: [Events],

  initialize: function(container, template, order, allowCreate, allowDelete, limit) {
    this.container = $(container);
    this.template = template;
    this.inputName = this.container.dataset.inputName;
    this.order = order;
    this.container.store('widget', this);
    this.limit = limit;
    this.currentCount = this.len();
    this.addBtn = this.btn('#add', 'button', 'Добавить', this.add.bind(this));
    if (allowCreate){
        this.addBtn.inject(this.container, 'after');
    }
    this.allowDelete = allowDelete;

    this.setup();

    this.fireEvent('ready', this);
  },
  len: function() {
    return this.container.getElements('[name=' + this.inputName + '-indeces]').length;
  },
  items: function() {
    return this.container.getLast().getChildren().filter(function(c) {
      return c.hasClass('fieldlist-item');
    });
  },
  btn: function(href, classname, caption, callback) {
    var el = new Element('a', {href: href, 'class': classname});
    if(caption){
      el.set('html', caption);
    }
    el.addEvent('click', callback ? callback : $empty);
    return el
  },
  setup: function() {
    if(this.currentCount >= this.limit){
      this.addBtn.addClass('hide');
    }

    this.items().each(function(tr){
      this.installDeleteBtn(tr.getLast(), tr);
      if (this.order) {
        this.installSortBtns(tr.getLast().getPrevious(), tr);
      }
      this.fireEvent('add', tr);
    }.bind(this));
  },

  installDeleteBtn: function(wrap, tr) {
    if(this.allowDelete && !wrap.getElement('a.remove')){
      wrap.adopt(this.btn('#remove', 'remove', null, function(e){
        e.stopPropagation(); e.preventDefault();
        if(tr.getPrevious('.fieldlist-spacer')){
          tr.getPrevious('.fieldlist-spacer').destroy();
        } else if(tr.getNext('.fieldlist-spacer')) {
          tr.getNext('.fieldlist-spacer').destroy();
        }
        tr.destroy();
        this.currentCount--;
        if(this.limit>0 && this.currentCount<this.limit){
          this.addBtn.removeClass('hide');
        }
        this.fireEvent('delete', tr);
      }.bind(this)));
    }
  },

  installSortBtns: function(wrap, tr) {
    if(!wrap.getElement('a.sort')){
      wrap.adopt(this.btn('#up', 'sort sort-up', '&uarr;', function(e){
        e.stopPropagation(); e.preventDefault();
        if (tr.getPrevious('.fieldlist-item')) {
              var spacer = tr.getPrevious('.fieldlist-spacer');
              if(spacer){
                spacer.inject(tr.getPrevious('.fieldlist-item'), 'before');
                tr.inject(spacer, 'before');
              }
              tr.highlight('#fefeb0', '#fafafa');
        }
        this.fireEvent('reorder', this.items.bind(this));
      }.bind(this)));
      wrap.adopt(this.btn('#down', 'sort sort-down', '&darr;', function(e){
        e.stopPropagation(); e.preventDefault();
        if (tr.getNext('.fieldlist-item')) {
              var spacer = tr.getNext('.fieldlist-spacer');
              if(spacer){
                spacer.inject(tr.getNext('.fieldlist-item'), 'after');
                tr.inject(spacer, 'after');
              }
              tr.highlight('#fefeb0', '#fafafa');
        }
        this.fireEvent('reorder', this.items.bind(this));
      }.bind(this)));
    }
  },

  add: function(e) {
    e.stopPropagation(); e.preventDefault();
    this.currentCount++;
    if(this.limit>0){
      if(this.currentCount > this.limit)
        return
      if(this.currentCount == this.limit)
        this.addBtn.addClass('hide');
    }
    var next = 0;
    this.container.getElements('[name=' + this.inputName + '-indeces]').each(function(input){
      var value = parseInt(input.value);
      if (value >= next) {
        next = value;
      }
    });
    next++;

    var t = this.template;
    var marker = '%' + this.inputName + '-index' + '%';
    while(t.test(marker)){
      t = t.replace(marker, next);
    }

    var line = new Element('tr', {'class':'fieldlist-item'});
    var fieldTd = new Element('td', {html: t}).inject(line);

    if (this.order) {
      var sortBtnTd = new Element('td', {'class':'fieldlist-btns'}).inject(line);
      this.installSortBtns(sortBtnTd, line);
    }
    var deleteBtnTd = new Element('td', {'class':'fieldlist-btns'}).inject(line);
    this.installDeleteBtn(deleteBtnTd, line);
    fieldTd.adopt(new Element('input', {'type': 'hidden', name: this.inputName + '-indeces', value: next}));

    /*spacer line*/
    var spacer = new Element('tr', {'class':'fieldlist-spacer'});
    if(this.order){
      spacer.adopt(new Element('td', {'colspan':3}));
    } else {
      spacer.adopt(new Element('td', {'colspan':2}));
    }
    if(this.container.getFirst().getLast())
      this.container.getFirst().adopt(spacer);
    this.container.getFirst().adopt(line);
    line.highlight('#fefeb0', '#fafafa');

    Blocks.init(fieldTd);

    this.fireEvent('add', line);
  }
});

Blocks.register('fieldlist', function(el){
        new FieldList(el, el.dataset.template, el.dataset.order, true, true, el.dataset.maxLength);
})
