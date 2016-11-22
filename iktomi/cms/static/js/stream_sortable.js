(function(){
  var StreamSortable = new Class({
    Implements: [Options, Events],

    initialize: function(el){
      this.el = el;
      this.itemsBlock = el.getElement('.items>tbody');
      this.tfootTr = el.getElement('.items>tfoot>tr');
      this.itemsSelector = el.dataset.selector;
      this.items = this.itemsBlock.getChildren(this.itemsSelector);
      if(this.items.length > 1) {
        if (Browser.Engine.webkit){
          this.boxify();
          window.addEvent('resize', function(){
            this.unboxify();
            this.boxify();
          }.bind(this));
        }

        this.items.each(function(el){
          // Using native Drag API
          el.setProperty('draggable', 'true');
          el.setProperty('dropzone', 'true');
          el.addEventListener('dragstart', this.handleDragstart.bind(this), false);
          el.addEventListener('dragenter', this.handleDragenter.bind(this), false);
          el.addEventListener('dragend', this.handleDragend.bind(this), false);


          if(!el.getNext(this.itemsSelector)) {
            this.last = el;
          }

          var arr1 = new Element('a', {'class': 'sort-btn sort-up', 'html': '&uarr;'});
          arr1.addEventListener('click', this.sortUp.bind(this), false);

          var arr2 = new Element('a', {'class': 'sort-btn sort-down', 'html': '&darr;'});
          arr2.addEventListener('click', this.sortDown.bind(this), false);

          el.getElement('td.list-edit-item').adopt(arr1, arr2);
        }, this);

        this.tfootTr.setProperty('dropzone', 'true');
        this.tfootTr.addEventListener('dragenter', this.handleDragenter.bind(this), false);

        this.addEvent('change', this.handleChange);
      }

      this.el.getElements('.submit-list-edit').addEvent('click', this.handleSubmit.bind(this));
    },

    boxify: function(){
      // Chrome does not allow dragging on table-row elements, so we need to
      // transform them to block elements;
      var tdWidths = [];
      this.items[0].getChildren('td').each(function(el, i){
        tdWidths[i] = el.getWidth();
      })

      function boxifyTd(td, i){
        td.setStyles({width: tdWidths[i],
                      overflow: 'hidden',
                      display: 'inline-block',
                      'box-sizing': 'border-box'});
      }
      function fixTdHeight(td, i){
        td.setStyle('min-height', td.parentNode.getHeight());
      }

      for (var j = this.items.length; j--;){
        this.items[j].getChildren('td').each(boxifyTd);
      }
      this.items.setStyle('display', 'block');
      this.itemsBlock.setStyle('display', 'block');
      var theadTr = this.el.getElement('thead>tr');
      theadTr.setStyles({'white-space': 'nowrap',
                         'display': 'block',
                         'position': 'relative'});
      var ths = theadTr.getChildren('th').each(boxifyTd);
      var buttonThStyles = {display: 'block',
                            position: 'absolute',
                            width: 'auto',
                            padding: 0,
                            right: 0,
                            top: 0};
      ths[ths.length-1].setStyles(buttonThStyles);

      var tfootTr = this.el.getElement('tfoot>tr');
      tfootTr.setStyles({'white-space': 'nowrap',
                         'display': 'block',
                         'position': 'relative',
                         'width': '100%',
                         'min-height': '30px'})
      var tds = tfootTr.getChildren('td');
      tds[tds.length-1].setStyles(buttonThStyles);

      for (var j = this.items.length; j--;){
        this.items[j].getChildren('td').each(fixTdHeight);
      }
    },
    unboxify: function(){
      var els = this.el.getElements('.items,.items tr,.items td,.items th,.items tbody,.items thead,.items .tfoot');
      for (var i=els.length; i--;){
        els[i].setProperty('style', null);
      }
      console.log(els);
    },

    _getTarget: function(target){
      if (this.items.contains(target) || target == this.tfootTr) {
        return target
      } else {
        return this._getTarget(target.parentNode)
      }
    },

    handleDragstart: function(e){
      var target = this._getTarget(e.target);

      this.dragging_item = target;
      this.dragging_next = target.getNext(this.itemsSelector);
      this.dragging_prev = target.getPrevious(this.itemsSelector);
      this.dragging_item.deny_drop = true;
      if(this.dragging_next) this.dragging_next.deny_drop = true;
      if(this.dragging_prev) this.dragging_prev.deny_drop = true;

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', target);
      e.dataTransfer.setDragImage(target, 30, 10);
    },

    handleDragenter: function(e){
      if(this.dragging_item) {
        var target = this._getTarget(e.target);
        this.itemsBlock.getElements('.inject-before').removeClass('inject-before');
        this.itemsBlock.getElements('.inject-after').removeClass('inject-after');

        if (target == this.tfootTr){
          if (this.last != this.dragging_item) {
            this.last.addClass('inject-after');
            this.inject_pos = 'after';
          }
        } else if (!target.deny_drop || target == this.dragging_prev){
          this.inject = target;
          this.inject_pos = 'before';
          target.addClass('inject-before');
        } else {
          this.inject_pos = null;
          this.inject = null;
        }
      }
    },

    handleDragend: function(){
      if(this.dragging_item) {
        if(this.inject) { //required for dragging last item outside of block
          this.dragging_item.inject(this.inject, this.inject_pos);
        }

        this.dragging_item.deny_drop = false;
        if(this.dragging_next) this.dragging_next.deny_drop = false;
        if(this.dragging_prev) this.dragging_prev.deny_drop = false;

        this.dragging_item = null;
        this.dragging_next = null;
        this.dragging_prev = null;

        if (this.inject && this.inject.hasClass('inject-before')) {this.inject.removeClass('inject-before');}
        if (this.inject && this.inject.hasClass('inject-after')) {this.inject.removeClass('inject-after');}
        this.inject_pos = null;
        if(this.inject) {
          this.inject = null;
          this.fireEvent('change');
        }
      }
    },

    handleChange: function(){
      var items = this.itemsBlock.getChildren(this.itemsSelector);
      this.last = this.itemsBlock.getFirst(this.itemsSelector+':last-child');
      for (var i=0, l=items.length; i<l; i++){
        if(i%2){
          if(items[i].hasClass('odd')) items[i].removeClass('odd');
          if(!items[i].hasClass('even')) items[i].addClass('even');
        } else {
          if(!items[i].hasClass('odd')) items[i].addClass('odd');
          if(items[i].hasClass('even')) items[i].removeClass('even');
        }
        var inp = items[i].getElement('input[name$=.order]');
        inp.value = i+1;
      };

      this.el.getElements('.submit-list-edit').setStyle('display','block');
    },

    sortUp: function(e){
      e.preventDefault();
      var target = this._getTarget(e.target);
      var offset1 = target.offsetTop;
      var prev = target.getPrevious(this.itemsSelector);
      if(prev) {
        target.inject(prev, 'before');
      }
      this.fireEvent('change');
      scrollAfterSort(target, offset1);
    },

    sortDown: function(e){
      e.preventDefault();
      var target = this._getTarget(e.target);
      var offset1 = target.offsetTop;
      var next = target.getNext(this.itemsSelector);
      if(next) {
        target.inject(next, 'after');
      }
      this.fireEvent('change');
      scrollAfterSort(target, offset1);
    },

    handleSubmit: function(e){
      var url = this.el.get('action');
      new Request.JSON({
        url: url + (url.indexOf('?') == -1? '?': '&') + '__ajax',
        onSuccess: function(result){
          if (result.success){
            this.el.getElements('.submit-list-edit').setStyle('display','none');
          }
          // XXX else?
        }.bind(this)
      }).post(this.el);
    }

  });


  Blocks.register('stream-sortable', function(el){
    if (! el.getParent('.popup')){
      new StreamSortable(el);
    }
  });
})();
