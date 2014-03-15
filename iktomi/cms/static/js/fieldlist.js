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
    if(this.allowDelete && !wrap.getElement('a.icon-delete')){
      wrap.adopt(this.btn('#remove', 'button button-tiny icon-delete', null, function(e){
        e.stopPropagation(); e.preventDefault();
        tr.destroy();
        this.currentCount--;
        if(this.limit>0 && this.currentCount<this.limit){
          this.addBtn.removeClass('hide');
        }
        this.fireEvent('delete', tr);
      }.bind(this)));
    }
  },

  sortUpClick: function(e){
    e.preventDefault(); e.stopPropagation();
    var tr = e.target.getParent('tr');
    var offset1 = tr.offsetTop;
    var prev = tr.getPrevious('.fieldlist-item');
    if(prev){
      tr.inject(prev, 'before').highlight('#fefeb0', '#fafafa');
    }
    this.fireEvent('reorder', this.items.bind(this));
    scrollAfterSort(tr, offset1);
  },

  sortDownClick: function(e){
    e.preventDefault(); e.stopPropagation();
    var tr = e.target.getParent('tr');
    var offset1 = tr.offsetTop;
    var next = tr.getNext('.fieldlist-item');
    if(next){
      tr.inject(next, 'after').highlight('#fefeb0', '#fafafa');
    }
    this.fireEvent('reorder', this.items.bind(this));
    scrollAfterSort(tr, offset1);
  },

  installSortBtns: function(wrap, tr) {
    if(!wrap.getElement('a.sort')){
      wrap.adopt(this.btn('#up', 'sort sort-up', '&uarr;', this.sortUpClick.bind(this)));
      wrap.adopt(this.btn('#down', 'sort sort-down', '&darr;', this.sortDownClick.bind(this)));
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

    this.container.getFirst().adopt(line);
    line.highlight('#fefeb0', '#fafafa');

    Blocks.init(fieldTd);

    this.fireEvent('add', line);
  }
});

Blocks.register('fieldlist', function(el){
        new FieldList(el, el.dataset.template, el.dataset.order, !el.dataset.readonly, !el.dataset.readonly, el.dataset.maxLength);
})
