(function(){
  // XXX mootools.drag required
  var StreamSortable = new Class({
    Implements: [Options, Events],

    initialize: function(el){
      this.el = el;
      this.itemsBlock = el.getElement('.items>tbody');
      this.itemsSelector = el.dataset.selector;
      this.items = this.itemsBlock.getChildren(this.itemsSelector);

      if(this.items.length > 1) {
        this.items.each(function(el){

          el.setProperty('draggable', 'true');
          el.setProperty('dropzone', 'true');
          el.addEvent('dragstart', this.handleDragstart.bind(this));
          el.addEvent('dragenter', this.handleDragenter.bind(this));
          el.addEvent('dragleave', this.handleDragleave.bind(this));
          el.addEvent('dragover', this.handleDragover.bind(this));
          el.addEvent('dragend', this.handleDragend.bind(this));

          if(!el.getNext(this.itemsSelector)) {
            this.last = el;
          }

          var arr1 = new Element('a', {'class': 'sort-btn sort-up', 'html': '&uarr;'});
          arr1.addEventListener('click', this.sortUp.bind(this), false);

          var arr2 = new Element('a', {'class': 'sort-btn sort-down', 'html': '&darr;'});
          arr2.addEventListener('click', this.sortDown.bind(this), false);

          el.getElement('td.list-edit-item').adopt(arr1, arr2);
        }, this);

        //hack to inject dragable elements on last place
        //document.body.setProperty('dropzone', 'true');
        //document.body.addEventListener('dragover', function(e){e.preventDefault()}, false);
        //document.body.addEventListener('drop', this.handleDrop.bind(this), false);

        this.addEvent('change', this.handleChange);
      }

      this.el.getElements('.submit-list-edit').addEvent('click', this.handleSubmit.bind(this));
    },

    _getTarget: function(target){
      if (this.items.contains(target) || target == null) {
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
      // **HATRED** Chrome is new Internet Explorer 6
      if(!e.dataTransfer.addElement) {
        target.setStyle('display', 'block');
      }
      //**HATRED**
      e.dataTransfer.setDragImage(target, 30, 10);
    },

    handleDragenter: function(e){
      if(this.dragging_item) {
        var target = this._getTarget(e.target);
        if (!target.deny_drop || target == this.dragging_prev){
          this.inject = target;
          this.inject_pos = 'before';
          target.addClass('inject-before');
        } else {
          if (this.inject && this.inject.hasClass('inject-before')) {this.inject.removeClass('inject-before');}
          if (this.inject && this.inject.hasClass('inject-after')) {this.inject.removeClass('inject-after');}
          this.inject_pos = null;
          this.inject = null;
        }
      }
    },

    handleDragleave: function(e){
      if(this.dragging_item) {
        var target = this._getTarget(e.target);

        if (target.hasClass('inject-before')) {target.removeClass('inject-before');}

        //inject element on last place when you drag it out of last element if you are dragging  not last element
        if (this.last != this.dragging_item) {
          this.last.addClass('inject-after');
          this.inject_pos = 'after';
        }
      }
    },

    handleDragover: function(e){
      if(this.dragging_item) {
        e.preventDefault();

        if(this.last.hasClass('inject-after')) {
          this.last.removeClass('inject-after');
          this.inject_pos = 'before';
        }

        return false
      }
    },

    handleDrop: function(e){
      if(this.dragging_item) {
        if (e.stopPropagation) {
          e.stopPropagation();
        }
        if(this.inject) { //required for dragging last item outside of block
          this.dragging_item.inject(this.inject, this.inject_pos);
        }
        return false;
      }
    },

    handleDragend: function(){
      if(this.dragging_item) {
        if(this.dragging_item.getStyle('display') == 'block') {
          this.dragging_item.setStyle('display', 'table-row');
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
      var prev = target.getPrevious(this.itemsSelector);
      if(prev) {
        target.inject(prev, 'before');
      }
      this.fireEvent('change');
    },

    sortDown: function(e){
      e.preventDefault();
      var target = this._getTarget(e.target);
      var next = target.getNext(this.itemsSelector);
      if(next) {
        target.inject(next, 'after');
      }
      this.fireEvent('change');
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
      }).post(this.el); // XXX Post to IFRAME!
    }

  });


  Blocks.register('stream-sortable', function(el){
    new StreamSortable(el);
  });
})();
